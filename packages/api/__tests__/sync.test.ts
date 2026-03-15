import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { syncRouter } from "../src/routers/sync";

const db = new PrismaClient();
const createCaller = createCallerFactory(syncRouter);

function syncCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "sync@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("sync.getToken", () => {
  it("returns a token and endpoint for authenticated users", async () => {
    const caller = syncCaller({ user: testUser });
    const result = await caller.getToken();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.endpoint).toBeDefined();
  });

  it("throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = syncCaller(null);
    await expect(caller.getToken()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("sync.applyChange", () => {
  it("creates a new workout row", async () => {
    const caller = syncCaller({ user: testUser });
    const id = crypto.randomUUID();
    await caller.applyChange({
      table: "workouts",
      record: {
        id,
        user_id: testUser.id,
        name: "Test Workout",
        started_at: new Date().toISOString(),
      },
    });
    const workout = await db.workout.findUnique({ where: { id } });
    expect(workout).not.toBeNull();
    expect(workout!.name).toBe("Test Workout");
    expect(workout!.userId).toBe(testUser.id);
  });

  it("upserts an existing workout row", async () => {
    const caller = syncCaller({ user: testUser });
    const id = crypto.randomUUID();
    await caller.applyChange({
      table: "workouts",
      record: { id, user_id: testUser.id, name: "Original", started_at: new Date().toISOString() },
    });
    await caller.applyChange({
      table: "workouts",
      record: { id, user_id: testUser.id, name: "Updated", started_at: new Date().toISOString() },
    });
    const workout = await db.workout.findUnique({ where: { id } });
    expect(workout!.name).toBe("Updated");
  });

  it("rejects writes to another user's data", async () => {
    const otherUser = createTestUser({ id: crypto.randomUUID(), email: "other@test.com" });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });
    const caller = syncCaller({ user: testUser });
    await expect(
      caller.applyChange({
        table: "workouts",
        record: { id: crypto.randomUUID(), user_id: otherUser.id, name: "Hijack", started_at: new Date().toISOString() },
      })
    ).rejects.toThrow();
  });

  it("rejects invalid table names", async () => {
    const caller = syncCaller({ user: testUser });
    await expect(
      caller.applyChange({ table: "users" as any, record: { id: crypto.randomUUID() } })
    ).rejects.toThrow();
  });
});

describe("sync.update", () => {
  it("partially updates a workout row", async () => {
    const caller = syncCaller({ user: testUser });
    const id = crypto.randomUUID();
    await db.workout.create({ data: { id, userId: testUser.id, name: "Before", startedAt: new Date() } });
    await caller.update({ table: "workouts", id, data: { name: "After" } });
    const workout = await db.workout.findUnique({ where: { id } });
    expect(workout!.name).toBe("After");
  });
});

describe("sync.delete", () => {
  it("deletes a workout row", async () => {
    const caller = syncCaller({ user: testUser });
    const id = crypto.randomUUID();
    await db.workout.create({ data: { id, userId: testUser.id, name: "To Delete", startedAt: new Date() } });
    await caller.delete({ table: "workouts", id });
    const workout = await db.workout.findUnique({ where: { id } });
    expect(workout).toBeNull();
  });

  it("rejects deleting another user's data", async () => {
    const otherUser = createTestUser({ id: crypto.randomUUID(), email: "other2@test.com" });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });
    const id = crypto.randomUUID();
    await db.workout.create({ data: { id, userId: otherUser.id, name: "Not Yours", startedAt: new Date() } });
    const caller = syncCaller({ user: testUser });
    await expect(caller.delete({ table: "workouts", id })).rejects.toThrow();
  });
});
