/**
 * Pure helpers for reset-mobile-e2e.ts — no Prisma imports so tests can run
 * without a live database connection.
 */

// ── Stable UUIDs ─────────────────────────────────────────────────────────────
// These are hardcoded so Maestro flows can reference them by ID across runs.
// Do NOT change them after the first deployment without also updating Maestro flows.

export const E2E_FIXTURE_IDS = {
  TEMPLATE: "e2e00001-0000-4000-a000-000000000001",
  TE_BENCH: "e2e00002-0000-4000-a000-000000000001",
  TE_SQUAT: "e2e00002-0000-4000-a000-000000000002",
  TE_DEADLIFT: "e2e00002-0000-4000-a000-000000000003",
  TS_BENCH_1: "e2e00003-0000-4000-a000-000000000001",
  TS_BENCH_2: "e2e00003-0000-4000-a000-000000000002",
  TS_BENCH_3: "e2e00003-0000-4000-a000-000000000003",
  TS_SQUAT_1: "e2e00003-0000-4000-a000-000000000004",
  TS_SQUAT_2: "e2e00003-0000-4000-a000-000000000005",
  TS_SQUAT_3: "e2e00003-0000-4000-a000-000000000006",
  TS_DEADLIFT_1: "e2e00003-0000-4000-a000-000000000007",
  TS_DEADLIFT_2: "e2e00003-0000-4000-a000-000000000008",
  TS_DEADLIFT_3: "e2e00003-0000-4000-a000-000000000009",
} as const;

// Superset fixture. Seeded separately from the template fixture because an
// incomplete workout always wins the dashboard's "Continue Workout" slot
// (see workout-entry-state.ts), which would hijack every flow that expects to
// start a fresh session. The runner seeds this immediately before the superset
// flow and after everything else has run.
export const E2E_SUPERSET_IDS = {
  WORKOUT: "e2e00004-0000-4000-a000-000000000001",
  WE_BENCH: "e2e00005-0000-4000-a000-000000000001",
  WE_SQUAT: "e2e00005-0000-4000-a000-000000000002",
  WE_DEADLIFT: "e2e00005-0000-4000-a000-000000000003",
  ES_BENCH_1: "e2e00006-0000-4000-a000-000000000001",
  ES_BENCH_2: "e2e00006-0000-4000-a000-000000000002",
  ES_BENCH_3: "e2e00006-0000-4000-a000-000000000003",
  ES_SQUAT_1: "e2e00006-0000-4000-a000-000000000004",
  ES_SQUAT_2: "e2e00006-0000-4000-a000-000000000005",
  ES_DEADLIFT_1: "e2e00006-0000-4000-a000-000000000006",
  ES_DEADLIFT_2: "e2e00006-0000-4000-a000-000000000007",
  ES_DEADLIFT_3: "e2e00006-0000-4000-a000-000000000008",
} as const;

/** Exercise library names the fixtures resolve. Must match seeds/exercises.json exactly. */
export const REQUIRED_EXERCISE_NAMES = [
  "Barbell Bench Press - Medium Grip",
  "Barbell Squat",
  "Barbell Deadlift",
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateSetSpec {
  id: string;
  templateExerciseId: string;
  setNumber: number;
  targetReps: number;
  targetWeightKg: number;
}

export interface TemplateExerciseSpec {
  id: string;
  templateId: string;
  exerciseId: string;
  order: number;
  sets: TemplateSetSpec[];
}

export interface E2EFixtureSpec {
  template: {
    id: string;
    userId: string;
    name: string;
  };
  templateExercises: TemplateExerciseSpec[];
}

export interface ExerciseIds {
  benchPress: string;
  squat: string;
  deadlift: string;
}

export interface WorkoutSetSpec {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface WorkoutExerciseSpec {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  supersetGroup: number;
  sets: WorkoutSetSpec[];
}

export interface SupersetWorkoutSpec {
  workout: {
    id: string;
    userId: string;
    name: string;
    startedAt: Date;
  };
  workoutExercises: WorkoutExerciseSpec[];
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Resolves the test user email from environment, falling back to the default.
 */
export function resolveTestEmail(env: Record<string, string | undefined>): string {
  return env.E2E_TEST_EMAIL ?? "test@example.com";
}

/**
 * Builds the full deterministic fixture spec for the E2E test user.
 * Pure — no I/O, safe to unit-test.
 */
export function buildE2EFixtures(userId: string, exerciseIds: ExerciseIds): E2EFixtureSpec {
  const ids = E2E_FIXTURE_IDS;

  const makeSets = (teId: string, tsIds: [string, string, string], baseWeightKg: number): TemplateSetSpec[] =>
    tsIds.map((id, i) => ({
      id,
      templateExerciseId: teId,
      setNumber: i + 1,
      targetReps: 5,
      targetWeightKg: baseWeightKg,
    }));

  return {
    template: {
      id: ids.TEMPLATE,
      userId,
      name: "E2E — Strength A",
    },
    templateExercises: [
      {
        id: ids.TE_BENCH,
        templateId: ids.TEMPLATE,
        exerciseId: exerciseIds.benchPress,
        order: 0,
        sets: makeSets(ids.TE_BENCH, [ids.TS_BENCH_1, ids.TS_BENCH_2, ids.TS_BENCH_3], 60),
      },
      {
        id: ids.TE_SQUAT,
        templateId: ids.TEMPLATE,
        exerciseId: exerciseIds.squat,
        order: 1,
        sets: makeSets(ids.TE_SQUAT, [ids.TS_SQUAT_1, ids.TS_SQUAT_2, ids.TS_SQUAT_3], 80),
      },
      {
        id: ids.TE_DEADLIFT,
        templateId: ids.TEMPLATE,
        exerciseId: exerciseIds.deadlift,
        order: 2,
        sets: makeSets(ids.TE_DEADLIFT, [ids.TS_DEADLIFT_1, ids.TS_DEADLIFT_2, ids.TS_DEADLIFT_3], 100),
      },
    ],
  };
}

/**
 * Maps exercise-library rows onto the named ids the fixtures need.
 * Throws when the library is missing an entry — a silent miss would change what
 * the Maestro flows see (wrong order, wrong id) rather than failing outright.
 */
export function resolveExerciseIds(rows: Array<{ id: string; name: string }>): ExerciseIds {
  const byName = new Map(rows.map((r) => [r.name, r.id]));
  const missing = REQUIRED_EXERCISE_NAMES.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    throw new Error(
      `Required exercises not found in library: ${missing.join(", ")}. Run the main exercise seed first.`,
    );
  }
  return {
    benchPress: byName.get("Barbell Bench Press - Medium Grip")!,
    squat: byName.get("Barbell Squat")!,
    deadlift: byName.get("Barbell Deadlift")!,
  };
}

/**
 * Builds an in-progress three-member superset workout with uneven set counts
 * (bench 3, squat 2, deadlift 3), so focus mode must round-robin A1→B1→C1,
 * A2→B2→C2, then A3→C3 once the squat is exhausted.
 *
 * Every set is pre-filled and incomplete, so a flow can advance the sequence
 * with "Complete set" alone and never has to type into the editor.
 */
export function buildSupersetWorkoutFixture(
  userId: string,
  exerciseIds: ExerciseIds,
  startedAt: Date,
): SupersetWorkoutSpec {
  const ids = E2E_SUPERSET_IDS;

  const makeSets = (weId: string, setIds: string[], weightKg: number): WorkoutSetSpec[] =>
    setIds.map((id, i) => ({
      id,
      workoutExerciseId: weId,
      setNumber: i + 1,
      weightKg,
      reps: 5,
    }));

  return {
    workout: {
      id: ids.WORKOUT,
      userId,
      name: "E2E — Superset A",
      startedAt,
    },
    workoutExercises: [
      {
        id: ids.WE_BENCH,
        workoutId: ids.WORKOUT,
        exerciseId: exerciseIds.benchPress,
        order: 0,
        supersetGroup: 1,
        sets: makeSets(ids.WE_BENCH, [ids.ES_BENCH_1, ids.ES_BENCH_2, ids.ES_BENCH_3], 60),
      },
      {
        id: ids.WE_SQUAT,
        workoutId: ids.WORKOUT,
        exerciseId: exerciseIds.squat,
        order: 1,
        supersetGroup: 1,
        sets: makeSets(ids.WE_SQUAT, [ids.ES_SQUAT_1, ids.ES_SQUAT_2], 80),
      },
      {
        id: ids.WE_DEADLIFT,
        workoutId: ids.WORKOUT,
        exerciseId: exerciseIds.deadlift,
        order: 2,
        supersetGroup: 1,
        sets: makeSets(
          ids.WE_DEADLIFT,
          [ids.ES_DEADLIFT_1, ids.ES_DEADLIFT_2, ids.ES_DEADLIFT_3],
          100,
        ),
      },
    ],
  };
}

/**
 * Returns the ordered list of models that must be deleted when wiping a user's
 * workout graph, explaining why each step is needed.
 *
 * This is extracted as a pure function so it can be unit-tested and serves as
 * living documentation of the deletion plan.
 */
export function workoutGraphDeletionOrder(): Array<{ model: string; reason: string }> {
  return [
    {
      model: "PersonalRecord",
      reason:
        "References ExerciseSet via onDelete:SetNull — deletion is not blocked, " +
        "but the user's PR history must be wiped so stale records don't leak " +
        "into the next run. Must precede Workout deletion.",
    },
    {
      model: "Workout",
      reason:
        "onDelete:Cascade from Workout propagates to WorkoutFinalization, " +
        "WorkoutExercise, and ExerciseSet — a single deleteMany here clears " +
        "all three child models automatically.",
    },
    {
      model: "WorkoutTemplate",
      reason:
        "onDelete:Cascade from WorkoutTemplate propagates to TemplateExercise " +
        "and TemplateSet — a single deleteMany here clears both child models.",
    },
  ];
}
