import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../App";
import { trpc } from "@/lib/trpc";
import { Dumbbell, Activity, Trophy, MessageCircle } from "lucide-react-native";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  primary: theme.green,
  success: theme.blue, // lime
  prGold: theme.amber,
  border: theme.line,
  text: theme.text,
  textMuted: theme.text3,
  textFaint: theme.text4,
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
  const route = useRoute<RouteProp<RootStackParamList, "CoachClientDetail">>();
  const id = route.params?.id;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Client Progress" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Client avatar + name header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 24 }}>
              {id?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "ClashDisplay",
              fontWeight: "600",
              fontSize: 22,
              color: colors.text,
            }}
          >
            Client Detail
          </Text>
        </View>

        {/* Message button */}
        <Pressable
          onPress={() => navigation.navigate("MessageThread", { userId: id! })}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
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
            color: colors.text,
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
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.textFaint, fontSize: 13 }}>
              No workouts yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.workouts ?? []).slice(0, 5).map((w) => (
              <View
                key={w.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Dumbbell size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {w.name ?? "Workout"}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 2 }}>
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
            color: colors.text,
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
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.textFaint, fontSize: 13 }}>
              No cardio sessions yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.cardioSessions ?? []).slice(0, 5).map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Activity size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 14,
                      textTransform: "capitalize",
                    }}
                  >
                    {c.type}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 2 }}>
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
            color: colors.text,
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
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.textFaint, fontSize: 13 }}>
              No PRs yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {(progress?.personalRecords ?? []).slice(0, 5).map((pr) => (
              <View
                key={pr.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderTopColor: colors.prGold,
                  borderLeftColor: colors.border,
                  borderRightColor: colors.border,
                  borderBottomColor: colors.border,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Trophy size={18} color={colors.prGold} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {pr.exercise.name}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 2 }}>
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
