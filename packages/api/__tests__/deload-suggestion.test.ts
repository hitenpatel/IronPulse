import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import {
  weekStart,
  buildWeeklyVolumes,
  checkAndNotifyDeload,
  runDeloadSuggestionJob,
} from "../src/lib/deload-suggestion";

function mondayOf(daysBack: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBack);
  // roll to Monday
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

function makeWorkout(
  completedAt: Date,
  exercises: Array<{
    exerciseId: string;
    name: string;
    sets: Array<{ weightKg: number; reps: number; completed: boolean }>;
  }>,
) {
  return {
    completedAt,
    workoutExercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exercise: { name: ex.name },
      sets: ex.sets,
    })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("weekStart", () => {
  it("returns the Monday of the week for a Wednesday", () => {
    const wed = new Date("2026-05-13T12:00:00Z"); // Wednesday
    expect(weekStart(wed)).toBe("2026-05-11");
  });

  it("returns the same day for a Monday", () => {
    const mon = new Date("2026-05-11T00:00:00Z");
    expect(weekStart(mon)).toBe("2026-05-11");
  });

  it("returns Monday for a Sunday", () => {
    const sun = new Date("2026-05-17T00:00:00Z");
    expect(weekStart(sun)).toBe("2026-05-11");
  });
});

describe("buildWeeklyVolumes", () => {
  it("aggregates completed sets by exercise and week", async () => {
    const completedAt = new Date("2026-05-14T10:00:00Z"); // Wednesday → week 2026-05-11
    const db = {
      workout: {
        findMany: vi.fn().mockResolvedValue([
          makeWorkout(completedAt, [
            {
              exerciseId: "e1",
              name: "Squat",
              sets: [
                { weightKg: 100, reps: 5, completed: true },
                { weightKg: 100, reps: 5, completed: true },
                { weightKg: 100, reps: 5, completed: false }, // not completed
              ],
            },
          ]),
        ]),
      },
    };
    const vols = await buildWeeklyVolumes(db, "u1");
    expect(vols).toHaveLength(1);
    expect(vols[0]!.exerciseName).toBe("Squat");
    expect(vols[0]!.volumeKg).toBe(1000); // 100 × 5 + 100 × 5 (third set excluded)
    expect(vols[0]!.weekStart).toBe("2026-05-11");
  });

  it("excludes exercises with zero volume", async () => {
    const db = {
      workout: {
        findMany: vi.fn().mockResolvedValue([
          makeWorkout(new Date("2026-05-14T10:00:00Z"), [
            {
              exerciseId: "e1",
              name: "Plank",
              sets: [{ weightKg: 0, reps: 60, completed: true }],
            },
          ]),
        ]),
      },
    };
    const vols = await buildWeeklyVolumes(db, "u1");
    expect(vols).toHaveLength(0);
  });
});

describe("checkAndNotifyDeload", () => {
  function makeDb(opts: {
    recentNotification?: { id: string } | null;
    workouts?: ReturnType<typeof makeWorkout>[];
    createResult?: object;
  }) {
    return {
      notification: {
        findFirst: vi.fn().mockResolvedValue(opts.recentNotification ?? null),
        create: vi.fn().mockResolvedValue(opts.createResult ?? { id: "notif1" }),
      },
      workout: {
        findMany: vi.fn().mockResolvedValue(opts.workouts ?? []),
      },
    };
  }

  it("skips when a recent deload notification exists (suppressed)", async () => {
    const db = makeDb({ recentNotification: { id: "old-notif" } });
    const result = await checkAndNotifyDeload(db, "u1");
    expect(result).toEqual({ notified: false, skipped: "suppressed" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("skips when volume is not stagnant", async () => {
    // Only 1 exercise → not enough for top-3 check
    const w = mondayOf(3);
    const db = makeDb({
      workouts: [
        makeWorkout(w, [
          {
            exerciseId: "e1",
            name: "Squat",
            sets: [{ weightKg: 100, reps: 5, completed: true }],
          },
        ]),
      ],
    });
    const result = await checkAndNotifyDeload(db, "u1");
    expect(result).toEqual({ notified: false, skipped: "not-stagnant" });
  });

  it("creates a notification when volume is stagnant across top 3 lifts", async () => {
    // Build 4 weeks of identical volume for 3 exercises
    const workouts = [0, 7, 14, 21].flatMap((daysBack) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - daysBack);
      date.setUTCHours(10, 0, 0, 0);
      return [
        makeWorkout(date, [
          { exerciseId: "e1", name: "Squat", sets: [{ weightKg: 100, reps: 10, completed: true }] },
          { exerciseId: "e2", name: "Bench", sets: [{ weightKg: 80, reps: 10, completed: true }] },
          { exerciseId: "e3", name: "Deadlift", sets: [{ weightKg: 90, reps: 10, completed: true }] },
        ]),
      ];
    });

    const db = makeDb({ workouts });
    const result = await checkAndNotifyDeload(db, "u1");
    expect(result.notified).toBe(true);
    expect(db.notification.create).toHaveBeenCalledOnce();
    const callArg = db.notification.create.mock.calls[0][0].data;
    expect(callArg.type).toBe("deload_suggestion");
    expect(callArg.data.stagnantLifts).toHaveLength(3);
  });
});

describe("runDeloadSuggestionJob", () => {
  it("returns processed and notified counts", async () => {
    const db = {
      user: {
        findMany: vi.fn().mockResolvedValue([{ id: "u1" }, { id: "u2" }]),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "n1" }),
      },
      workout: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const result = await runDeloadSuggestionJob(db);
    expect(result.processed).toBe(2);
    // No stagnant lifts detected (no workouts) → 0 notified
    expect(result.notified).toBe(0);
  });
});
