/**
 * AddExerciseScreen — multi-select exercise picker entry point.
 *
 * Replaces the old single-select flow with the ExerciseMultiPicker component.
 * On "Add N exercises" confirmation:
 *   1. Calls addExercisesAtomic (single writeTransaction, full rollback on error)
 *   2. Navigates back to WorkoutActive with requestedFocusSetId (first set id)
 *      so the focus screen scrolls to the first newly-added exercise (AC #5).
 *
 * Plan reference: Task 5 Step 4 — build the safe-area picker.
 */

import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { usePowerSync } from "@powersync/react";
import { useExercises, useRecentExercises } from "@zor/sync";

import { addExercisesAtomic } from "../../lib/workout-session-mutations";
import { ExerciseMultiPicker } from "../../components/workout/exercise-multi-picker";

export default function AddExerciseScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "WorkoutAddExercise">>();
  const workoutId = route.params?.workoutId;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = usePowerSync();

  // Load full exercise catalog (no limit override — use default 100, picker filters locally)
  const { data: allExercises, isLoading: isLoadingAll, error: allError } = useExercises();

  // Recent: derived from completed workouts via PowerSync
  const { data: recentExercises, isLoading: isLoadingRecent } = useRecentExercises({ limit: 20 });

  // Favorites: empty for now (favorites store deferred; AsyncStorage approach not yet wired)
  // TODO TASK-23.4+: wire favorites-store.ts when it's implemented
  const favoriteExercises = [] as typeof allExercises;

  const [committing, setCommitting] = useState(false);

  const handleAdd = useCallback(
    async (selectedIds: string[]) => {
      if (!workoutId || selectedIds.length === 0 || committing) return;
      setCommitting(true);
      try {
        const { firstSetId } = await addExercisesAtomic(db as any, workoutId, selectedIds);
        // AC #5: single navigation back to WorkoutActive with focus payload
        navigation.navigate("WorkoutActive", {
          workoutId,
          requestedFocusSetId: firstSetId,
        });
      } catch (e) {
        setCommitting(false);
        Alert.alert("Failed to add exercises", "Please try again.");
      }
    },
    [db, workoutId, navigation, committing],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ExerciseMultiPicker
      allExercises={allExercises ?? []}
      recentExercises={recentExercises ?? []}
      favoriteExercises={favoriteExercises ?? []}
      isLoadingAll={isLoadingAll}
      isLoadingRecent={isLoadingRecent}
      errorAll={!!allError}
      onAdd={handleAdd}
      onClose={handleClose}
    />
  );
}
