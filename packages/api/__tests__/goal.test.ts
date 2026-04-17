import { describe, it, expect, vi } from "vitest";
import {
  computeGoalProgress,
  computeProgressPct,
  type GoalProgressInput,
  type ProgressDb,
} from "../src/lib/goal-progress";

function goal(partial: Partial<GoalProgressInput>): GoalProgressInput {
  return {
    userId: "u1",
    type: "body_weight",
    unit: "kg",
    targetValue: 75,
    startValue: 85,
    exerciseId: null,
    createdAt: new Date("2026-01-01"),
    ...partial,
  };
}

function mockDb(opts: Partial<{
  bodyWeight: number;
  prValue: number;
  workoutCount: number;
  cardioMeters: number[];
}>): ProgressDb {
  return {
    bodyMetric: {
      findFirst: vi.fn().mockResolvedValue(
        opts.bodyWeight != null ? { weightKg: opts.bodyWeight } : null,
      ),
    },
    personalRecord: {
      findFirst: vi.fn().mockResolvedValue(
        opts.prValue != null ? { value: opts.prValue } : null,
      ),
    },
    workout: {
      count: vi.fn().mockResolvedValue(opts.workoutCount ?? 0),
    },
    cardioSession: {
      findMany: vi.fn().mockResolvedValue(
        (opts.cardioMeters ?? []).map((m) => ({ distanceMeters: m })),
      ),
    },
  };
}

describe("computeGoalProgress", () => {
  it("returns latest body weight for body_weight goal", async () => {
    const db = mockDb({ bodyWeight: 80 });
    const result = await computeGoalProgress(db, goal({ type: "body_weight" }));
    expect(result).toBe(80);
  });

  it("returns 0 when no body weight recorded", async () => {
    const db = mockDb({});
    const result = await computeGoalProgress(db, goal({ type: "body_weight" }));
    expect(result).toBe(0);
  });

  it("returns best PR value for exercise_pr goal", async () => {
    const db = mockDb({ prValue: 90 });
    const result = await computeGoalProgress(
      db,
      goal({ type: "exercise_pr", exerciseId: "ex1" }),
    );
    expect(result).toBe(90);
  });

  it("returns 0 when exerciseId is missing on exercise_pr", async () => {
    const db = mockDb({ prValue: 90 });
    const result = await computeGoalProgress(db, goal({ type: "exercise_pr" }));
    expect(result).toBe(0);
  });

  it("counts recent workouts for weekly_workouts", async () => {
    const db = mockDb({ workoutCount: 3 });
    const result = await computeGoalProgress(
      db,
      goal({ type: "weekly_workouts", unit: "count" }),
    );
    expect(result).toBe(3);
  });

  it("sums cardio distance and converts to km by default", async () => {
    const db = mockDb({ cardioMeters: [10000, 15000] }); // 25 km
    const result = await computeGoalProgress(
      db,
      goal({ type: "cardio_distance", unit: "km" }),
    );
    expect(result).toBe(25);
  });

  it("converts cardio distance to miles when unit is mi", async () => {
    const db = mockDb({ cardioMeters: [16093.44] }); // exactly 10 miles
    const result = await computeGoalProgress(
      db,
      goal({ type: "cardio_distance", unit: "mi" }),
    );
    expect(result).toBeCloseTo(10, 2);
  });

  it("returns 0 for unknown goal types", async () => {
    const db = mockDb({});
    const result = await computeGoalProgress(db, goal({ type: "unknown" }));
    expect(result).toBe(0);
  });
});

describe("computeProgressPct", () => {
  it("computes increasing progress (target > start)", () => {
    expect(computeProgressPct(50, 100, 0)).toBe(50);
    expect(computeProgressPct(0, 100, 0)).toBe(0);
  });

  it("computes decreasing progress (start > target)", () => {
    // Starting at 85, target 75 → current 80 is halfway
    expect(computeProgressPct(80, 75, 85)).toBe(50);
    expect(computeProgressPct(85, 75, 85)).toBe(0);
    expect(computeProgressPct(75, 75, 85)).toBe(100);
  });

  it("clamps progress to [0, 100]", () => {
    expect(computeProgressPct(150, 100, 0)).toBe(100);
    expect(computeProgressPct(-10, 100, 0)).toBe(0);
    expect(computeProgressPct(70, 75, 85)).toBe(100); // went past target
    expect(computeProgressPct(90, 75, 85)).toBe(0); // went wrong direction
  });

  it("handles null start value as 0", () => {
    expect(computeProgressPct(50, 100, null)).toBe(50);
  });

  it("returns 0 when target is 0 for increasing goal", () => {
    expect(computeProgressPct(0, 0, null)).toBe(0);
  });
});
