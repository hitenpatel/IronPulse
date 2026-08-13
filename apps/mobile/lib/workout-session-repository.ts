/**
 * Pure SQL boundary for the active workout screen.
 * All db.execute calls that active.tsx makes are consolidated here as named
 * functions. This makes the mutations independently testable without rendering
 * any UI.
 */

export interface SimpleDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * Rename a workout.
 */
export async function renameWorkout(
  db: SimpleDb,
  workoutId: string,
  name: string,
): Promise<void> {
  await db.execute("UPDATE workouts SET name = ? WHERE id = ?", [name, workoutId]);
}

/**
 * Discard an active workout by deleting its sets, exercises, then the workout
 * row itself — in dependency order so FK constraints are satisfied.
 */
export async function discardWorkout(
  db: SimpleDb,
  workoutId: string,
): Promise<void> {
  await db.execute(
    `DELETE FROM exercise_sets WHERE workout_exercise_id IN
     (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
    [workoutId],
  );
  await db.execute(
    "DELETE FROM workout_exercises WHERE workout_id = ?",
    [workoutId],
  );
  await db.execute("DELETE FROM workouts WHERE id = ?", [workoutId]);
}
