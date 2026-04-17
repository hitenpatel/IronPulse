import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Dumbbell, Target, Trophy } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import type { RootStackParamList } from "../../App";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  borderSubtle: "#152035",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
  gold: "#F59E0B",
  success: "#22C55E",
};

function formatWeight(kg: number): string {
  return kg % 1 === 0 ? `${kg}` : kg.toFixed(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PRCard({
  icon,
  value,
  label,
  gold,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  gold?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
      <Text
        style={{
          color: gold ? colors.gold : colors.foreground,
          fontSize: 20,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.mutedFg, fontSize: 11, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function Badge({ label, variant }: { label: string; variant?: "default" | "outline" | "gold" }) {
  const bg =
    variant === "gold"
      ? "#78350F"
      : variant === "outline"
        ? "transparent"
        : colors.accent;
  const border =
    variant === "gold" ? colors.gold : variant === "outline" ? colors.border : colors.border;
  const textColor =
    variant === "gold" ? colors.gold : variant === "outline" ? colors.mutedFg : colors.mutedFg;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 24,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 12,
          fontWeight: "500",
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type ExerciseDetailData = Awaited<ReturnType<typeof trpc.exercise.getDetail.query>>;

export default function ExerciseDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ExerciseDetail">>();
  const { id } = route.params;

  const [data, setData] = useState<ExerciseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    trpc.exercise.getDetail
      .query({ id })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}
        edges={["bottom"]}
      >
        <ActivityIndicator color={colors.foreground} size="large" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}
        edges={["bottom"]}
      >
        <Text style={{ color: colors.mutedFg, fontSize: 15 }}>Exercise not found.</Text>
      </SafeAreaView>
    );
  }

  const { exercise, personalRecords, recentSets } = data;

  const bestWeight = personalRecords.find((pr) => pr.type === "weight");
  const bestVolume = personalRecords.find((pr) => pr.type === "volume");
  const bestReps = personalRecords.find((pr) => pr.type === "reps");

  const visibleImages = exercise.imageUrls.filter((_, i) => !imageErrors.has(i));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Name + badges */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              fontFamily: "ClashDisplay",
              color: colors.foreground,
            }}
          >
            {exercise.name}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {exercise.category && <Badge label={exercise.category} />}
            {exercise.equipment && <Badge label={exercise.equipment} variant="outline" />}
            {exercise.isCustom && <Badge label="Custom" variant="gold" />}
          </View>
        </View>

        {/* Muscles */}
        {(exercise.primaryMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              gap: 12,
            }}
          >
            {exercise.primaryMuscles.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Target size={14} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                    Primary Muscles
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 22 }}>
                  {exercise.primaryMuscles.map((m) => (
                    <Badge key={m} label={m} />
                  ))}
                </View>
              </View>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Target size={14} color={colors.mutedFg} />
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                    Secondary Muscles
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 22 }}>
                  {exercise.secondaryMuscles.map((m) => (
                    <Badge key={m} label={m} variant="outline" />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        {exercise.instructions && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Instructions
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 14, lineHeight: 22 }}>
              {exercise.instructions}
            </Text>
          </View>
        )}

        {/* Personal Records */}
        {personalRecords.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              Personal Records
            </Text>

            {/* Summary cards */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PRCard
                icon={<Trophy size={18} color={colors.gold} />}
                value={bestWeight ? `${formatWeight(Number(bestWeight.value))} kg` : "—"}
                label="Best Weight"
                gold
              />
              <PRCard
                icon={<Dumbbell size={18} color={colors.gold} />}
                value={bestVolume ? `${formatWeight(Number(bestVolume.value))} kg` : "—"}
                label="Best Volume"
                gold
              />
              <PRCard
                icon={<Target size={18} color={colors.success} />}
                value={bestReps ? String(Number(bestReps.value)) : "—"}
                label="Best Reps"
              />
            </View>

            {/* PR History */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.mutedFg, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
                PR History
              </Text>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                }}
              >
                {personalRecords.map((pr, idx) => (
                  <View
                    key={pr.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: colors.borderSubtle,
                      borderLeftWidth: 2,
                      borderLeftColor: colors.gold,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Trophy size={13} color={colors.gold} />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 14,
                          textTransform: "capitalize",
                        }}
                      >
                        {pr.type}
                      </Text>
                      <View
                        style={{
                          backgroundColor: "#78350F",
                          borderRadius: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ color: colors.gold, fontSize: 10, fontWeight: "700" }}>PR</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "700" }}>
                        {formatWeight(Number(pr.value))}
                        {pr.type === "reps" ? "" : " kg"}
                      </Text>
                      <Text style={{ color: colors.dimFg, fontSize: 12 }}>
                        {formatDate(String(pr.achievedAt))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Recent Sets */}
        {recentSets.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              Recent Sets
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              {/* Header row */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: colors.accent,
                }}
              >
                <Text style={{ flex: 2, color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>Date</Text>
                <Text style={{ width: 40, color: colors.mutedFg, fontSize: 11, fontWeight: "600", textAlign: "center", textTransform: "uppercase" }}>Set</Text>
                <Text style={{ width: 64, color: colors.mutedFg, fontSize: 11, fontWeight: "600", textAlign: "right", textTransform: "uppercase" }}>Wt</Text>
                <Text style={{ width: 48, color: colors.mutedFg, fontSize: 11, fontWeight: "600", textAlign: "right", textTransform: "uppercase" }}>Reps</Text>
                <Text style={{ width: 40, color: colors.mutedFg, fontSize: 11, fontWeight: "600", textAlign: "right", textTransform: "uppercase" }}>RPE</Text>
              </View>
              {recentSets.map((set, idx) => {
                const workoutDate = set.workoutExercise?.workout?.startedAt
                  ? formatDate(String(set.workoutExercise.workout.startedAt))
                  : "—";
                return (
                  <View
                    key={set.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: colors.borderSubtle,
                    }}
                  >
                    <Text style={{ flex: 2, color: colors.mutedFg, fontSize: 13 }}>{workoutDate}</Text>
                    <Text style={{ width: 40, color: colors.foreground, fontSize: 13, textAlign: "center" }}>
                      #{set.setNumber}
                    </Text>
                    <Text style={{ width: 64, color: colors.foreground, fontSize: 13, textAlign: "right" }}>
                      {set.weightKg != null ? `${formatWeight(Number(set.weightKg))} kg` : "—"}
                    </Text>
                    <Text style={{ width: 48, color: colors.foreground, fontSize: 13, textAlign: "right" }}>
                      {set.reps ?? "—"}
                    </Text>
                    <Text style={{ width: 40, color: colors.foreground, fontSize: 13, textAlign: "right" }}>
                      {set.rpe != null ? Number(set.rpe) : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Images */}
        {visibleImages.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              Images
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {exercise.imageUrls.map((url, i) => {
                if (imageErrors.has(i)) return null;
                return (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={{
                      width: "47%",
                      aspectRatio: 1,
                      borderRadius: 10,
                      backgroundColor: colors.card,
                    }}
                    onError={() => setImageErrors((prev) => new Set([...prev, i]))}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Empty state */}
        {personalRecords.length === 0 && recentSets.length === 0 && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Dumbbell size={32} color={colors.dimFg} />
            <Text
              style={{
                color: colors.mutedFg,
                fontSize: 14,
                textAlign: "center",
                marginTop: 12,
                lineHeight: 20,
              }}
            >
              No history yet.{"\n"}Complete a workout with this exercise to see your stats.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
