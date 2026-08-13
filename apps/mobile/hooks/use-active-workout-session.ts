/**
 * useActiveWorkoutSession — all PowerSync queries, derivations, and mutation
 * callbacks for the active-workout screen. The screen itself stays UI-only:
 * layout, rendering, and local UI state (rest timer, RPE picker, keyboard height).
 *
 * Hooks are unconditional (React rules). If workoutId is undefined (route
 * unmounting), queries receive an empty string which returns no rows — safe.
 */

import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { usePowerSync, useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@zor/sync";
import type { WorkoutExerciseRow, SetRow } from "@zor/sync";
import * as Haptics from "@/lib/haptics";
import { maybeRequestReview } from "@/lib/review-prompt";
import { completeWorkoutLocally } from "@/lib/workout-local-completion";
import { renameWorkout, discardWorkout } from "@/lib/workout-session-repository";

export interface WorkoutRow {
  id: string;
  name: string;
  started_at: string;
}

export interface ActiveWorkoutSession {
  workout: WorkoutRow | null;
  exercises: WorkoutExerciseRow[];
  sets: SetRow[];
  setsByExercise: ReadonlyMap<string, SetRow[]>;
  previousSetsByExercise: ReadonlyMap<
    string,
    { weight_kg: number | null; reps: number | null; set_number: number }[]
  >;
  activeSetId: string | null;
  doneSets: number;
  totalSets: number;
  handleNameChange(name: string): Promise<void>;
  handleCancel(): void;
  handleFinish(): Promise<void>;
  handleAddExercise(): void;
}

export function useActiveWorkoutSession(
  workoutId: string | undefined,
): ActiveWorkoutSession {
  const db = usePowerSync();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── Workout row ───────────────────────────────────────────────────────────
  const { data: workoutRows } = useQuery(
    "SELECT * FROM workouts WHERE id = ?",
    [workoutId ?? ""],
  );
  const workout = (workoutRows?.[0] as WorkoutRow | undefined) ?? null;

  // ── Exercises and sets ────────────────────────────────────────────────────
  const { data: exercisesRaw } = useWorkoutExercises(workoutId);
  const { data: setsRaw } = useWorkoutSets(workoutId);
  const exercises: WorkoutExerciseRow[] = exercisesRaw ?? [];
  const sets: SetRow[] = setsRaw ?? [];

  // ── Group sets by workout_exercise_id ─────────────────────────────────────
  const setsByExercise = useMemo<ReadonlyMap<string, SetRow[]>>(() => {
    const map = new Map<string, SetRow[]>();
    for (const set of sets) {
      const key = set.workout_exercise_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(set);
    }
    return map;
  }, [sets]);

  // ── Previous performance ──────────────────────────────────────────────────
  const exerciseIds = useMemo(
    () => exercises.map((e) => e.exercise_id),
    [exercises],
  );

  const { data: allPreviousSets } = useQuery<{
    weight_kg: number | null;
    reps: number | null;
    set_number: number;
    exercise_id: string;
  }>(
    exerciseIds.length > 0
      ? `SELECT es.weight_kg, es.reps, es.set_number, we.exercise_id
         FROM exercise_sets es
         JOIN workout_exercises we ON we.id = es.workout_exercise_id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.exercise_id IN (${exerciseIds.map(() => "?").join(",")})
           AND w.completed_at IS NOT NULL
           AND w.id != ?
         ORDER BY w.completed_at DESC, es.set_number ASC`
      : `SELECT es.weight_kg, es.reps, es.set_number, we.exercise_id FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id WHERE 0`,
    exerciseIds.length > 0 ? [...exerciseIds, workoutId ?? ""] : [],
  );

  const previousSetsByExercise = useMemo(() => {
    const map = new Map<
      string,
      { weight_kg: number | null; reps: number | null; set_number: number }[]
    >();
    for (const row of allPreviousSets ?? []) {
      if (!map.has(row.exercise_id)) {
        map.set(row.exercise_id, []);
      }
      const existing = map.get(row.exercise_id)!;
      if (existing.length < 10) {
        existing.push({
          weight_kg: row.weight_kg,
          reps: row.reps,
          set_number: row.set_number,
        });
      }
    }
    return map;
  }, [allPreviousSets]);

  // ── First-incomplete-set derivation ───────────────────────────────────────
  // Walk exercises in list order, then sets in set_number order, pick first
  // not-yet-done. Hook sits above early returns to keep hook count stable.
  const activeSetId = useMemo<string | null>(() => {
    for (const ex of exercises) {
      const exSets = [...(setsByExercise.get(ex.id) ?? [])].sort(
        (a, b) => a.set_number - b.set_number,
      );
      const next = exSets.find((s) => !s.completed);
      if (next) return next.id;
    }
    return null;
  }, [exercises, setsByExercise]);

  // ── Progress counters ─────────────────────────────────────────────────────
  const totalSets = sets.length;
  const doneSets = sets.filter((s) => s.completed).length;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleNameChange = useCallback(
    async (name: string) => {
      if (!workoutId) return;
      await renameWorkout(db, workoutId, name);
    },
    [db, workoutId],
  );

  const handleCancel = useCallback(() => {
    Alert.alert("Cancel Workout", "Are you sure? All data will be lost.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Cancel Workout",
        style: "destructive",
        onPress: async () => {
          if (!workoutId) return;
          await discardWorkout(db, workoutId);
          navigation.goBack();
        },
      },
    ]);
  }, [db, workoutId, navigation]);

  const handleFinish = useCallback(async () => {
    if (!workout || !workoutId) return;

    try {
      await completeWorkoutLocally(db, {
        workoutId,
        startedAt: workout.started_at,
        completedAt: new Date(),
      });
    } catch {
      // Local commit failed — preserve active workout, let user retry.
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    maybeRequestReview().catch(() => {});

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "WorkoutComplete", params: { workoutId } }],
      }),
    );
  }, [workout, db, workoutId, navigation]);

  const handleAddExercise = useCallback(() => {
    if (!workoutId) return;
    navigation.navigate("WorkoutAddExercise", { workoutId });
  }, [navigation, workoutId]);

  return {
    workout,
    exercises,
    sets,
    setsByExercise,
    previousSetsByExercise,
    activeSetId,
    doneSets,
    totalSets,
    handleNameChange,
    handleCancel,
    handleFinish,
    handleAddExercise,
  };
}
