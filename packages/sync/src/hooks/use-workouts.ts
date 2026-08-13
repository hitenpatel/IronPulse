import { useQuery } from "@powersync/react";

export interface WorkoutRow {
  id: string;
  user_id: string;
  name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  template_id: string | null;
  created_at: string;
  exercise_count?: number;
}

export function useWorkouts() {
  return useQuery<WorkoutRow>(
    `SELECT w.*,
       (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) as exercise_count
     FROM workouts w
     ORDER BY w.started_at DESC`
  );
}

export interface LatestIncompleteWorkoutRow {
  id: string;
  name: string | null;
  started_at: string;
}

/**
 * useLatestIncompleteWorkout
 *
 * Returns the single newest incomplete workout (completed_at IS NULL),
 * ordered by started_at DESC, id DESC — the canonical active-workout query.
 * Works offline via PowerSync cache.
 */
export function useLatestIncompleteWorkout() {
  return useQuery<LatestIncompleteWorkoutRow>(
    `SELECT id, name, started_at
       FROM workouts
      WHERE completed_at IS NULL
      ORDER BY started_at DESC, id DESC
      LIMIT 1`,
  );
}
