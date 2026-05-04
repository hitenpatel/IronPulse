import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { notificationRouter } from "../src/routers/notification";
import type { PrismaClient } from "@ironpulse/db";

const createCaller = createCallerFactory(notificationRouter);

function makeDb(
  overrides: Partial<PrismaClient["notification"]> = {}
) {
  return {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    },
  } as unknown as PrismaClient;
}

function notificationCaller(
  db: PrismaClient,
  session: { user: ReturnType<typeof createTestUser> } | null
) {
  return createCaller(createTRPCContext({ db, session }));
}

const testUser = createTestUser({ email: "notification@test.com" });

function makeNotif(overrides: Partial<{
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    userId: testUser.id,
    type: "follow",
    title: "New follower",
    body: null,
    linkPath: null,
    data: null,
    readAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------- list ----------

describe("notification.list", () => {
  it("returns notifications with no nextCursor when within limit", async () => {
    const notifs = [makeNotif({ title: "B" }), makeNotif({ title: "A" })];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(notifs) });

    const result = await notificationCaller(db, { user: testUser }).list({ limit: 10 });

    expect(result.notifications).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testUser.id } })
    );
  });

  it("returns nextCursor when more items exist beyond limit", async () => {
    const notifs = [
      makeNotif({ id: "n1", title: "A" }),
      makeNotif({ id: "n2", title: "B" }),
      makeNotif({ id: "n3", title: "C" }),
    ];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(notifs) });

    const result = await notificationCaller(db, { user: testUser }).list({ limit: 2 });

    expect(result.notifications).toHaveLength(2);
    expect(result.nextCursor).toBe("n2");
  });

  it("passes unreadOnly filter when true", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await notificationCaller(db, { user: testUser }).list({ limit: 10, unreadOnly: true });

    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testUser.id, readAt: null } })
    );
  });

  it("does not include readAt filter when unreadOnly is false", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await notificationCaller(db, { user: testUser }).list({ limit: 10, unreadOnly: false });

    const call = vi.mocked(db.notification.findMany).mock.calls[0]![0] as any;
    expect(call.where).not.toHaveProperty("readAt");
  });

  it("passes cursor for pagination", async () => {
    const cursorId = crypto.randomUUID();
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await notificationCaller(db, { user: testUser }).list({ limit: 10, cursor: cursorId });

    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: cursorId }, skip: 1 })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(notificationCaller(db, null).list({ limit: 10 })).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- unreadCount ----------

describe("notification.unreadCount", () => {
  it("returns the count of unread notifications", async () => {
    const db = makeDb({ count: vi.fn().mockResolvedValue(5) });

    const result = await notificationCaller(db, { user: testUser }).unreadCount();

    expect(result.count).toBe(5);
    expect(db.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testUser.id, readAt: null } })
    );
  });

  it("returns zero when there are no unread notifications", async () => {
    const db = makeDb({ count: vi.fn().mockResolvedValue(0) });

    const result = await notificationCaller(db, { user: testUser }).unreadCount();

    expect(result.count).toBe(0);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(notificationCaller(db, null).unreadCount()).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- markRead ----------

describe("notification.markRead", () => {
  it("marks a notification as read and returns success", async () => {
    const notif = makeNotif();
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue({ id: notif.id }),
      update: vi.fn().mockResolvedValue(notif),
    });

    const result = await notificationCaller(db, { user: testUser }).markRead({ id: notif.id });

    expect(result.success).toBe(true);
    expect(db.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: notif.id } })
    );
  });

  it("throws NOT_FOUND when the notification does not exist", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });

    await expect(
      notificationCaller(db, { user: testUser }).markRead({ id: crypto.randomUUID() })
    ).rejects.toThrow("Notification not found");
  });

  it("scopes the lookup to the current user", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });
    const id = crypto.randomUUID();

    await notificationCaller(db, { user: testUser }).markRead({ id }).catch(() => {});

    expect(db.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, userId: testUser.id } })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      notificationCaller(db, null).markRead({ id: crypto.randomUUID() })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- markAllRead ----------

describe("notification.markAllRead", () => {
  it("marks all unread notifications as read", async () => {
    const db = makeDb({ updateMany: vi.fn().mockResolvedValue({ count: 3 }) });

    const result = await notificationCaller(db, { user: testUser }).markAllRead();

    expect(result.markedRead).toBe(3);
    expect(db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testUser.id, readAt: null } })
    );
  });

  it("returns zero when there are no unread notifications", async () => {
    const db = makeDb({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });

    const result = await notificationCaller(db, { user: testUser }).markAllRead();

    expect(result.markedRead).toBe(0);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(notificationCaller(db, null).markAllRead()).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- delete ----------

describe("notification.delete", () => {
  it("deletes a notification and returns success", async () => {
    const notif = makeNotif();
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue({ id: notif.id }),
      delete: vi.fn().mockResolvedValue(notif),
    });

    const result = await notificationCaller(db, { user: testUser }).delete({ id: notif.id });

    expect(result.success).toBe(true);
    expect(db.notification.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: notif.id } })
    );
  });

  it("throws NOT_FOUND when the notification does not exist", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });

    await expect(
      notificationCaller(db, { user: testUser }).delete({ id: crypto.randomUUID() })
    ).rejects.toThrow("Notification not found");
  });

  it("scopes the lookup to the current user before deleting", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });
    const id = crypto.randomUUID();

    await notificationCaller(db, { user: testUser }).delete({ id }).catch(() => {});

    expect(db.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, userId: testUser.id } })
    );
  });

  it("does not call db.delete when notification is not found", async () => {
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });

    await notificationCaller(db, { user: testUser }).delete({ id: crypto.randomUUID() }).catch(() => {});

    expect(db.notification.delete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      notificationCaller(db, null).delete({ id: crypto.randomUUID() })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
