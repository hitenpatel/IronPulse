import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { telemetryRouter } from "../src/routers/telemetry";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";

// Real Postgres — WorkoutEfficiencyEvent has no relation to User, so it
// doesn't cascade-delete via the shared cleanupTestData() helper. Each test
// tracks the sessionIds it creates and deletes exactly those rows, per the
// "clean up rows you create" rule for this shared test database.
const db = new PrismaClient();
const createCaller = createCallerFactory(telemetryRouter);
const testUser = createTestUser({ email: "efficiency-telemetry@test.com" });

const createdSessionIds = new Set<string>();

function trackedSessionId(): string {
  const id = crypto.randomUUID();
  createdSessionIds.add(id);
  return id;
}

function caller() {
  return createCaller(createTRPCContext({ db, session: { user: testUser } }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

afterEach(async () => {
  if (createdSessionIds.size > 0) {
    await db.workoutEfficiencyEvent.deleteMany({
      where: { sessionId: { in: [...createdSessionIds] } },
    });
    createdSessionIds.clear();
  }
});

describe("telemetry.recordWorkoutEfficiencyEvent", () => {
  it("persists a valid first-completed-set event", async () => {
    const sessionId = trackedSessionId();

    const result = await caller().recordWorkoutEfficiencyEvent({
      sessionId,
      isFirstCompletedSet: true,
      interactionCount: 5,
      msSinceSessionStart: 42_000,
      isNewAthlete: true,
    });

    expect(result).toEqual({ ok: true });

    const rows = await db.workoutEfficiencyEvent.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sessionId,
      isFirstCompletedSet: true,
      interactionCount: 5,
      msSinceSessionStart: 42_000,
      isNewAthlete: true,
    });
  });

  it("persists a subsequent completed-set event with nulled timing/cohort fields", async () => {
    const sessionId = trackedSessionId();

    await caller().recordWorkoutEfficiencyEvent({
      sessionId,
      isFirstCompletedSet: false,
      interactionCount: 2,
      msSinceSessionStart: null,
      isNewAthlete: null,
    });

    const rows = await db.workoutEfficiencyEvent.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      isFirstCompletedSet: false,
      interactionCount: 2,
      msSinceSessionStart: null,
      isNewAthlete: null,
    });
  });

  it("never persists a userId — the row has no such column to smuggle one into", async () => {
    const sessionId = trackedSessionId();
    await caller().recordWorkoutEfficiencyEvent({
      sessionId,
      isFirstCompletedSet: true,
      interactionCount: 1,
      msSinceSessionStart: 1_000,
      isNewAthlete: null,
    });

    const row = await db.workoutEfficiencyEvent.findFirstOrThrow({ where: { sessionId } });
    expect(row).not.toHaveProperty("userId");
  });

  it("rejects a payload carrying a smuggled weight field before touching the DB", async () => {
    const sessionId = trackedSessionId();
    await expect(
      caller().recordWorkoutEfficiencyEvent({
        sessionId,
        isFirstCompletedSet: true,
        interactionCount: 1,
        msSinceSessionStart: 1_000,
        isNewAthlete: null,
        // @ts-expect-error — deliberately smuggling a health field
        weightKg: 100,
      }),
    ).rejects.toThrow();

    const rows = await db.workoutEfficiencyEvent.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(0);
  });

  it("requires authentication", async () => {
    const anonCaller = createCaller(createTRPCContext({ db, session: null }));
    await expect(
      anonCaller.recordWorkoutEfficiencyEvent({
        sessionId: crypto.randomUUID(),
        isFirstCompletedSet: true,
        interactionCount: 1,
        msSinceSessionStart: 1_000,
        isNewAthlete: null,
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("telemetry.workoutEfficiencyReport", () => {
  it("splits before/after the release cutoff and reports medians", async () => {
    const releaseAt = new Date("2026-08-15T00:00:00Z");

    // Two "before" first-set events and one "after" first-set event, all
    // tagged with a cohort flag so the split is expected to appear.
    const beforeSessionA = trackedSessionId();
    const beforeSessionB = trackedSessionId();
    const afterSession = trackedSessionId();

    await db.workoutEfficiencyEvent.create({
      data: {
        sessionId: beforeSessionA,
        isFirstCompletedSet: true,
        interactionCount: 3,
        msSinceSessionStart: 10_000,
        isNewAthlete: true,
        createdAt: new Date("2026-08-10T00:00:00Z"),
      },
    });
    await db.workoutEfficiencyEvent.create({
      data: {
        sessionId: beforeSessionB,
        isFirstCompletedSet: true,
        interactionCount: 5,
        msSinceSessionStart: 20_000,
        isNewAthlete: false,
        createdAt: new Date("2026-08-11T00:00:00Z"),
      },
    });
    await db.workoutEfficiencyEvent.create({
      data: {
        sessionId: afterSession,
        isFirstCompletedSet: true,
        interactionCount: 2,
        msSinceSessionStart: 5_000,
        isNewAthlete: true,
        createdAt: new Date("2026-08-20T00:00:00Z"),
      },
    });

    const report = await caller().workoutEfficiencyReport({ releaseAt });

    expect(report.before.overall.sampleSize).toBe(2);
    expect(report.after.overall.sampleSize).toBe(1);
    expect(report.after.overall.medianMsToFirstCompletedSet).toBe(5_000);
    // Cohort data is present (isNewAthlete set on every seeded row), so the
    // split must be populated rather than null.
    expect(report.before.newAthletes).not.toBeNull();
    expect(report.before.returningAthletes).not.toBeNull();
  });

  it("requires authentication", async () => {
    const anonCaller = createCaller(createTRPCContext({ db, session: null }));
    await expect(
      anonCaller.workoutEfficiencyReport({ releaseAt: new Date() }),
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
