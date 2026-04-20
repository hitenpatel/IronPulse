import React, { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import {
  useWorkoutExercises,
  useWorkoutSets,
  type WorkoutExerciseRow,
  type SetRow,
} from "@ironpulse/sync";
import { calculateVolume, formatElapsed } from "@/lib/workout-utils";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

interface WorkoutRow {
  id: string;
  name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
}

export default function WorkoutDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "HistoryWorkoutDetail">>();
  const id = route.params?.id;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.gutter }}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            {/* Stat pills row */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View
                style={{
                  backgroundColor: colors.bg2,
                  borderRadius: radii.chip,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.eyebrow.size,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: typography.eyebrow.letterSpacing,
                    marginBottom: 4,
                    fontFamily: fonts.bodySemi,
                  }}
                >
                  Duration
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.title.size,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                    fontFamily: fonts.displayBold,
                  }}
                >
                  {formatElapsed(duration)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.bg2,
                  borderRadius: radii.chip,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.eyebrow.size,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: typography.eyebrow.letterSpacing,
                    marginBottom: 4,
                    fontFamily: fonts.bodySemi,
                  }}
                >
                  Volume
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.title.size,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                    fontFamily: fonts.displayBold,
                  }}
                >
                  {totalVolume.toLocaleString()} kg
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: typography.title.size,
                lineHeight: typography.title.lineHeight,
                fontWeight: "700",
                fontFamily: fonts.displaySemi,
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
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: spacing.cardPaddingY,
        paddingHorizontal: spacing.cardPaddingX,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.body.size,
          fontFamily: fonts.bodySemi,
          fontWeight: "600",
          marginBottom: 12,
        }}
      >
        {exercise.exercise_name}
      </Text>

      {/* Table header */}
      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        <Text
          style={{
            color: colors.text4,
            fontSize: typography.eyebrow.size,
            fontWeight: "600",
            letterSpacing: typography.eyebrow.letterSpacing,
            fontFamily: fonts.bodySemi,
            width: 36,
          }}
        >
          SET
        </Text>
        <Text
          style={{
            color: colors.text4,
            fontSize: typography.eyebrow.size,
            fontWeight: "600",
            letterSpacing: typography.eyebrow.letterSpacing,
            fontFamily: fonts.bodySemi,
            flex: 1,
            textAlign: "center",
          }}
        >
          KG
        </Text>
        <Text
          style={{
            color: colors.text4,
            fontSize: typography.eyebrow.size,
            fontWeight: "600",
            letterSpacing: typography.eyebrow.letterSpacing,
            fontFamily: fonts.bodySemi,
            flex: 1,
            textAlign: "center",
          }}
        >
          REPS
        </Text>
        <Text
          style={{
            color: colors.text4,
            fontSize: typography.eyebrow.size,
            fontWeight: "600",
            letterSpacing: typography.eyebrow.letterSpacing,
            fontFamily: fonts.bodySemi,
            width: 48,
            textAlign: "center",
          }}
        >
          RPE
        </Text>
      </View>

      {/* Set rows */}
      {sets.map((set) => {
        const isPR = Boolean((set as { is_pr?: unknown }).is_pr);
        return (
          <View
            key={set.id}
            style={{
              flexDirection: "row",
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: colors.lineSoft,
              borderLeftWidth: isPR ? 2 : 0,
              borderLeftColor: isPR ? colors.amber : "transparent",
              paddingLeft: isPR ? 6 : 0,
            }}
          >
            <Text
              style={{
                color: isPR ? colors.amber : colors.text3,
                fontSize: typography.bodySmall.size,
                fontFamily: fonts.monoMedium,
                width: 36,
                fontVariant: ["tabular-nums"],
                fontWeight: isPR ? "700" : "400",
              }}
            >
              {set.set_number}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.bodySmall.size,
                fontFamily: fonts.monoMedium,
                flex: 1,
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              }}
            >
              {set.weight_kg ?? "-"}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.bodySmall.size,
                fontFamily: fonts.monoMedium,
                flex: 1,
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              }}
            >
              {set.reps ?? "-"}
            </Text>
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.bodySmall.size,
                fontFamily: fonts.monoMedium,
                width: 48,
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              }}
            >
              {set.rpe ?? "-"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
