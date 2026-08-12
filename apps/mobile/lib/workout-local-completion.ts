export interface LocalCompletionInput {
  workoutId: string;
  startedAt: string | Date;
  completedAt: Date;
}

export interface LocalCompletionResult {
  completedAt: string;
  durationSeconds: number;
}

interface Tx {
  execute(sql: string, params: unknown[]): Promise<unknown>;
  getOptional<T = unknown>(sql: string, params: unknown[]): Promise<T | null>;
}

interface WriteTransactionDb {
  writeTransaction<T>(run: (tx: Tx) => Promise<T>): Promise<T>;
}

const UPDATE_SQL =
  "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ? AND completed_at IS NULL";

const READBACK_SQL =
  "SELECT completed_at, duration_seconds FROM workouts WHERE id = ?";

/**
 * Commit workout completion in a single local PowerSync transaction:
 * update the row (only if still incomplete) and read the canonical stored
 * values back within the same transaction so replay and offline retries
 * cannot report a newer attempted timestamp than what actually landed.
 *
 * Throws if the workout row is missing (deleted or never created). Never
 * issues a network call — server finalization happens via PowerSync upload
 * of the completed_at / duration_seconds columns.
 */
export async function completeWorkoutLocally(
  db: WriteTransactionDb,
  input: LocalCompletionInput,
): Promise<LocalCompletionResult> {
  const startedMs = new Date(input.startedAt).getTime();
  const completedMs = input.completedAt.getTime();
  const rawDuration = Math.floor((completedMs - startedMs) / 1000);
  const durationSeconds = Math.max(0, Number.isFinite(rawDuration) ? rawDuration : 0);
  const completedIso = input.completedAt.toISOString();

  return db.writeTransaction(async (tx) => {
    await tx.execute(UPDATE_SQL, [completedIso, durationSeconds, input.workoutId]);
    const row = await tx.getOptional<{
      completed_at: string;
      duration_seconds: number;
    }>(READBACK_SQL, [input.workoutId]);
    if (!row) {
      throw new Error(`workout ${input.workoutId} not found`);
    }
    return {
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
    };
  });
}
