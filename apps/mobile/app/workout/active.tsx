import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import { usePowerSync, useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import * as Haptics from "@/lib/haptics";
import { Plus } from "lucide-react-native";

import { WorkoutHeader } from "../../components/workout/workout-header";
import { ExerciseCard } from "../../components/workout/exercise-card";
import { RestTimer } from "../../components/workout/rest-timer";
import { RpePicker } from "../../components/workout/rpe-picker";
import { calculateVolume } from "../../lib/workout-utils";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../lib/auth";
import { maybeRequestReview } from "../../lib/review-prompt";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
};

export default function ActiveWorkoutScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "WorkoutActive">>();
  const workoutId = route.params?.workoutId;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = usePowerSync();
  const { user } = useAuth();
  const defaultRest = user?.defaultRestSeconds ?? 90;

  // Workout data
  const { data: workoutRows } = useQuery(
    "SELECT * FROM workouts WHERE id = ?",
    [workoutId ?? ""]
  );
  const workout = workoutRows?.[0] as
    | { id: string; name: string; started_at: string }
    | undefined;

  // Exercises and sets
  const { data: exercises } = useWorkoutExercises(workoutId);
  const { data: sets } = useWorkoutSets(workoutId);

  // Group sets by workout_exercise_id
  const setsByExercise = useMemo(() => {
    const map = new Map<string, typeof sets>();
    for (const set of sets ?? []) {
      const key = set.workout_exercise_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(set);
    }
    return map;
  }, [sets]);

  // Query previous performance for all exercises in this workout
  const exerciseIds = useMemo(
    () => (exercises ?? []).map((e) => e.exercise_id),
    [exercises]
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
    exerciseIds.length > 0 ? [...exerciseIds, workoutId ?? ""] : []
  );

  const previousSetsByExercise = useMemo(() => {
    const map = new Map<string, { weight_kg: number | null; reps: number | null; set_number: number }[]>();
    for (const row of allPreviousSets ?? []) {
      if (!map.has(row.exercise_id)) {
        map.set(row.exercise_id, []);
      }
      const existing = map.get(row.exercise_id)!;
      if (existing.length < 10) {
        existing.push({ weight_kg: row.weight_kg, reps: row.reps, set_number: row.set_number });
      }
    }
    return map;
  }, [allPreviousSets]);

  const flatListRef = useRef<FlatList>(null);
  const prevExerciseCount = useRef(0);

  useEffect(() => {
    const count = exercises?.length ?? 0;
    if (count > prevExerciseCount.current && count > 0) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    }
    prevExerciseCount.current = count;
  }, [exercises?.length]);

  // Keyboard height tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Rest timer state
  const [restTimerVisible, setRestTimerVisible] = useState(false);

  // RPE picker state
  const [rpePicker, setRpePicker] = useState<{
    open: boolean;
    setId: string;
    rpe: number | null;
  }>({ open: false, setId: "", rpe: null });

  const handleSetComplete = useCallback(() => {
    setRestTimerVisible(true);
  }, []);

  const handleRpePick = useCallback((setId: string, rpe: number | null) => {
    setRpePicker({ open: true, setId, rpe });
  }, []);

  const handleNameChange = useCallback(
    async (name: string) => {
      await db.execute("UPDATE workouts SET name = ? WHERE id = ?", [
        name,
        workoutId,
      ]);
    },
    [db, workoutId]
  );

  const handleCancel = useCallback(() => {
    Alert.alert("Cancel Workout", "Are you sure? All data will be lost.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Cancel Workout",
        style: "destructive",
        onPress: async () => {
          // Delete in order: sets -> exercises -> workout
          await db.execute(
            `DELETE FROM exercise_sets WHERE workout_exercise_id IN
             (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
            [workoutId]
          );
          await db.execute(
            "DELETE FROM workout_exercises WHERE workout_id = ?",
            [workoutId]
          );
          await db.execute("DELETE FROM workouts WHERE id = ?", [workoutId]);
          navigation.goBack();
        },
      },
    ]);
  }, [db, workoutId, navigation]);

  const handleFinish = useCallback(async () => {
    if (!workout) return;

    const startedAt = new Date(workout.started_at).getTime();
    const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

    // Update workout with completion data
    await db.execute(
      "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ?",
      [new Date().toISOString(), durationSeconds, workoutId]
    );

    // Try to sync via tRPC (tolerate offline failures)
    let prs: unknown[] = [];
    try {
      const result = await trpc.workout.complete.mutate({ id: workoutId! });
      prs = (result as any)?.prs ?? [];
    } catch {
      // Offline — will sync later
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Fire-and-forget — never block navigation
    maybeRequestReview().catch(() => {});

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "WorkoutComplete", params: { workoutId: workoutId!, prs: JSON.stringify(prs) } }],
      })
    );
  }, [workout, db, workoutId, navigation]);

  const handleAddExercise = useCallback(() => {
    navigation.navigate("WorkoutAddExercise", { workoutId: workoutId! });
  }, [navigation, workoutId]);

  if (!workout) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WorkoutHeader
        workoutId={workout.id}
        name={workout.name}
        startedAt={workout.started_at}
        onCancel={handleCancel}
        onFinish={handleFinish}
        onNameChange={handleNameChange}
      />

      <FlatList
        ref={flatListRef}
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: keyboardHeight + 120,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const allEx = exercises ?? [];
          const next = allEx[index + 1];
          const canLink = item.superset_group == null && next != null && next.superset_group == null;
          const isSupersetStart = item.superset_group != null &&
            (index === 0 || allEx[index - 1]?.superset_group !== item.superset_group);
          const isSupersetEnd = item.superset_group != null &&
            (index === allEx.length - 1 || allEx[index + 1]?.superset_group !== item.superset_group);

          return (
            <>
              <ExerciseCard
                exerciseId={item.exercise_id}
                workoutExerciseId={item.id}
                exerciseName={item.exercise_name}
                sets={(setsByExercise.get(item.id) ?? []) as any}
                previousSets={previousSetsByExercise.get(item.exercise_id) ?? []}
                exerciseIndex={index}
                workoutId={workoutId!}
                supersetGroup={item.superset_group}
                canLinkSuperset={canLink}
                nextWorkoutExerciseId={next?.id}
                onSetComplete={handleSetComplete}
                onRpePick={handleRpePick}
              />
              {/* Superset connector — show between consecutive grouped exercises */}
              {item.superset_group != null && !isSupersetEnd && next?.superset_group === item.superset_group && (
                <View style={{ alignItems: "center", marginTop: -8, marginBottom: 4 }}>
                  <View style={{ width: 2, height: 12, backgroundColor: "#A855F7" }} />
                  <Text style={{ color: "#A855F7", fontSize: 9, fontWeight: "700", letterSpacing: 0.6 }}>SS</Text>
                  <View style={{ width: 2, height: 12, backgroundColor: "#A855F7" }} />
                </View>
              )}
            </>
          );
        }}
        ListFooterComponent={
          <Pressable
            testID="add-exercise-button"
            onPress={handleAddExercise}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginHorizontal: 16,
              marginTop: 4,
              paddingVertical: 14,
              backgroundColor: colors.accent,
              borderRadius: 12,
            }}
          >
            <Plus size={20} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Add Exercise
            </Text>
          </Pressable>
        }
      />

      <RestTimer
        visible={restTimerVisible}
        onDismiss={() => setRestTimerVisible(false)}
        defaultRest={defaultRest}
      />

      <RpePicker
        open={rpePicker.open}
        setId={rpePicker.setId}
        currentRpe={rpePicker.rpe}
        onClose={() => setRpePicker({ open: false, setId: "", rpe: null })}
      />
    </View>
  );
}
