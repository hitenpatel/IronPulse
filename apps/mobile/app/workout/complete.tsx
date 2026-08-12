import React, { useMemo, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import { useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@zor/sync";
import { trpc } from "../../lib/trpc";

import { calculateVolume, formatElapsed } from "../../lib/workout-utils";

const POLL_INTERVAL_MS = 2_000;

type FinalizationState =
  | { status: "pending" | "processing" | "failed"; newPRs: unknown[] }
  | { status: "completed"; newPRs: unknown[] };

/** Poll finalization status every 2 s, stopping once status === 'completed'. */
function useFinalizationStatus(workoutId: string): FinalizationState {
  const [state, setState] = useState<FinalizationState>({
    status: "pending",
    newPRs: [],
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!workoutId) return;

    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const result = await trpc.workout.finalizationStatus.query({ workoutId });
        if (stopped) return;
        setState({ status: result.status, newPRs: result.newPRs });
        if (result.status === "completed") {
          stopped = true;
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Network error — keep polling, don't clear the last known state.
      }
    }

    // Immediate first poll, then on interval.
    void poll();
    intervalRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [workoutId]);

  return state;
}

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
};

export default function WorkoutCompleteScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "WorkoutComplete">>();
  const { workoutId } = route.params ?? { workoutId: "" };
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const finalization = useFinalizationStatus(workoutId ?? "");

  // Workout data
  const { data: workoutRows } = useQuery(
    "SELECT * FROM workouts WHERE id = ?",
    [workoutId ?? ""]
  );
  const workout = workoutRows?.[0] as
    | {
        id: string;
        name: string;
        duration_seconds: number | null;
        started_at: string;
        completed_at: string | null;
      }
    | undefined;

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

  // Stats
  const totalVolume = useMemo(
    () => calculateVolume((sets ?? []) as any),
    [sets]
  );
  const duration = workout?.duration_seconds ?? 0;
  const completedSetCount = useMemo(
    () => (sets ?? []).filter((s) => s.completed === 1).length,
    [sets]
  );

  if (!workout) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 24 }}>
            {/* Heading */}
            <Text
              style={{
                color: colors.foreground,
                fontSize: 28,
                fontWeight: "800",
                textAlign: "center",
                marginTop: 24,
              }}
            >
              Workout Complete
            </Text>
            <Text
              style={{
                color: colors.mutedFg,
                fontSize: 16,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              {workout.name}
            </Text>

            {/* Duration and Volume stats */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 24,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.mutedFg,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Duration
                </Text>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 22,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatElapsed(duration)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.mutedFg,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Volume
                </Text>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 22,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {totalVolume.toLocaleString()} kg
                </Text>
              </View>
            </View>

            {/* Finalization status — shows PR results once completed, neutral copy while pending/processing/failed. */}
            <View
              style={{
                marginTop: 20,
                backgroundColor: colors.muted,
                borderRadius: 12,
                padding: 14,
              }}
            >
              {finalization.status === "completed" && finalization.newPRs.length > 0 ? (
                <>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 14,
                      fontWeight: "700",
                      textAlign: "center",
                      marginBottom: 6,
                    }}
                  >
                    New Personal Records!
                  </Text>
                  {(finalization.newPRs as Array<{ exerciseName?: string; type?: string; value?: number }>).map(
                    (pr, i) => (
                      <Text
                        key={i}
                        style={{ color: colors.mutedFg, fontSize: 13, textAlign: "center" }}
                      >
                        {pr.exerciseName ?? "Exercise"} — {pr.type === "1rm" ? "Est. 1RM" : "Volume"}: {pr.value}
                      </Text>
                    ),
                  )}
                </>
              ) : (
                <Text
                  style={{
                    color: colors.mutedFg,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Records will appear after syncing.
                </Text>
              )}
            </View>

            {/* Exercise summary heading */}
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "700",
                marginTop: 28,
                marginBottom: 12,
              }}
            >
              Exercises
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const exerciseSets = setsByExercise.get(item.id) ?? [];
          const completedCount = exerciseSets.filter(
            (s) => s.completed === 1
          ).length;

          return (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.accent,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 15,
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                {item.exercise_name}
              </Text>
              <Text
                style={{
                  color: colors.mutedFg,
                  fontSize: 14,
                }}
              >
                {completedCount} {completedCount === 1 ? "set" : "sets"}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          <Pressable
            onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "MainTabs" }] }))}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 32,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              Done
            </Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}
