/**
 * Transactional mutation helpers for the active workout focus mode.
 *
 * All set/exercise SQL lives here. Presentational components call these
 * functions instead of executing SQL directly.
 *
 * AC #4: set completion uses ONE writeTransaction — no chained db.execute calls.
 */

import type { ParsedSetDraft } from "./workout-set-draft";
import { randomUUID } from "./uuid";

export interface WorkoutDatabase {
  writeTransaction(
    fn: (tx: {
      execute(sql: string, params?: unknown[]): Promise<unknown>;
    }) => Promise<void>,
  ): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * Complete a set atomically in one transaction.
 * Writes weight, reps, RPE, rest target, and completed = 1.
 * Returns without writing if draft is invalid (null).
 */
export async function completeSetAtomic(
  db: WorkoutDatabase,
  setId: string,
  draft: ParsedSetDraft,
  restSeconds: number,
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE exercise_sets
         SET weight_kg = ?, reps = ?, rpe = ?, rest_seconds = ?, completed = 1
       WHERE id = ?`,
      [draft.weightKg, draft.reps, draft.rpe, restSeconds, setId],
    );
  });
}

/**
 * Mark a previously completed set incomplete (undo).
 * Only safe to call when no later set completion has occurred.
 */
export async function markSetIncomplete(
  db: WorkoutDatabase,
  setId: string,
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      "UPDATE exercise_sets SET completed = 0 WHERE id = ?",
      [setId],
    );
  });
}

/**
 * Edit a completed set — flush only the provided partial values.
 */
export async function editCompletedSet(
  db: WorkoutDatabase,
  setId: string,
  patch: { weightKg?: number | null; reps?: number; rpe?: number | null },
): Promise<void> {
  const parts: string[] = [];
  const params: unknown[] = [];

  if ("weightKg" in patch) {
    parts.push("weight_kg = ?");
    params.push(patch.weightKg ?? null);
  }
  if ("reps" in patch) {
    parts.push("reps = ?");
    params.push(patch.reps);
  }
  if ("rpe" in patch) {
    parts.push("rpe = ?");
    params.push(patch.rpe ?? null);
  }

  if (parts.length === 0) return;

  params.push(setId);
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `UPDATE exercise_sets SET ${parts.join(", ")} WHERE id = ?`,
      params,
    );
  });
}

/**
 * Add a set to an exercise.
 */
export async function addSet(
  db: WorkoutDatabase,
  setId: string,
  workoutExerciseId: string,
  setNumber: number,
  type: string = "working",
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, rpe, completed)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0)`,
      [setId, workoutExerciseId, setNumber, type],
    );
  });
}

/**
 * Delete a set from an exercise.
 */
export async function deleteSet(
  db: WorkoutDatabase,
  setId: string,
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute("DELETE FROM exercise_sets WHERE id = ?", [setId]);
  });
}

/**
 * Delete an exercise and all its sets.
 */
export async function deleteExercise(
  db: WorkoutDatabase,
  workoutExerciseId: string,
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      "DELETE FROM exercise_sets WHERE workout_exercise_id = ?",
      [workoutExerciseId],
    );
    await tx.execute(
      "DELETE FROM workout_exercises WHERE id = ?",
      [workoutExerciseId],
    );
  });
}

/**
 * Flush touched drafts and complete a workout locally.
 * Aborts entire transaction on any error.
 * Never persists untouched suggestions.
 */
export async function flushDraftsAndFinish(
  db: WorkoutDatabase,
  workoutId: string,
  completedAt: Date,
  durationSeconds: number,
  entries: Array<{
    setId: string;
    kind: "touched-draft" | "incomplete-db" | "completed" | "untouched-suggestion";
    toPersist: { weightKg: number | null; reps: number; rpe: number | null } | null;
  }>,
): Promise<void> {
  await db.writeTransaction(async (tx) => {
    // Flush touched drafts and DB-backed incomplete sets
    for (const entry of entries) {
      if (
        (entry.kind === "touched-draft" || entry.kind === "incomplete-db") &&
        entry.toPersist != null
      ) {
        await tx.execute(
          `UPDATE exercise_sets
             SET weight_kg = ?, reps = ?, rpe = ?
           WHERE id = ?`,
          [
            entry.toPersist.weightKg,
            entry.toPersist.reps,
            entry.toPersist.rpe,
            entry.setId,
          ],
        );
      }
      // Never write untouched-suggestion entries
    }

    // Mark workout complete
    await tx.execute(
      `UPDATE workouts
         SET completed_at = ?, duration_seconds = ?
       WHERE id = ?`,
      [completedAt.toISOString(), durationSeconds, workoutId],
    );
  });
}

/**
 * Atomically insert a batch of exercises + their first sets into a workout.
 *
 * AC #3: everything inside a single writeTransaction. If any insert throws,
 * the whole batch rolls back — zero workout_exercises rows land for that batch.
 *
 * AC #4: duplicate IDs within the batch are rejected (caller should use
 * dedupeSelection first, but this function also filters to be safe).
 *
 * Returns the workout_exercise id and first set id for the FIRST exercise
 * in selection order — used by the focus screen to scroll to it.
 */
export async function addExercisesAtomic(
  db: WorkoutDatabase,
  workoutId: string,
  selectedExerciseIds: string[],
): Promise<{ firstWorkoutExerciseId: string; firstSetId: string }> {
  // Dedup within the batch while preserving order
  const seen = new Set<string>();
  const dedupedIds = selectedExerciseIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (dedupedIds.length === 0) {
    throw new Error("addExercisesAtomic: no exercise IDs provided");
  }

  let firstWorkoutExerciseId = "";
  let firstSetId = "";

  await db.writeTransaction(async (tx) => {
    // Query current max order so new exercises come after existing ones
    const orderResult = await tx.execute(
      `SELECT COALESCE(MAX("order"), 0) AS max_order FROM workout_exercises WHERE workout_id = ?`,
      [workoutId],
    );
    const rows = (orderResult as any)?.rows?._array ?? (orderResult as any)?.rows ?? [];
    const baseOrder: number =
      rows.length > 0 ? ((rows[0] as any)?.max_order ?? 0) : 0;

    for (let i = 0; i < dedupedIds.length; i++) {
      const exerciseId = dedupedIds[i];
      const weId = randomUUID();
      const setId = randomUUID();
      const order = baseOrder + i + 1;

      await tx.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes)
         VALUES (?, ?, ?, ?, NULL)`,
        [weId, workoutId, exerciseId, order],
      );

      await tx.execute(
        `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, weight_kg, reps, rpe, completed)
         VALUES (?, ?, 1, NULL, NULL, NULL, 0)`,
        [setId, weId],
      );

      if (i === 0) {
        firstWorkoutExerciseId = weId;
        firstSetId = setId;
      }
    }
  });

  return { firstWorkoutExerciseId, firstSetId };
}
