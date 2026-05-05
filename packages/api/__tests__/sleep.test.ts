import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { sleepRouter } from "../src/routers/sleep";
import type { PrismaClient } from "@ironpulse/db";

const createCaller = createCallerFactory(sleepRouter);

function makeDb(
  overrides: Partial<PrismaClient["sleepLog"]> = {}
) {
  return {
    sleepLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    },
  } as unknown as PrismaClient;
}

function sleepCaller(
  db: PrismaClient,
  session: { user: ReturnType<typeof createTestUser> } | null
) {
  return createCaller(createTRPCContext({ db, session }));
}

const testUser = createTestUser({ email: "sleep@test.com" });

function makeSleepLog(overrides: Partial<{
  id: string;
  date: Date;
  bedtime: Date | null;
  wakeTime: Date | null;
  durationMins: number | null;
  quality: string | null;
  source: string | null;
  notes: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    date: new Date("2026-03-01"),
    bedtime: null,
    wakeTime: null,
    durationMins: null,
    quality: null,
    source: null,
    notes: null,
    createdAt: new Date("2026-03-01T08:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- logSleep ----------

describe("sleep.logSleep", () => {
  it("creates a sleep log with required date only", async () => {
    const log = makeSleepLog();
    const db = makeDb({ create: vi.fn().mockResolvedValue(log) });

    const result = await sleepCaller(db, { user: testUser }).logSleep({
      date: new Date("2026-03-01"),
    });

    expect(result.log).toEqual(log);
    expect(db.sleepLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: testUser.id, date: new Date("2026-03-01") }),
      })
    );
  });

  it("creates a sleep log with all optional fields", async () => {
    const bedtime = new Date("2026-02-28T23:00:00Z");
    const wakeTime = new Date("2026-03-01T07:00:00Z");
    const log = makeSleepLog({ durationMins: 480, quality: "good", source: "manual", notes: "Slept well", bedtime, wakeTime });
    const db = makeDb({ create: vi.fn().mockResolvedValue(log) });

    const result = await sleepCaller(db, { user: testUser }).logSleep({
      date: new Date("2026-03-01"),
      bedtime,
      wakeTime,
      durationMins: 480,
      quality: "good",
      source: "manual",
      notes: "Slept well",
    });

    expect(result.log.durationMins).toBe(480);
    expect(result.log.quality).toBe("good");
    expect(result.log.source).toBe("manual");
    expect(result.log.notes).toBe("Slept well");
  });

  it("spreads optional fields only when defined", async () => {
    const log = makeSleepLog({ durationMins: 420 });
    const db = makeDb({ create: vi.fn().mockResolvedValue(log) });

    await sleepCaller(db, { user: testUser }).logSleep({
      date: new Date("2026-03-01"),
      durationMins: 420,
    });

    const callData = vi.mocked(db.sleepLog.create).mock.calls[0]![0].data as any;
    expect(callData).toHaveProperty("durationMins", 420);
    expect(callData).not.toHaveProperty("bedtime");
    expect(callData).not.toHaveProperty("wakeTime");
    expect(callData).not.toHaveProperty("quality");
  });

  it("passes stages when provided", async () => {
    const stages = { lightMins: 180, deepMins: 90, remMins: 120, awakeMins: 60 };
    const log = makeSleepLog({ durationMins: 450 });
    const db = makeDb({ create: vi.fn().mockResolvedValue(log) });

    await sleepCaller(db, { user: testUser }).logSleep({
      date: new Date("2026-03-01"),
      durationMins: 450,
      stages,
    });

    const callData = vi.mocked(db.sleepLog.create).mock.calls[0]![0].data as any;
    expect(callData.stages).toEqual(stages);
  });

  it("includes the user id from session", async () => {
    const log = makeSleepLog();
    const db = makeDb({ create: vi.fn().mockResolvedValue(log) });

    await sleepCaller(db, { user: testUser }).logSleep({ date: new Date("2026-03-01") });

    expect(db.sleepLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: testUser.id }) })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      sleepCaller(db, null).logSleep({ date: new Date("2026-03-01") })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- listSleep ----------

describe("sleep.listSleep", () => {
  it("returns sleep logs from db", async () => {
    const logs = [makeSleepLog({ durationMins: 480 }), makeSleepLog({ durationMins: 420 })];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(logs) });

    const result = await sleepCaller(db, { user: testUser }).listSleep({ days: 7 });

    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]!.durationMins).toBe(480);
  });

  it("scopes query to the authenticated user", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await sleepCaller(db, { user: testUser }).listSleep({ days: 7 });

    expect(db.sleepLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: testUser.id }) })
    );
  });

  it("queries by date >= computed cutoff", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    const before = new Date();
    before.setDate(before.getDate() - 7);
    before.setHours(0, 0, 0, 0);

    await sleepCaller(db, { user: testUser }).listSleep({ days: 7 });

    const callWhere = vi.mocked(db.sleepLog.findMany).mock.calls[0]![0]!.where as any;
    const gte: Date = callWhere.date.gte;
    expect(gte.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(gte.getHours()).toBe(0);
    expect(gte.getMinutes()).toBe(0);
  });

  it("returns empty array when no logs match", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    const result = await sleepCaller(db, { user: testUser }).listSleep({ days: 7 });

    expect(result.logs).toEqual([]);
  });

  it("orders results by date descending", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await sleepCaller(db, { user: testUser }).listSleep({ days: 30 });

    expect(db.sleepLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: "desc" } })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      sleepCaller(db, null).listSleep({ days: 7 })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- deleteSleep ----------

describe("sleep.deleteSleep", () => {
  it("deletes a sleep log and returns success", async () => {
    const log = makeSleepLog();
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue({ id: log.id }),
      delete: vi.fn().mockResolvedValue(log),
    });

    const result = await sleepCaller(db, { user: testUser }).deleteSleep({ id: log.id });

    expect(result.success).toBe(true);
    expect(db.sleepLog.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: log.id } })
    );
  });

  it("throws NOT_FOUND when log does not exist", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });

    await expect(
      sleepCaller(db, { user: testUser }).deleteSleep({ id: crypto.randomUUID() })
    ).rejects.toThrow("Sleep log not found");
  });

  it("scopes the ownership check to the current user", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });
    const id = crypto.randomUUID();

    await sleepCaller(db, { user: testUser }).deleteSleep({ id }).catch(() => {});

    expect(db.sleepLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, userId: testUser.id } })
    );
  });

  it("does not call db.delete when log is not found", async () => {
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });

    await sleepCaller(db, { user: testUser })
      .deleteSleep({ id: crypto.randomUUID() })
      .catch(() => {});

    expect(db.sleepLog.delete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      sleepCaller(db, null).deleteSleep({ id: crypto.randomUUID() })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
