import React, { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import {
  useWorkoutExercises,
  useWorkoutSets,
  type WorkoutExerciseRow,
  type SetRow,
} from "@ironpulse/sync";
import { calculateVolume, formatElapsed } from "@/lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
};

interface WorkoutRow {
  id: string;
  name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: workoutRows } = useQuery<WorkoutRow>(
    "SELECT * FROM workouts WHERE id = ?",
    [id ?? ""]
  );
  const workout = workoutRows?.[0];

  const { data: exercises } = useWorkoutExercises(id);
  const { data: sets } = useWorkoutSets(id);

  const setsByExercise = useMemo(() => {
    const map = new Map<string, SetRow[]>();
    for (const set of sets ?? []) {
      const key = set.workout_exercise_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(set);
    }
    return map;
  }, [sets]);

  const totalVolume = useMemo(
    () => calculateVolume((sets ?? []) as any),
    [sets]
  );
  const duration = workout?.duration_seconds ?? 0;
  const workoutName = workout?.name ?? "Workout";

  if (!workout) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: workoutName }} />
      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 12 }}>
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

            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "700",
                marginTop: 24,
                marginBottom: 4,
              }}
            >
              Exercises
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ExerciseCard exercise={item} sets={setsByExercise.get(item.id) ?? []} />
        )}
      />
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  sets,
}: {
  exercise: WorkoutExerciseRow;
  sets: SetRow[];
}) {
  return (
    <View
      style={{
        backgroundColor: colors.muted,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.accent,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        {exercise.exercise_name}
      </Text>

      {/* Table header */}
      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        <Text style={{ color: colors.mutedFg, fontSize: 12, fontWeight: "600", width: 36 }}>
          SET
        </Text>
        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 12,
            fontWeight: "600",
            flex: 1,
            textAlign: "center",
          }}
        >
          KG
        </Text>
        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 12,
            fontWeight: "600",
            flex: 1,
            textAlign: "center",
          }}
        >
          REPS
        </Text>
        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 12,
            fontWeight: "600",
            width: 48,
            textAlign: "center",
          }}
        >
          RPE
        </Text>
      </View>

      {/* Set rows */}
      {sets.map((set) => (
        <View
          key={set.id}
          style={{
            flexDirection: "row",
            paddingVertical: 6,
            borderTopWidth: 1,
            borderTopColor: colors.accent,
          }}
        >
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              width: 36,
              fontVariant: ["tabular-nums"],
            }}
          >
            {set.set_number}
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              flex: 1,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {set.weight_kg ?? "-"}
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              flex: 1,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {set.reps ?? "-"}
          </Text>
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              width: 48,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {set.rpe ?? "-"}
          </Text>
        </View>
      ))}
    </View>
  );
}
