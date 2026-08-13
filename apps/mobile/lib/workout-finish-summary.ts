/**
 * Pure finish-summary builder.
 *
 * Enumerates database-backed sets + touched draft fields to determine what to
 * flush in the finish transaction. Untouched suggestions never count as data.
 */

import type { SetDraft } from "./workout-set-draft";
import { isDraftTouched, parseDraftForCommit } from "./workout-set-draft";

export interface DbSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  type?: string | null;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
}

export interface FinishSetEntry {
  setId: string;
  workoutExerciseId: string;
  kind: "completed" | "incomplete-db" | "touched-draft" | "untouched-suggestion";
  /** Parsed values to persist (only for completed and touched-draft kinds) */
  toPersist: { weightKg: number | null; reps: number; rpe: number | null } | null;
}

export interface FinishSummary {
  entries: FinishSetEntry[];
  completedCount: number;
  incompleteCount: number;
  touchedUnsavedCount: number;
  durationSeconds: number;
  /** Total volume from completed sets (kg × reps) */
  totalVolumeKg: number;
}

/**
 * Build the finish summary from DB sets + any in-flight drafts.
 *
 * @param dbSets      All sets as stored in the local DB
 * @param drafts      Map of setId → SetDraft (only for sets being edited)
 * @param startedAtMs Workout start timestamp in ms
 * @param nowMs       Current timestamp in ms
 */
export function buildFinishSummary(
  dbSets: DbSet[],
  drafts: ReadonlyMap<string, SetDraft>,
  startedAtMs: number,
  nowMs: number,
): FinishSummary {
  const entries: FinishSetEntry[] = [];
  let completedCount = 0;
  let incompleteCount = 0;
  let touchedUnsavedCount = 0;
  let totalVolumeKg = 0;

  for (const set of dbSets) {
    if (set.completed === 1) {
      completedCount++;
      const vol =
        set.weight_kg != null && set.reps != null ? set.weight_kg * set.reps : 0;
      totalVolumeKg += vol;
      entries.push({
        setId: set.id,
        workoutExerciseId: set.workout_exercise_id,
        kind: "completed",
        toPersist: null, // already persisted
      });
      continue;
    }

    const draft = drafts.get(set.id);

    if (draft && isDraftTouched(draft)) {
      // Touched draft: flush only touched fields merged with DB backing
      const parsed = parseDraftForCommit(draft, {
        weightKg: set.weight_kg,
        reps: set.reps,
        rpe: set.rpe,
      });
      touchedUnsavedCount++;
      entries.push({
        setId: set.id,
        workoutExerciseId: set.workout_exercise_id,
        kind: "touched-draft",
        toPersist: parsed ?? null,
      });
    } else if (set.reps != null) {
      // Incomplete DB-backed / template set with existing reps value
      incompleteCount++;
      entries.push({
        setId: set.id,
        workoutExerciseId: set.workout_exercise_id,
        kind: "incomplete-db",
        toPersist: {
          weightKg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
        },
      });
    } else {
      // No DB value and no touched draft → untouched suggestion, never persist
      entries.push({
        setId: set.id,
        workoutExerciseId: set.workout_exercise_id,
        kind: "untouched-suggestion",
        toPersist: null,
      });
    }
  }

  const durationSeconds = Math.round((nowMs - startedAtMs) / 1000);

  return {
    entries,
    completedCount,
    incompleteCount,
    touchedUnsavedCount,
    durationSeconds,
    totalVolumeKg,
  };
}
