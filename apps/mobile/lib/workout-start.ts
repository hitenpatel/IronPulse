/**
 * workout-start.ts
 *
 * Transactional helpers for creating / resuming workouts.  All SQL runs
 * inside a single writeTransaction so races cannot produce two incomplete
 * rows simultaneously.
 *
 * Exported functions:
 *   startEmptyWorkoutAtomic     — creates an empty workout row
 *   startWorkoutFromTemplateAtomic — creates workout + exercises + sets
 *
 * Typed error:
 *   DuplicateActiveWorkoutError — thrown when an incomplete workout already
 *   exists and discardExisting was not set to true.
 */

import type { PowerSyncDatabase } from "@powersync/react-native";
import { randomUUID } from "@/lib/uuid";
import { getWorkoutName } from "@/lib/workout-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export class DuplicateActiveWorkoutError extends Error {
  readonly existingWorkoutId: string;

  constructor(existingWorkoutId: string) {
    super(
      `An active workout already exists: ${existingWorkoutId}. ` +
        "Confirm before starting a new one.",
    );
    this.name = "DuplicateActiveWorkoutError";
    this.existingWorkoutId = existingWorkoutId;
  }
}

export interface StartEmptyOptions {
  /**
   * When true, the existing incomplete workout is discarded inside the same
   * transaction before the new one is created.  The caller MUST obtain
   * explicit user confirmation before setting this flag.
   */
  discardExisting?: boolean;
}

export interface CreatedWorkout {
  workoutId: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Deletes sets → exercises → workout in dependency order inside an open tx. */
async function discardWorkoutInTx(
  tx: { execute(sql: string, params?: unknown[]): Promise<unknown> },
  workoutId: string,
): Promise<void> {
  await tx.execute(
    `DELETE FROM exercise_sets
      WHERE workout_exercise_id IN (
        SELECT id FROM workout_exercises WHERE workout_id = ?
      )`,
    [workoutId],
  );
  await tx.execute(
    "DELETE FROM workout_exercises WHERE workout_id = ?",
    [workoutId],
  );
  await tx.execute("DELETE FROM workouts WHERE id = ?", [workoutId]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * startEmptyWorkoutAtomic
 *
 * Opens a single writeTransaction that:
 *   1. Checks for an existing incomplete workout.
 *   2a. If found and discardExisting = false → throws DuplicateActiveWorkoutError.
 *   2b. If found and discardExisting = true  → discards it, then creates new.
 *   3. Inserts the new workout row.
 *
 * Returns the new workoutId on success.
 */
export async function startEmptyWorkoutAtomic(
  db: PowerSyncDatabase,
  userId: string,
  options: StartEmptyOptions = {},
): Promise<CreatedWorkout> {
  const { discardExisting = false } = options;
  let workoutId!: string;

  await db.writeTransaction(async (tx) => {
    // Check for existing active workout
    const existing = await tx.execute(
      `SELECT id FROM workouts WHERE user_id = ? AND completed_at IS NULL LIMIT 1`,
      [userId],
    );
    const existingId: string | undefined =
      (existing.rows?._array ?? existing.rows as any)?.[0]?.id;

    if (existingId) {
      if (!discardExisting) {
        throw new DuplicateActiveWorkoutError(existingId);
      }
      await discardWorkoutInTx(tx, existingId);
    }

    workoutId = randomUUID();
    const now = new Date().toISOString();
    await tx.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [workoutId, userId, getWorkoutName(), now, now],
    );
  });

  return { workoutId };
}

interface TemplateExerciseRow {
  id: string;
  exercise_id: string;
  order: number;
  notes: string | null;
}

interface TemplateSetRow {
  set_number: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  type: string;
}

/**
 * startWorkoutFromTemplateAtomic
 *
 * Opens a single writeTransaction that:
 *   1. Checks for an existing incomplete workout.
 *   2a. If found and discardExisting = false → throws DuplicateActiveWorkoutError.
 *   2b. If found and discardExisting = true  → discards it, then creates new.
 *   3. Inserts workout row + all template_exercises + exercise_sets in one shot.
 *
 * Partial failure rolls back everything — no orphaned rows.
 */
export async function startWorkoutFromTemplateAtomic(
  db: PowerSyncDatabase,
  userId: string,
  templateId: string,
  options: StartEmptyOptions = {},
): Promise<CreatedWorkout> {
  const { discardExisting = false } = options;
  let workoutId!: string;

  await db.writeTransaction(async (tx) => {
    // Check for existing active workout
    const existing = await tx.execute(
      `SELECT id FROM workouts WHERE user_id = ? AND completed_at IS NULL LIMIT 1`,
      [userId],
    );
    const existingId: string | undefined =
      (existing.rows?._array ?? existing.rows as any)?.[0]?.id;

    if (existingId) {
      if (!discardExisting) {
        throw new DuplicateActiveWorkoutError(existingId);
      }
      await discardWorkoutInTx(tx, existingId);
    }

    // Fetch template details before creating the workout
    const templateRes = await tx.execute(
      `SELECT name FROM templates WHERE id = ? LIMIT 1`,
      [templateId],
    );
    const templateRow = (templateRes.rows?._array ?? templateRes.rows as any)?.[0];
    const templateName: string = templateRow?.name ?? getWorkoutName();

    workoutId = randomUUID();
    const now = new Date().toISOString();
    await tx.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, template_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workoutId, userId, templateName, now, templateId, now],
    );

    // Fetch template exercises
    const teRes = await tx.execute(
      `SELECT id, exercise_id, "order", notes
         FROM template_exercises
        WHERE template_id = ?
        ORDER BY "order"`,
      [templateId],
    );
    const templateExercises: TemplateExerciseRow[] =
      (teRes.rows?._array ?? teRes.rows as any) ?? [];

    for (const te of templateExercises) {
      const weId = randomUUID();
      await tx.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes)
         VALUES (?, ?, ?, ?, ?)`,
        [weId, workoutId, te.exercise_id, te.order, te.notes],
      );

      const tsRes = await tx.execute(
        `SELECT set_number, target_reps, target_weight_kg, type
           FROM template_sets
          WHERE template_exercise_id = ?
          ORDER BY set_number`,
        [te.id],
      );
      const templateSets: TemplateSetRow[] =
        (tsRes.rows?._array ?? tsRes.rows as any) ?? [];

      for (const ts of templateSets) {
        await tx.execute(
          `INSERT INTO exercise_sets
             (id, workout_exercise_id, set_number, type, weight_kg, reps, completed)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            randomUUID(),
            weId,
            ts.set_number,
            ts.type,
            ts.target_weight_kg,
            ts.target_reps,
          ],
        );
      }
    }
  });

  return { workoutId };
}
