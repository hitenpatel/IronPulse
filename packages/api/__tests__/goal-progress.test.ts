import { describe, it, expect, vi } from "vitest";
import {
  computeGoalProgress,
  computeProgressPct,
  type ProgressDb,
  type GoalProgressInput,
} from "../src/lib/goal-progress";

function makeDb(overrides: Partial<ProgressDb> = {}): ProgressDb {
  return {
    workout: { count: vi.fn().mockResolvedValue(0) },
    bodyMetric: { findFirst: vi.fn().mockResolvedValue(null) },
    personalRecord: { findFirst: vi.fn().mockResolvedValue(null) },
    cardioSession: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

function makeGoal(overrides: Partial<GoalProgressInput> = {}): GoalProgressInput {
  return {
    userId: "user-1",
    type: "weekly_workouts",
    unit: "count",
    targetValue: 4,
    startValue: null,
    exerciseId: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("computeProgressPct", () => {
  it("returns 50% when halfway to target (increasing)", () => {
    expect(computeProgressPct(50, 100, null)).toBe(50);
  });

  it("returns 100% when current meets target (increasing)", () => {
    expect(computeProgressPct(100, 100, null)).toBe(100);
  });

  it("clamps to 100 when current exceeds target", () => {
    expect(computeProgressPct(120, 100, null)).toBe(100);
  });

  it("returns 0% when current is 0 and startValue is null", () => {
    expect(computeProgressPct(0, 100, null)).toBe(0);
  });

  it("handles decreasing goal (e.g. weight loss)", () => {
    // start=100, target=80 → total=20; current=90 → done=10 → 50%
    expect(computeProgressPct(90, 80, 100)).toBe(50);
  });

  it("returns 100% for decreasing goal when current reaches target", () => {
    expect(computeProgressPct(80, 80, 100)).toBe(100);
  });

  it("clamps to 0 when decreasing goal goes in wrong direction", () => {
    expect(computeProgressPct(110, 80, 100)).toBe(0);
  });

  it("returns 0 when targetValue is 0 (increasing)", () => {
    expect(computeProgressPct(10, 0, null)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    // 1/3 * 100 ≈ 33.33 → rounds to 33
    expect(computeProgressPct(1, 3, null)).toBe(33);
  });
});

describe("computeGoalProgress — body_weight", () => {
  it("returns the latest body weight as a number", async () => {
    const db = makeDb({
      bodyMetric: { findFirst: vi.fn().mockResolvedValue({ weightKg: "82.5" }) },
    });
    const result = await computeGoalProgress(db, makeGoal({ type: "body_weight" }));
    expect(result).toBe(82.5);
  });

  it("returns 0 when no body metric exists", async () => {
    const db = makeDb({ bodyMetric: { findFirst: vi.fn().mockResolvedValue(null) } });
    const result = await computeGoalProgress(db, makeGoal({ type: "body_weight" }));
    expect(result).toBe(0);
  });

  it("returns 0 when weightKg is null", async () => {
    const db = makeDb({
      bodyMetric: { findFirst: vi.fn().mockResolvedValue({ weightKg: null }) },
    });
    const result = await computeGoalProgress(db, makeGoal({ type: "body_weight" }));
    expect(result).toBe(0);
  });
});

describe("computeGoalProgress — exercise_pr", () => {
  it("returns the PR value for a given exercise", async () => {
    const db = makeDb({
      personalRecord: { findFirst: vi.fn().mockResolvedValue({ value: "140" }) },
    });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "exercise_pr", exerciseId: "ex-1" }),
    );
    expect(result).toBe(140);
  });

  it("returns 0 when no PR exists", async () => {
    const db = makeDb({
      personalRecord: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "exercise_pr", exerciseId: "ex-1" }),
    );
    expect(result).toBe(0);
  });

  it("returns 0 when exerciseId is null", async () => {
    const db = makeDb();
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "exercise_pr", exerciseId: null }),
    );
    expect(result).toBe(0);
  });
});

describe("computeGoalProgress — weekly_workouts", () => {
  it("returns the workout count for the past 7 days", async () => {
    const db = makeDb({
      workout: { count: vi.fn().mockResolvedValue(3) },
    });
    const result = await computeGoalProgress(db, makeGoal({ type: "weekly_workouts" }));
    expect(result).toBe(3);
  });

  it("returns 0 when no workouts in the past 7 days", async () => {
    const db = makeDb({ workout: { count: vi.fn().mockResolvedValue(0) } });
    const result = await computeGoalProgress(db, makeGoal({ type: "weekly_workouts" }));
    expect(result).toBe(0);
  });
});

describe("computeGoalProgress — cardio_distance", () => {
  it("sums distance in km by default", async () => {
    const db = makeDb({
      cardioSession: {
        findMany: vi.fn().mockResolvedValue([
          { distanceMeters: "5000" },
          { distanceMeters: "3000" },
        ]),
      },
    });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "cardio_distance", unit: "km" }),
    );
    expect(result).toBeCloseTo(8, 5);
  });

  it("converts to miles when unit is mi", async () => {
    const db = makeDb({
      cardioSession: {
        findMany: vi.fn().mockResolvedValue([{ distanceMeters: "1609.344" }]),
      },
    });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "cardio_distance", unit: "mi" }),
    );
    expect(result).toBeCloseTo(1, 5);
  });

  it("skips sessions with null distanceMeters", async () => {
    const db = makeDb({
      cardioSession: {
        findMany: vi.fn().mockResolvedValue([
          { distanceMeters: null },
          { distanceMeters: "2000" },
        ]),
      },
    });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "cardio_distance", unit: "km" }),
    );
    expect(result).toBeCloseTo(2, 5);
  });

  it("returns 0 when no sessions exist", async () => {
    const db = makeDb({ cardioSession: { findMany: vi.fn().mockResolvedValue([]) } });
    const result = await computeGoalProgress(
      db,
      makeGoal({ type: "cardio_distance", unit: "km" }),
    );
    expect(result).toBe(0);
  });
});

describe("computeGoalProgress — unknown type", () => {
  it("returns 0 for unrecognised goal types", async () => {
    const db = makeDb();
    const result = await computeGoalProgress(db, makeGoal({ type: "unknown_type" }));
    expect(result).toBe(0);
  });
});
