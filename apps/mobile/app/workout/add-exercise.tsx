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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { usePowerSync } from "@powersync/react";
import { useExercises, useRecentExercises } from "@zor/sync";
import { trpc } from "../../lib/trpc";

import { addExercisesAtomic } from "../../lib/workout-session-mutations";
import {
  ExerciseMultiPicker,
  type ExercisePickerInjurySummary,
  type ExercisePickerRestriction,
} from "../../components/workout/exercise-multi-picker";

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

  // Active exercise restrictions and the injuries behind them (TASK-13 Task
  // 6): the picker needs both to show a "Restricted" badge AND the past
  // injury that caused it — badges alone only cover half the acceptance
  // criterion. Fetched imperatively per the mobile tRPC convention (no React
  // Query hooks on mobile).
  const [restrictions, setRestrictions] = useState<ExercisePickerRestriction[]>([]);
  const [injuriesById, setInjuriesById] = useState<
    Record<string, ExercisePickerInjurySummary>
  >({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      trpc.injury.listRestrictions
        .query({})
        .then((result) => {
          if (!cancelled) setRestrictions(result.data);
        })
        .catch(() => {
          // Non-fatal: the picker just won't show restriction badges.
        });

      trpc.injury.list
        .query({ limit: 100 })
        .then((result) => {
          if (cancelled) return;
          const byId: Record<string, ExercisePickerInjurySummary> = {};
          for (const injury of result.data) {
            byId[injury.id] = {
              injuryType: injury.injuryType,
              bodyParts: injury.bodyParts,
            };
          }
          setInjuriesById(byId);
        })
        .catch(() => {
          // Non-fatal: the "why is this restricted" affordance falls back
          // to "From a past injury" without the injury detail.
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

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
      restrictions={restrictions}
      injuriesById={injuriesById}
      onAdd={handleAdd}
      onClose={handleClose}
    />
  );
}
