import React, { useMemo } from "react";
import { FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { Trophy } from "lucide-react-native";

import { calculateVolume, formatElapsed } from "../../lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  green: "hsl(142, 71%, 45%)",
  greenBorder: "hsl(142, 50%, 30%)",
};

interface PR {
  exercise_name: string;
  type: string;
  value: number;
}

export default function WorkoutCompleteScreen() {
  const { workoutId, prs: prsParam } =
    useLocalSearchParams<{ workoutId: string; prs: string }>();
  const router = useRouter();

  // Parse PRs from route params
  const prs = useMemo<PR[]>(() => {
    try {
      return prsParam ? JSON.parse(prsParam) : [];
    } catch {
      return [];
    }
  }, [prsParam]);

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

            {/* PR Callouts */}
            {prs.length > 0 && (
              <View style={{ marginTop: 20, gap: 10 }}>
                {prs.map((pr, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: colors.muted,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.greenBorder,
                      padding: 14,
                    }}
                  >
                    <Trophy size={22} color={colors.green} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.green,
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        Personal Record
                      </Text>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 15,
                          marginTop: 2,
                        }}
                      >
                        {pr.exercise_name} - {pr.type}: {pr.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

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
            onPress={() => router.replace("/(tabs)")}
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
