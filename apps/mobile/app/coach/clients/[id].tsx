import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Dumbbell, Activity, Trophy, MessageCircle } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

type ClientProgress = {
  workouts: Array<{
    id: string;
    name: string | null;
    startedAt: string;
    durationSeconds: number | null;
  }>;
  cardioSessions: Array<{
    id: string;
    type: string;
    startedAt: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
  }>;
  personalRecords: Array<{
    id: string;
    exercise: { name: string };
    weightKg: number;
    achievedAt: string;
  }>;
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [progress, setProgress] = useState<ClientProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!id) return;
    try {
      const result = await trpc.coach.clientProgress.query({ athleteId: id });
      setProgress(result as any);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Stack.Screen options={{ title: "Client Progress" }} />
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Client Progress" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Message button */}
        <Pressable
          onPress={() => router.push(`/messages/${id}`)}
          style={{
            backgroundColor: "#3b82f6",
            borderRadius: 10,
            paddingVertical: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <MessageCircle size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
            Message
          </Text>
        </Pressable>

        {/* Recent Workouts */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Recent Workouts
        </Text>
        {(progress?.workouts ?? []).length === 0 ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
              No workouts yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.workouts ?? []).slice(0, 5).map((w) => (
              <View
                key={w.id}
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Dumbbell size={18} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {w.name ?? "Workout"}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                    {new Date(w.startedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cardio Sessions */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Cardio Sessions
        </Text>
        {(progress?.cardioSessions ?? []).length === 0 ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
              No cardio sessions yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.cardioSessions ?? []).slice(0, 5).map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Activity size={18} color="#22c55e" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "600",
                      fontSize: 14,
                      textTransform: "capitalize",
                    }}
                  >
                    {c.type}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                    {new Date(c.startedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Personal Records */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Personal Records
        </Text>
        {(progress?.personalRecords ?? []).length === 0 ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
              No PRs yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.personalRecords ?? []).slice(0, 5).map((pr) => (
              <View
                key={pr.id}
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Trophy size={18} color="#eab308" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {pr.exercise.name}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                    {pr.weightKg} kg
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
