import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { analyticsRouter } from "../src/routers/analytics";

const db = new PrismaClient();
const createCaller = createCallerFactory(analyticsRouter);

function analyticsCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let testExerciseId: string;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "analytics@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
  const ex = await db.exercise.create({
    data: {
      name: "Analytics Bench Press",
      category: "compound",
      primaryMuscles: ["chest"],
      isCustom: false,
    },
  });
  testExerciseId = ex.id;
});

describe("analytics.weeklyVolume", () => {
  it("returns volume grouped by week and muscle group", async () => {
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    // Workout this week
    await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: thisWeek,
        completedAt: thisWeek,
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 60, reps: 10, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    // Workout last week
    await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: lastWeek,
        completedAt: lastWeek,
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 60, reps: 8, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.weeklyVolume({ weeks: 4 });

    // Should have entries for two different weeks
    const chestEntries = result.data.filter((d: any) => d.muscleGroup === "chest");
    expect(chestEntries.length).toBe(2);

    // Each entry should have a week and correct volume
    const volumes = chestEntries.map((e: any) => e.totalVolume).sort();
    expect(volumes).toEqual([480, 600]); // 60*8=480, 60*10=600
  });

  it("rejects unauthenticated calls", async () => {
    const caller = analyticsCaller();
    await expect(caller.weeklyVolume({})).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("analytics.personalRecords", () => {
  it("returns PR history for an exercise", async () => {
    // Create PR records directly
    await db.personalRecord.createMany({
      data: [
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "1rm",
          value: 100,
          achievedAt: new Date("2026-01-15"),
        },
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "1rm",
          value: 105,
          achievedAt: new Date("2026-02-15"),
        },
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "volume",
          value: 600,
          achievedAt: new Date("2026-01-15"),
        },
      ],
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.personalRecords({ exerciseId: testExerciseId });

    expect(result.data.length).toBe(3);
    // Should be ordered by achievedAt
    expect(new Date(result.data[0]!.achievedAt).getTime())
      .toBeLessThanOrEqual(new Date(result.data[1]!.achievedAt).getTime());
  });
});

describe("analytics.bodyWeightTrend", () => {
  it("returns body weight data points over time", async () => {
    const now = new Date();
    await db.bodyMetric.createMany({
      data: [
        {
          userId: testUser.id,
          date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          weightKg: 81,
        },
        {
          userId: testUser.id,
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          weightKg: 80,
        },
      ],
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.bodyWeightTrend({ days: 30 });

    expect(result.data.length).toBe(2);
    expect(Number(result.data[0]!.weightKg)).toBe(81);
  });

  it("returns empty for no data", async () => {
    const caller = analyticsCaller({ user: testUser });
    const result = await caller.bodyWeightTrend({ days: 30 });
    expect(result.data.length).toBe(0);
  });
});
