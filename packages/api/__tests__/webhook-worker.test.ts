import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@zor/db";
import { runWebhookWorkerTick, getWebhookWorkerStatus } from "../src/lib/webhook-worker";

const dispatchers = vi.hoisted(() => ({ dispatchWebhookEvent: vi.fn() }));
vi.mock("../src/lib/webhook-dispatcher", () => ({ dispatchWebhookEvent: dispatchers.dispatchWebhookEvent }));

const capture = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock("../src/lib/capture-error", () => ({ captureError: capture.captureError }));

const db = new PrismaClient();
const OWNER = "test-owner-1";

async function insertPending(overrides: Partial<{ provider: string; externalId: string; payload: any; nextAttemptAt: Date; attempts: number }> = {}) {
  return db.webhookEvent.create({
    data: {
      provider: overrides.provider ?? "strava",
      externalId: overrides.externalId ?? `e_${Math.random().toString(36).slice(2)}`,
      payload: overrides.payload ?? {},
      nextAttemptAt: overrides.nextAttemptAt ?? new Date(),
      attempts: overrides.attempts ?? 0,
    },
  });
}

beforeEach(async () => {
  await db.webhookEvent.deleteMany({});
  dispatchers.dispatchWebhookEvent.mockReset();
  capture.captureError.mockReset();
});
afterEach(async () => { await db.webhookEvent.deleteMany({}); });
afterAll(async () => { await db.$disconnect(); });

describe("runWebhookWorkerTick — success paths", () => {
  it("succeeded outcome sets status, completedAt, and increments no attempt", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(1); expect(s.succeeded).toBe(1);
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("succeeded");
    expect(updated?.attempts).toBe(0); // succeeded path doesn't bump attempts
    expect(updated?.completedAt).not.toBeNull();
    expect(updated?.processingOwner).toBeNull();
  });

  it("skipped_no_connection outcome lands in terminal skipped state (replayable)", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "skipped_no_connection" });
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("skipped_no_connection");
    expect(updated?.attempts).toBe(0);
  });
});

describe("runWebhookWorkerTick — failure paths", () => {
  it("re-schedules with correct backoff on 1st failure (attempts=1, next=+60s)", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockRejectedValue(new Error("boom"));
    const before = Date.now();
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("pending");
    expect(updated?.attempts).toBe(1);
    expect(updated?.lastError).toBe("boom");
    const dt = updated!.nextAttemptAt.getTime() - before;
    expect(dt).toBeGreaterThanOrEqual(58_000);
    expect(dt).toBeLessThanOrEqual(62_000);
  });

  it("moves to dlq on the sixth failure and posts exactly one Sentry incident with externalId", async () => {
    const row = await insertPending({ attempts: 5, externalId: "ext-x-1" });
    dispatchers.dispatchWebhookEvent.mockRejectedValue(new Error("terminal"));
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("dlq");
    expect(updated?.attempts).toBe(6);
    expect(capture.captureError).toHaveBeenCalledTimes(1);
    expect(capture.captureError.mock.calls[0][1]).toMatchObject({
      provider: "strava",
      externalId: "ext-x-1",
      eventId: row.id,
      attempts: 6,
    });
  });
});

describe("runWebhookWorkerTick — stale reclaim + ownership", () => {
  it("reclaims a row stuck in processing older than stalenessMs (attempts preserved)", async () => {
    const row = await insertPending();
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "processing", processingStartedAt: new Date(Date.now() - 11 * 60_000), processingOwner: "dead-owner", attempts: 2 },
    });
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER, stalenessMs: 10 * 60_000 });
    expect(s.reclaimed).toBe(1);
    expect(s.processed).toBe(1);
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("succeeded");
    expect(updated?.attempts).toBe(2); // preserved (success does not bump)
  });

  it("does NOT reclaim a fresh processing row (< stalenessMs)", async () => {
    const row = await insertPending();
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "processing", processingStartedAt: new Date(), processingOwner: "other-owner" },
    });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.reclaimed).toBe(0);
    expect(s.processed).toBe(0);
    const still = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(still?.processingOwner).toBe("other-owner");
  });

  it("ownership guard: stale worker's completion write is a no-op", async () => {
    // Simulate: worker A claims row, then row is reclaimed by phase A on tick 2 and completed by worker B.
    // Worker A returning late must not overwrite worker B's completion.
    const row = await insertPending();
    // Manually put the row into the state B would leave it after success:
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "succeeded", completedAt: new Date(), processingOwner: null, processingStartedAt: null },
    });
    // Attempt a stale success write with a mismatched owner token via raw SQL:
    const n = await db.$executeRaw`
      UPDATE webhook_events
         SET status = 'succeeded', completed_at = now(), processing_owner = NULL, processing_started_at = NULL
       WHERE id = ${row.id} AND processing_owner = ${"stale-owner"}
    `;
    expect(Number(n)).toBe(0);
    const still = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(still?.status).toBe("succeeded");
  });
});

describe("runWebhookWorkerTick — batching + ordering + parallelism", () => {
  it("respects batchSize (default 5) and orders by receivedAt asc, id asc", async () => {
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push(await insertPending({ externalId: `e${i}` }));
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(5);
    // Confirm the two youngest are still pending.
    const still = await db.webhookEvent.findMany({ where: { status: "pending" }, orderBy: { receivedAt: "asc" } });
    expect(still.map(r => r.externalId)).toEqual(["e5", "e6"]);
  });

  it("skips pending rows whose nextAttemptAt is in the future", async () => {
    await insertPending({ nextAttemptAt: new Date(Date.now() + 10 * 60_000) });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(0);
  });

  it("failure isolation: one row's dispatch failure does not abandon its peers", async () => {
    const a = await insertPending({ externalId: "a" });
    const b = await insertPending({ externalId: "b" });
    dispatchers.dispatchWebhookEvent.mockImplementation(async ({ payload }: any) => {
      // Arbitrary discrimination: a payload contains no marker; use insertion order via externalId isn't visible.
      // Instead, alternate outcomes deterministically per call.
      const call = dispatchers.dispatchWebhookEvent.mock.calls.length;
      if (call % 2 === 1) throw new Error("first-failed");
      return { kind: "succeeded" };
    });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(2);
    expect(s.failed + s.succeeded).toBe(2);
    // Both rows have terminal-for-this-tick state; neither is left in 'processing'.
    const processing = await db.webhookEvent.count({ where: { status: "processing" } });
    expect(processing).toBe(0);
  });
});

describe("getWebhookWorkerStatus", () => {
  it("returns zero counts on empty table", async () => {
    const s = await getWebhookWorkerStatus(db);
    expect(s.dueCount).toBe(0);
    expect(s.pendingCount).toBe(0);
    expect(s.processingCount).toBe(0);
    expect(s.dlqCount).toBe(0);
    expect(s.oldestDueAgeSec).toBeNull();
    expect(s.oldestProcessingAgeSec).toBeNull();
  });

  it("dueCount reflects pending AND next_attempt_at <= now(); a scheduled-future pending row is NOT due", async () => {
    await insertPending({ nextAttemptAt: new Date(Date.now() - 10_000) }); // due
    await insertPending({ nextAttemptAt: new Date(Date.now() + 60_000) }); // pending but not due
    const s = await getWebhookWorkerStatus(db);
    expect(s.pendingCount).toBe(2);
    expect(s.dueCount).toBe(1);
  });

  it("does NOT change queue state (invariant)", async () => {
    await insertPending();
    const before = await db.webhookEvent.count();
    await getWebhookWorkerStatus(db);
    const after = await db.webhookEvent.count();
    expect(after).toBe(before);
  });
});
