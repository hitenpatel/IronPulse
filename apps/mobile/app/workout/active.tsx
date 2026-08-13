import React from "react";
import { View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";

import { WorkoutSessionHeader } from "../../components/workout/workout-session-header";
import { ProgressDots } from "../../components/workout/progress-dots";
import { RpePicker } from "../../components/workout/rpe-picker";
import { FocusModeComposer } from "../../components/workout/focus-mode-composer";
import { useAuth } from "../../lib/auth";
import { useActiveWorkoutSession } from "../../hooks/use-active-workout-session";
import { colors } from "@/lib/theme";
import { useState } from "react";

export default function ActiveWorkoutScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "WorkoutActive">>();
  const workoutId = route.params?.workoutId;
  const requestedFocusSetId = route.params?.requestedFocusSetId;
  const { user } = useAuth();

  const {
    workout,
    exercises,
    sets,
    setsByExercise,
    previousSetsByExercise,
    doneSets,
    totalSets,
    handleNameChange,
    handleCancel,
    handleFinish,
    handleAddExercise,
  } = useActiveWorkoutSession(workoutId);

  // ── RPE picker (mounted at coordinator level so it overlays everything) ──
  const [rpePicker, setRpePicker] = useState<{
    open: boolean;
    setId: string;
    rpe: number | null;
  }>({ open: false, setId: "", rpe: null });

  if (!workout) return null;

  const userId = user?.id ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <WorkoutSessionHeader
        workoutId={workout.id}
        name={workout.name}
        startedAt={workout.started_at}
        doneSets={doneSets}
        totalSets={totalSets}
        onCancel={handleCancel}
        onFinish={handleFinish}
        onNameChange={handleNameChange}
      />

      {/* Progress dots */}
      <ProgressDots total={Math.max(totalSets, 14)} completed={doneSets} />

      {/* Focus-mode body — replaces peer-card FlatList */}
      <FocusModeComposer
        workout={workout}
        exercises={exercises}
        sets={sets}
        setsByExercise={setsByExercise}
        previousSetsByExercise={previousSetsByExercise}
        userId={userId}
        onAddExercise={handleAddExercise}
        onCancel={handleCancel}
        requestedFocusSetId={requestedFocusSetId}
      />

      {/* RPE picker overlay */}
      <RpePicker
        open={rpePicker.open}
        setId={rpePicker.setId}
        currentRpe={rpePicker.rpe}
        onClose={() => setRpePicker({ open: false, setId: "", rpe: null })}
      />
    </View>
  );
}
