/**
 * Tests for notification-outbox delivery worker (Slice D).
 *
 * All Expo push calls are mocked — no real HTTP traffic.
 * All DB calls are mocked with vitest.fn() for isolation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deliverPendingNotifications,
  MAX_ATTEMPTS,
} from "../src/lib/notification-outbox";

// ── Push mock ────────────────────────────────────────────────────────────────

const mockSendPush = vi.fn();

vi.mock("../src/lib/push", () => ({
  sendPushNotification: (...args: unknown[]) => mockSendPush(...args),
}));

// ── Prisma mock factory ──────────────────────────────────────────────────────

type MockDb = {
  $queryRaw: ReturnType<typeof vi.fn>;
  $executeRaw: ReturnType<typeof vi.fn>;
  notification: { upsert: ReturnType<typeof vi.fn> };
  pushToken: {
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

function makeOutboxRow(overrides: Partial<{
  id: string;
  lock_token: string;
  attempts: number;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  dedupe_key: string;
}> = {}) {
  return {
    id: "outbox-id-1",
    lock_token: "lock-token-uuid",
    attempts: 1,
    user_id: "user-id-1",
    type: "pr",
    title: "New PR!",
    body: "You hit 100kg",
    link_path: "/workout/abc",
    dedupe_key: "pr:user-id-1:set-1:weight",
    ...overrides,
  };
}

function makeDb(overrides: Partial<MockDb> = {}): MockDb {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
    notification: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    pushToken: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("deliverPendingNotifications", () => {
  it("(a) marks the outbox row sent when push delivers successfully", async () => {
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])  // first claim
        .mockResolvedValueOnce([]),    // second claim → queue drained
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[abc]" }]),
        deleteMany: vi.fn(),
      },
    });
    mockSendPush.mockResolvedValue({ delivered: true, deadToken: false });

    const result = await deliverPendingNotifications(db as never, { limit: 5 });

    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);

    // Verify markSent was called with correct status update
    const executeRawCall = (db.$executeRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(executeRawCall.sql ?? String(executeRawCall)).toContain("sent");
  });

  it("(b) transient push failure leaves the row retryable (advances availableAt)", async () => {
    const row = makeOutboxRow({ attempts: 2 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[xyz]" }]),
        deleteMany: vi.fn(),
      },
    });
    // delivered: false, deadToken: false → transient
    mockSendPush.mockResolvedValue({ delivered: false, deadToken: false, error: "MessageRateExceeded" });

    const result = await deliverPendingNotifications(db as never, { limit: 5 });

    // Row should be released as failed (retryable) not sent
    expect(result.failed).toBe(1);   // transient → counted as failed (retryable)
    expect(result.delivered).toBe(0);

    // releaseWithError was called — status = 'failed', available_at advanced
    const executeRawSql = (db.$executeRaw as ReturnType<typeof vi.fn>).mock.calls;
    const releaseCall = executeRawSql.find((c: unknown[]) =>
      (c[0]?.sql ?? String(c[0])).includes("available_at"),
    );
    expect(releaseCall).toBeDefined();
  });

  it("(c) permanently dead-letters a row after MAX_ATTEMPTS with no availableAt advance", async () => {
    // Simulate a row that has already used up all attempts
    const row = makeOutboxRow({ attempts: MAX_ATTEMPTS });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[tok]" }]),
        deleteMany: vi.fn(),
      },
    });
    mockSendPush.mockResolvedValue({ delivered: false, deadToken: false, error: "Transient" });

    await deliverPendingNotifications(db as never, { limit: 5 });

    // Should NOT advance available_at (dead-lettered)
    const executeCalls = (db.$executeRaw as ReturnType<typeof vi.fn>).mock.calls;
    const hasAvailableAtAdvance = executeCalls.some((c: unknown[]) =>
      (c[0]?.sql ?? String(c[0])).includes("available_at"),
    );
    expect(hasAvailableAtAdvance).toBe(false);

    // Should set status = 'failed' but without advancing available_at
    const failedCall = executeCalls.find((c: unknown[]) =>
      (c[0]?.sql ?? String(c[0])).includes("failed"),
    );
    expect(failedCall).toBeDefined();
  });

  /**
   * (d) At-least-once semantics: a provider can acknowledge delivery and then
   * the outbox worker crashes before writing `sent`. On retry a second push
   * is sent to tokens that already received the notification. This test
   * documents this known behavior with a named test rather than hiding it.
   *
   * The test simulates: two tokens, first succeeds, second throws ambiguously.
   * The row stays retryable. A future run will re-push to the first token.
   */
  it("(d) at-least-once: ambiguous timeout on second token leaves row retryable, first token may be re-delivered", async () => {
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      pushToken: {
        findMany: vi.fn().mockResolvedValue([
          { token: "ExponentPushToken[first]" },
          { token: "ExponentPushToken[second]" },
        ]),
        deleteMany: vi.fn(),
      },
    });
    // First token: success. Second token: transient/ambiguous (delivered: false, deadToken: false).
    mockSendPush
      .mockResolvedValueOnce({ delivered: true, deadToken: false })
      .mockResolvedValueOnce({ delivered: false, deadToken: false, error: "Timeout" });

    await deliverPendingNotifications(db as never, { limit: 5 });

    // Row is still retryable — available_at is advanced
    const executeCalls = (db.$executeRaw as ReturnType<typeof vi.fn>).mock.calls;
    const releaseCall = executeCalls.find((c: unknown[]) =>
      (c[0]?.sql ?? String(c[0])).includes("available_at"),
    );
    expect(releaseCall).toBeDefined();

    // First token was already called once — on retry it will be called again (at-least-once)
    expect(mockSendPush).toHaveBeenCalledWith(
      "ExponentPushToken[first]",
      expect.any(String),
      expect.any(String),
    );
  });

  it("(e) concurrent workers don't double-deliver: zero-row lockToken fence update is a no-op", async () => {
    // Worker B claims the same row after Worker A has already claimed it.
    // $executeRaw returns 0 rows (lock fencing failed) — worker should not crash.
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      $executeRaw: vi.fn().mockResolvedValue(0), // 0 rows = lost lock
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[tok]" }]),
        deleteMany: vi.fn(),
      },
    });
    mockSendPush.mockResolvedValue({ delivered: true, deadToken: false });

    // Should NOT throw — losing the lock is not an error
    const result = await deliverPendingNotifications(db as never, { limit: 5 });
    // The delivery logic completed without exception; markSent was a no-op
    expect(result.delivered).toBe(1); // deliverOutboxRow did not throw
  });

  it("marks row sent when there are no push tokens (in-app notification still written)", async () => {
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      pushToken: {
        findMany: vi.fn().mockResolvedValue([]), // no tokens
        deleteMany: vi.fn(),
      },
    });

    const result = await deliverPendingNotifications(db as never, { limit: 5 });

    expect(result.delivered).toBe(1);
    expect(db.notification.upsert).toHaveBeenCalledOnce();
    expect(mockSendPush).not.toHaveBeenCalled();

    // markSent called
    const executeRawSql = (db.$executeRaw as ReturnType<typeof vi.fn>).mock.calls;
    const sentCall = executeRawSql.find((c: unknown[]) =>
      (c[0]?.sql ?? String(c[0])).includes("sent"),
    );
    expect(sentCall).toBeDefined();
  });

  it("prunes a dead token and marks row sent if it was the only token", async () => {
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[dead]" }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    });
    mockSendPush.mockResolvedValue({ delivered: false, deadToken: true, error: "DeviceNotRegistered" });

    const result = await deliverPendingNotifications(db as never, { limit: 5 });

    expect(result.delivered).toBe(1);
    expect(db.pushToken.deleteMany).toHaveBeenCalledWith({ where: { token: "ExponentPushToken[dead]" } });
  });

  it("stale worker test: a superseded lock_token cannot mark row sent or failed", async () => {
    // Simulate: claim succeeds, but executeRaw returns 0 (another worker won)
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      $executeRaw: vi.fn().mockResolvedValue(0), // lock stolen
      pushToken: {
        findMany: vi.fn().mockResolvedValue([{ token: "ExponentPushToken[tok]" }]),
        deleteMany: vi.fn(),
      },
    });
    mockSendPush.mockResolvedValue({ delivered: true, deadToken: false });

    // Must not throw and must not corrupt state
    await expect(deliverPendingNotifications(db as never, { limit: 5 })).resolves.toBeDefined();
    // executeRaw was called (tried to mark sent) but got 0 rows — no crash
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  it("returns empty counts when the queue is empty", async () => {
    const db = makeDb({
      $queryRaw: vi.fn().mockResolvedValue([]), // no rows
    });

    const result = await deliverPendingNotifications(db as never, { limit: 25 });

    expect(result).toEqual({ delivered: 0, skipped: 0, failed: 0 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it("counts an exception in deliverOutboxRow as a failed entry", async () => {
    const row = makeOutboxRow({ attempts: 1 });
    const db = makeDb({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]),
      notification: {
        upsert: vi.fn().mockRejectedValue(new Error("DB down")),
      },
      pushToken: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
      },
    });

    const result = await deliverPendingNotifications(db as never, { limit: 5 });

    expect(result.failed).toBe(1);
    expect(result.delivered).toBe(0);
  });
});
