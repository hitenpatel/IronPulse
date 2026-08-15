/**
 * Mobile E2E fixture reset — TASK-23.8
 *
 * Deletes the workout graph for the E2E test user and re-seeds a deterministic
 * fixture set so Maestro flows always start from a known state.
 *
 * Usage:
 *   pnpm --filter @zor/db db:reset:e2e
 *   E2E_TEST_EMAIL=other@example.com pnpm --filter @zor/db db:reset:e2e
 *
 * Safe to run multiple times — fully idempotent.
 */

import { writeFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";
import {
  resolveTestEmail,
  resolveExerciseIds,
  buildE2EFixtures,
  REQUIRED_EXERCISE_NAMES,
  type E2EFixtureSpec,
  type ExerciseIds,
} from "./reset-mobile-e2e-utils.js";

const db = new PrismaClient();

async function resetMobileE2E(): Promise<void> {
  const testEmail = resolveTestEmail(process.env);
  console.log(`[e2e-reset] Target user: ${testEmail}`);

  // ── 1. Resolve user ────────────────────────────────────────────────────────
  const user = await db.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    console.error(
      `[e2e-reset] ERROR: User "${testEmail}" not found. ` +
        `Run the main seed (TASK-23.11) first — do NOT create the user here.`,
    );
    process.exit(1);
  }
  console.log(`[e2e-reset] User id: ${user.id}`);

  // ── 2. Delete workout graph ────────────────────────────────────────────────
  //
  // Deletion order (FK-safe):
  //   a) PersonalRecord — references ExerciseSet (onDelete:SetNull, but we
  //      need to wipe the user's PR history so it doesn't leak between runs)
  //   b) Workout — cascades to WorkoutFinalization, WorkoutExercise, ExerciseSet
  //   c) WorkoutTemplate — cascades to TemplateExercise, TemplateSet
  //
  // We do NOT touch: Exercise library, other users, or any non-workout data
  // (cardio sessions, body metrics, sleep logs, etc.) — those are reset by
  // separate flows or left intact intentionally.

  const [deletedPRs, deletedWorkouts, deletedTemplates] = await db.$transaction(
    async (tx) => {
      const prs = await tx.personalRecord.deleteMany({ where: { userId: user.id } });
      const workouts = await tx.workout.deleteMany({ where: { userId: user.id } });
      const templates = await tx.workoutTemplate.deleteMany({ where: { userId: user.id } });
      // With zero workouts the dashboard would show the first-workout tutorial
      // card, whose next-up-hero testID is a plain View — flows tapping the
      // hero would silently no-op. Dismiss it so the pressable hero renders.
      await tx.user.update({
        where: { id: user.id },
        data: { firstWorkoutTutorialDismissed: true },
      });
      return [prs, workouts, templates];
    },
  );

  console.log(`[e2e-reset] Deleted:`);
  console.log(`  PersonalRecord:   ${deletedPRs.count}`);
  console.log(`  Workout:          ${deletedWorkouts.count}  (cascaded WorkoutExercise + ExerciseSet + WorkoutFinalization)`);
  console.log(`  WorkoutTemplate:  ${deletedTemplates.count}  (cascaded TemplateExercise + TemplateSet)`);

  // ── 3. Resolve exercises from library ──────────────────────────────────────
  const exerciseRows = await db.exercise.findMany({
    where: { name: { in: [...REQUIRED_EXERCISE_NAMES] }, isCustom: false },
    select: { id: true, name: true },
  });

  let exerciseIds: ExerciseIds;
  try {
    exerciseIds = resolveExerciseIds(exerciseRows);
  } catch (e) {
    console.error(`[e2e-reset] ERROR: ${(e as Error).message}`);
    process.exit(1);
  }

  // ── 4. Re-seed deterministic fixtures ─────────────────────────────────────
  const spec: E2EFixtureSpec = buildE2EFixtures(user.id, exerciseIds);

  await db.$transaction(async (tx) => {
    // Upsert template (idempotent on stable UUID)
    await tx.workoutTemplate.upsert({
      where: { id: spec.template.id },
      update: { name: spec.template.name },
      create: {
        id: spec.template.id,
        userId: spec.template.userId,
        name: spec.template.name,
        isShareable: false,
      },
    });

    for (const te of spec.templateExercises) {
      await tx.templateExercise.upsert({
        where: { id: te.id },
        update: { order: te.order },
        create: {
          id: te.id,
          templateId: te.templateId,
          exerciseId: te.exerciseId,
          order: te.order,
        },
      });

      for (const ts of te.sets) {
        await tx.templateSet.upsert({
          where: { id: ts.id },
          update: { setNumber: ts.setNumber, targetReps: ts.targetReps, targetWeightKg: ts.targetWeightKg },
          create: {
            id: ts.id,
            templateExerciseId: ts.templateExerciseId,
            setNumber: ts.setNumber,
            targetReps: ts.targetReps,
            targetWeightKg: ts.targetWeightKg,
            type: "working",
          },
        });
      }
    }
  });

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log(`\n[e2e-reset] Fixture IDs (stable — hardcoded for Maestro):`);
  console.log(`  WorkoutTemplate:    ${spec.template.id}`);
  for (const te of spec.templateExercises) {
    console.log(`  TemplateExercise:   ${te.id}  (order=${te.order})`);
    for (const ts of te.sets) {
      console.log(`  TemplateSet:        ${ts.id}  (set=${ts.setNumber})`);
    }
  }
  // The exercise library is seeded with `@default(uuid())`, so exercise IDs
  // differ between databases while the app's picker rows are keyed
  // `exercise-option-<uuid>`. Maestro flows therefore carry placeholders and
  // the runner substitutes the real values from this file.
  if (process.env.E2E_IDS_OUT) {
    await writeFile(
      process.env.E2E_IDS_OUT,
      JSON.stringify(
        {
          USER_ID: user.id,
          TEMPLATE_ID: spec.template.id,
          EXERCISE_BENCH_PRESS: exerciseIds.benchPress,
          EXERCISE_SQUAT: exerciseIds.squat,
          EXERCISE_DEADLIFT: exerciseIds.deadlift,
        },
        null,
        2,
      ),
    );
    console.log(`[e2e-reset] wrote ids to ${process.env.E2E_IDS_OUT}`);
  }

  console.log(`\n[e2e-reset] Done — E2E fixture reset complete.`);
}

resetMobileE2E()
  .catch((e) => {
    console.error("[e2e-reset] Fatal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
