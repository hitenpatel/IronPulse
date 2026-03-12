import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { bodyMetricRouter } from "../src/routers/body-metric";

const db = new PrismaClient();
const createCaller = createCallerFactory(bodyMetricRouter);

function bodyMetricCaller(session: { user: any } | null = null) {
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
  testUser = createTestUser({ email: "metric@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("bodyMetric.create", () => {
  it("creates a body metric entry", async () => {
    const caller = bodyMetricCaller({ user: testUser });
    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
      bodyFatPct: 15.2,
    });

    expect(Number(result.metric.weightKg)).toBeCloseTo(80.5);
    expect(Number(result.metric.bodyFatPct)).toBeCloseTo(15.2);
  });

  it("upserts on same userId + date", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
    });

    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.0,
    });

    expect(Number(result.metric.weightKg)).toBeCloseTo(80.0);

    // Should still be only one record
    const count = await db.bodyMetric.count({
      where: { userId: testUser.id },
    });
    expect(count).toBe(1);
  });

  it("preserves untouched fields on upsert", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    // Create with both fields
    await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
      bodyFatPct: 15.2,
    });

    // Upsert with only weightKg
    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 79.0,
    });

    // bodyFatPct should still be intact
    const metric = await db.bodyMetric.findFirst({
      where: { userId: testUser.id },
    });
    expect(Number(metric!.weightKg)).toBeCloseTo(79.0);
    expect(Number(metric!.bodyFatPct)).toBeCloseTo(15.2);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = bodyMetricCaller();
    await expect(
      caller.create({ date: new Date(), weightKg: 80 })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("bodyMetric.list", () => {
  it("returns metrics in date range", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    await caller.create({ date: new Date("2026-01-15"), weightKg: 81 });
    await caller.create({ date: new Date("2026-02-15"), weightKg: 80 });
    await caller.create({ date: new Date("2026-03-15"), weightKg: 79 });

    const result = await caller.list({
      from: new Date("2026-02-01"),
      to: new Date("2026-03-31"),
    });

    expect(result.data.length).toBe(2);
  });

  it("returns empty array for no data in range", async () => {
    const caller = bodyMetricCaller({ user: testUser });
    const result = await caller.list({
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });

    expect(result.data.length).toBe(0);
  });
});
