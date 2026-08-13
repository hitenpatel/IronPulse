import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import { Plus } from "lucide-react-native";

import { WorkoutHeader } from "../../components/workout/workout-header";
import { ExerciseCard } from "../../components/workout/exercise-card";
import { RestTimer } from "../../components/workout/rest-timer";
import { RpePicker } from "../../components/workout/rpe-picker";
import { ProgressDots } from "../../components/workout/progress-dots";
import { useAuth } from "../../lib/auth";
import { useActiveWorkoutSession } from "../../hooks/use-active-workout-session";
import { colors, fonts } from "@/lib/theme";

export default function ActiveWorkoutScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "WorkoutActive">>();
  const workoutId = route.params?.workoutId;
  const { user } = useAuth();
  const defaultRest = user?.defaultRestSeconds ?? 90;

  const {
    workout,
    exercises,
    setsByExercise,
    previousSetsByExercise,
    activeSetId,
    doneSets,
    totalSets,
    handleNameChange,
    handleCancel,
    handleFinish,
    handleAddExercise,
  } = useActiveWorkoutSession(workoutId);

  // ── Scroll to top when exercises are added ────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const prevExerciseCount = useRef(0);

  useEffect(() => {
    const count = exercises.length;
    if (count > prevExerciseCount.current && count > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
        100,
      );
    }
    prevExerciseCount.current = count;
  }, [exercises.length]);

  // ── Keyboard height ───────────────────────────────────────────────────────
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Local UI state ────────────────────────────────────────────────────────
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [rpePicker, setRpePicker] = useState<{
    open: boolean;
    setId: string;
    rpe: number | null;
  }>({ open: false, setId: "", rpe: null });

  if (!workout) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <WorkoutHeader
        workoutId={workout.id}
        name={workout.name}
        startedAt={workout.started_at}
        onCancel={handleCancel}
        onFinish={handleFinish}
        onNameChange={handleNameChange}
      />

      <ProgressDots total={Math.max(totalSets, 14)} completed={doneSets} />

      <FlatList
        ref={flatListRef}
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: keyboardHeight + 120,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const allEx = exercises;
          const next = allEx[index + 1];
          const canLink =
            item.superset_group == null &&
            next != null &&
            next.superset_group == null;
          const isSupersetEnd =
            item.superset_group != null &&
            (index === allEx.length - 1 ||
              allEx[index + 1]?.superset_group !== item.superset_group);

          return (
            <>
              <ExerciseCard
                exerciseId={item.exercise_id}
                workoutExerciseId={item.id}
                exerciseName={item.exercise_name}
                equipment={item.exercise_equipment}
                sets={(setsByExercise.get(item.id) ?? []) as any}
                previousSets={
                  previousSetsByExercise.get(item.exercise_id) ?? []
                }
                exerciseIndex={index}
                workoutId={workoutId!}
                supersetGroup={item.superset_group}
                canLinkSuperset={canLink}
                nextWorkoutExerciseId={next?.id}
                activeSetId={activeSetId}
                warmupScheme={
                  (user?.warmupScheme && user.warmupScheme !== "none"
                    ? user.warmupScheme
                    : "strength") as "strength" | "hypertrophy" | "light"
                }
                warmupEnabled={user?.warmupEnabled ?? true}
                onSetComplete={() => setRestTimerVisible(true)}
                onRpePick={(setId, rpe) =>
                  setRpePicker({ open: true, setId, rpe })
                }
              />
              {item.superset_group != null &&
                !isSupersetEnd &&
                next?.superset_group === item.superset_group && (
                  <View
                    style={{
                      alignItems: "center",
                      marginTop: -8,
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 1,
                        height: 14,
                        backgroundColor: colors.purple,
                        opacity: 0.5,
                      }}
                    />
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.purple,
                        backgroundColor: colors.bg1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 2.5,
                          backgroundColor: colors.purple,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        width: 1,
                        height: 14,
                        backgroundColor: colors.purple,
                        opacity: 0.5,
                      }}
                    />
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
              backgroundColor: colors.bg2,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Plus size={16} color={colors.blue2} />
            <Text
              style={{
                color: colors.blue2,
                fontSize: 13.5,
                fontFamily: fonts.bodySemi,
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
