/**
 * Superset workout fixture — TASK-23.8
 *
 * Seeds a single in-progress three-member superset workout for the E2E test
 * user so the superset Maestro flow has something to resume.
 *
 * Kept out of reset-mobile-e2e.ts on purpose: an incomplete workout always wins
 * the dashboard's "Continue Workout" slot, which would hijack every other flow
 * that expects to start a fresh session. The nightly runner therefore invokes
 * this last, after the main and offline phases have finished.
 *
 * Usage:
 *   pnpm --filter @zor/db db:seed:e2e:superset
 *
 * Safe to run multiple times — fully idempotent on the stable UUIDs.
 */

import { PrismaClient } from "@prisma/client";
import {
  resolveTestEmail,
  resolveExerciseIds,
  buildSupersetWorkoutFixture,
  REQUIRED_EXERCISE_NAMES,
  E2E_SUPERSET_IDS,
} from "./reset-mobile-e2e-utils.js";

const db = new PrismaClient();

async function seedSuperset(): Promise<void> {
  const testEmail = resolveTestEmail(process.env);
  console.log(`[e2e-superset] Target user: ${testEmail}`);

  const user = await db.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    console.error(`[e2e-superset] ERROR: User "${testEmail}" not found. Run the main seed first.`);
    process.exit(1);
  }

  const exerciseRows = await db.exercise.findMany({
    where: { name: { in: [...REQUIRED_EXERCISE_NAMES] }, isCustom: false },
    select: { id: true, name: true },
  });

  let exerciseIds;
  try {
    exerciseIds = resolveExerciseIds(exerciseRows);
  } catch (e) {
    console.error(`[e2e-superset] ERROR: ${(e as Error).message}`);
    process.exit(1);
  }

  const spec = buildSupersetWorkoutFixture(user.id, exerciseIds, new Date());

  await db.$transaction(async (tx) => {
    // Recreate rather than upsert: a previous run may have completed sets or
    // the whole workout, and a partial upsert would leave that progress behind.
    await tx.workout.deleteMany({ where: { id: spec.workout.id } });

    await tx.workout.create({
      data: {
        id: spec.workout.id,
        userId: spec.workout.userId,
        name: spec.workout.name,
        startedAt: spec.workout.startedAt,
      },
    });

    for (const we of spec.workoutExercises) {
      await tx.workoutExercise.create({
        data: {
          id: we.id,
          workoutId: we.workoutId,
          exerciseId: we.exerciseId,
          order: we.order,
          supersetGroup: we.supersetGroup,
        },
      });

      for (const s of we.sets) {
        await tx.exerciseSet.create({
          data: {
            id: s.id,
            workoutExerciseId: s.workoutExerciseId,
            setNumber: s.setNumber,
            type: "working",
            weightKg: s.weightKg,
            reps: s.reps,
            completed: false,
          },
        });
      }
    }
  });

  console.log(`[e2e-superset] Seeded workout ${E2E_SUPERSET_IDS.WORKOUT} ("${spec.workout.name}")`);
  for (const we of spec.workoutExercises) {
    console.log(
      `  WorkoutExercise: ${we.id}  order=${we.order} supersetGroup=${we.supersetGroup} sets=${we.sets.length}`,
    );
  }
  console.log(`[e2e-superset] Done.`);
}

seedSuperset()
  .catch((e) => {
    console.error("[e2e-superset] Fatal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
