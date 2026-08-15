import { describe, expect, it } from "vitest";
import {
  resolveTestEmail,
  resolveExerciseIds,
  buildE2EFixtures,
  buildSupersetWorkoutFixture,
  workoutGraphDeletionOrder,
  E2E_FIXTURE_IDS,
  E2E_SUPERSET_IDS,
  REQUIRED_EXERCISE_NAMES,
} from "./reset-mobile-e2e-utils.js";

const MOCK_USER_ID = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
const MOCK_EXERCISE_IDS = {
  benchPress: "11111111-0000-4000-a000-000000000001",
  squat: "22222222-0000-4000-a000-000000000001",
  deadlift: "33333333-0000-4000-a000-000000000001",
};

// ── resolveTestEmail ──────────────────────────────────────────────────────────

describe("resolveTestEmail", () => {
  it("returns the default test email when env var is absent", () => {
    expect(resolveTestEmail({})).toBe("test@example.com");
  });

  it("returns the override when E2E_TEST_EMAIL is set", () => {
    expect(resolveTestEmail({ E2E_TEST_EMAIL: "custom@example.com" })).toBe(
      "custom@example.com",
    );
  });
});

// ── buildE2EFixtures ──────────────────────────────────────────────────────────

describe("buildE2EFixtures", () => {
  const spec = buildE2EFixtures(MOCK_USER_ID, MOCK_EXERCISE_IDS);

  it("produces a template with the stable ID", () => {
    expect(spec.template.id).toBe(E2E_FIXTURE_IDS.TEMPLATE);
  });

  it("assigns the provided userId to the template", () => {
    expect(spec.template.userId).toBe(MOCK_USER_ID);
  });

  it("produces exactly 3 template exercises", () => {
    expect(spec.templateExercises).toHaveLength(3);
  });

  it("assigns exercises in order: bench, squat, deadlift", () => {
    const [bench, squat, deadlift] = spec.templateExercises;
    expect(bench.exerciseId).toBe(MOCK_EXERCISE_IDS.benchPress);
    expect(bench.order).toBe(0);
    expect(squat.exerciseId).toBe(MOCK_EXERCISE_IDS.squat);
    expect(squat.order).toBe(1);
    expect(deadlift.exerciseId).toBe(MOCK_EXERCISE_IDS.deadlift);
    expect(deadlift.order).toBe(2);
  });

  it("each template exercise has exactly 3 sets", () => {
    for (const te of spec.templateExercises) {
      expect(te.sets).toHaveLength(3);
    }
  });

  it("set numbers are 1-indexed and sequential", () => {
    for (const te of spec.templateExercises) {
      expect(te.sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    }
  });

  it("set IDs are stable and match E2E_FIXTURE_IDS", () => {
    const [bench, squat, deadlift] = spec.templateExercises;
    expect(bench.sets[0].id).toBe(E2E_FIXTURE_IDS.TS_BENCH_1);
    expect(squat.sets[0].id).toBe(E2E_FIXTURE_IDS.TS_SQUAT_1);
    expect(deadlift.sets[0].id).toBe(E2E_FIXTURE_IDS.TS_DEADLIFT_1);
  });

  it("all set templateExerciseIds match the parent exercise id", () => {
    for (const te of spec.templateExercises) {
      for (const ts of te.sets) {
        expect(ts.templateExerciseId).toBe(te.id);
      }
    }
  });

  it("all templateIds on exercises reference the template", () => {
    for (const te of spec.templateExercises) {
      expect(te.templateId).toBe(spec.template.id);
    }
  });

  it("is deterministic — two calls with the same args produce identical output", () => {
    const spec2 = buildE2EFixtures(MOCK_USER_ID, MOCK_EXERCISE_IDS);
    expect(spec).toEqual(spec2);
  });

  it("all fixture IDs are unique", () => {
    const allIds = [
      spec.template.id,
      ...spec.templateExercises.map((te) => te.id),
      ...spec.templateExercises.flatMap((te) => te.sets.map((ts) => ts.id)),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

// ── workoutGraphDeletionOrder ─────────────────────────────────────────────────

describe("workoutGraphDeletionOrder", () => {
  const order = workoutGraphDeletionOrder();

  it("returns exactly 3 steps", () => {
    expect(order).toHaveLength(3);
  });

  it("PersonalRecord is deleted first (before Workout)", () => {
    expect(order[0].model).toBe("PersonalRecord");
  });

  it("Workout is deleted second", () => {
    expect(order[1].model).toBe("Workout");
  });

  it("WorkoutTemplate is deleted last", () => {
    expect(order[2].model).toBe("WorkoutTemplate");
  });

  it("every step has a non-empty reason string", () => {
    for (const step of order) {
      expect(step.reason.length).toBeGreaterThan(0);
    }
  });
});

// ── resolveExerciseIds ────────────────────────────────────────────────────────

describe("resolveExerciseIds", () => {
  const rows = REQUIRED_EXERCISE_NAMES.map((name, i) => ({
    id: `${i}0000000-0000-4000-a000-000000000001`,
    name,
  }));

  it("maps every required library name onto a named id", () => {
    const ids = resolveExerciseIds(rows);
    expect(ids.benchPress).toBe(rows[0].id);
    expect(ids.squat).toBe(rows[1].id);
    expect(ids.deadlift).toBe(rows[2].id);
  });

  it("throws naming the missing exercises rather than returning a partial map", () => {
    expect(() => resolveExerciseIds(rows.slice(0, 1))).toThrow(/Barbell Squat/);
    expect(() => resolveExerciseIds(rows.slice(0, 1))).toThrow(/Barbell Deadlift/);
  });

  it("ignores library rows that are not required", () => {
    const ids = resolveExerciseIds([...rows, { id: "extra", name: "Cable Fly" }]);
    expect(ids.benchPress).toBe(rows[0].id);
  });
});

// ── buildSupersetWorkoutFixture ───────────────────────────────────────────────

describe("buildSupersetWorkoutFixture", () => {
  const startedAt = new Date("2026-08-13T09:00:00.000Z");
  const spec = buildSupersetWorkoutFixture(MOCK_USER_ID, MOCK_EXERCISE_IDS, startedAt);

  it("creates an incomplete workout owned by the test user", () => {
    expect(spec.workout.id).toBe(E2E_SUPERSET_IDS.WORKOUT);
    expect(spec.workout.userId).toBe(MOCK_USER_ID);
    expect(spec.workout.startedAt).toBe(startedAt);
  });

  it("puts all three exercises in the same superset group", () => {
    expect(spec.workoutExercises).toHaveLength(3);
    for (const we of spec.workoutExercises) {
      expect(we.supersetGroup).toBe(1);
      expect(we.workoutId).toBe(E2E_SUPERSET_IDS.WORKOUT);
    }
  });

  it("orders members bench, squat, deadlift", () => {
    expect(spec.workoutExercises.map((we) => we.order)).toEqual([0, 1, 2]);
    expect(spec.workoutExercises.map((we) => we.exerciseId)).toEqual([
      MOCK_EXERCISE_IDS.benchPress,
      MOCK_EXERCISE_IDS.squat,
      MOCK_EXERCISE_IDS.deadlift,
    ]);
  });

  it("uses uneven set counts so the last round drops the exhausted member", () => {
    expect(spec.workoutExercises.map((we) => we.sets.length)).toEqual([3, 2, 3]);
  });

  it("numbers sets from 1 within each exercise", () => {
    for (const we of spec.workoutExercises) {
      expect(we.sets.map((s) => s.setNumber)).toEqual(
        we.sets.map((_, i) => i + 1),
      );
    }
  });

  it("pre-fills weight and reps so a flow never has to type into the editor", () => {
    for (const we of spec.workoutExercises) {
      for (const s of we.sets) {
        expect(s.weightKg).toBeGreaterThan(0);
        expect(s.reps).toBe(5);
      }
    }
  });

  it("uses globally unique stable ids", () => {
    const ids = [
      spec.workout.id,
      ...spec.workoutExercises.map((we) => we.id),
      ...spec.workoutExercises.flatMap((we) => we.sets.map((s) => s.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not collide with the template fixture ids", () => {
    const supersetIds = new Set(Object.values(E2E_SUPERSET_IDS));
    for (const id of Object.values(E2E_FIXTURE_IDS)) {
      expect(supersetIds.has(id as never)).toBe(false);
    }
  });

  it("is deterministic across calls", () => {
    const again = buildSupersetWorkoutFixture(MOCK_USER_ID, MOCK_EXERCISE_IDS, startedAt);
    expect(again).toEqual(spec);
  });
});
