import { useQuery } from "@powersync/react";

export interface ExerciseRow {
  id: string;
  name: string;
  category: string | null;
  primary_muscles: string | null;
  secondary_muscles: string | null;
  equipment: string | null;
  instructions: string | null;
  image_urls: string | null;
  video_urls: string | null;
  is_custom: number;
  created_by_id: string | null;
}

export function useExercises(opts?: {
  search?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
  limit?: number;
}) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (opts?.search) {
    conditions.push("name LIKE ?");
    params.push(`%${opts.search}%`);
  }
  if (opts?.muscle) {
    conditions.push("primary_muscles LIKE ?");
    params.push(`%${opts.muscle}%`);
  }
  if (opts?.equipment) {
    conditions.push("equipment = ?");
    params.push(opts.equipment);
  }
  if (opts?.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 100;

  return useQuery<ExerciseRow>(
    `SELECT * FROM exercises ${where} ORDER BY name, id LIMIT ${limit}`,
    params
  );
}

/**
 * Returns exercises ordered by most-recently used in completed workouts.
 * Derives recency from completed workout_exercises joined to completed workouts.
 * Falls back to an empty list when offline or no history exists.
 */
export function useRecentExercises(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 20;
  return useQuery<ExerciseRow>(
    `SELECT e.*
     FROM exercises e
     INNER JOIN (
       SELECT we.exercise_id, MAX(w.completed_at) AS last_used
       FROM workout_exercises we
       INNER JOIN workouts w ON we.workout_id = w.id
       WHERE w.completed_at IS NOT NULL
       GROUP BY we.exercise_id
     ) recent ON e.id = recent.exercise_id
     ORDER BY recent.last_used DESC, e.name, e.id
     LIMIT ${limit}`,
    [],
  );
}
