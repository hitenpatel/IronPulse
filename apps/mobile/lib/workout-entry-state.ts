/**
 * workout-entry-state.ts
 *
 * Single source of truth for the workout entry-point priority logic.
 * Consumed by Home, NewSessionSheet, and any future surface that needs
 * to decide between: resume active → start new.
 *
 * Priority order (from plan Task 6):
 *  1. Active workout (completed_at IS NULL, newest by started_at DESC, id DESC)
 *  2. Start new workout
 *
 * NOTE: scheduled-template resolution lives in program/index.tsx and is out
 *       of scope for TASK-23.5 (no tRPC calls here).
 */

import { useQuery } from "@powersync/react";

/** Minimal shape surfaced to callers — enough to render "Continue Workout — {name}" */
export interface ActiveWorkoutDescriptor {
  id: string;
  name: string;
  startedAt: string;
}

/** Shape returned by useLatestIncompleteWorkout */
export interface LatestIncompleteWorkoutResult {
  /** The active (incomplete) workout, or null when none exists. */
  activeWorkout: ActiveWorkoutDescriptor | null;
}

interface RawRow {
  id: string;
  name: string | null;
  started_at: string;
}

/**
 * useLatestIncompleteWorkout
 *
 * PowerSync reactive query — returns the single newest incomplete workout row,
 * or null when the user has no active workout.
 *
 * SQL mirrors the canonical query from the plan:
 *   SELECT id, name, started_at FROM workouts
 *   WHERE completed_at IS NULL
 *   ORDER BY started_at DESC, id DESC
 *   LIMIT 1
 *
 * Works offline — PowerSync returns the cached local row.
 */
export function useLatestIncompleteWorkout(): LatestIncompleteWorkoutResult {
  const { data } = useQuery<RawRow>(
    `SELECT id, name, started_at
       FROM workouts
      WHERE completed_at IS NULL
      ORDER BY started_at DESC, id DESC
      LIMIT 1`,
  );

  const row: RawRow | undefined = data?.[0];
  if (!row) {
    return { activeWorkout: null };
  }

  return {
    activeWorkout: {
      id: row.id,
      name: row.name ?? "Active Workout",
      startedAt: row.started_at,
    },
  };
}
