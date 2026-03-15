"use client";

import { useQuery } from "@powersync/react";

export interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  order: number;
  notes: string | null;
  exercise_name: string;
}

export interface SetRow {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  completed: number;
}

export function useWorkoutExercises(workoutId: string | undefined) {
  return useQuery<WorkoutExerciseRow>(
    `SELECT we.*, e.name as exercise_name
     FROM workout_exercises we
     LEFT JOIN exercises e ON we.exercise_id = e.id
     WHERE we.workout_id = ?
     ORDER BY we."order"`,
    [workoutId ?? ""]
  );
}

export function useWorkoutSets(workoutId: string | undefined) {
  return useQuery<SetRow>(
    `SELECT s.* FROM exercise_sets s
     INNER JOIN workout_exercises we ON s.workout_exercise_id = we.id
     WHERE we.workout_id = ?
     ORDER BY we."order", s.set_number`,
    [workoutId ?? ""]
  );
}
