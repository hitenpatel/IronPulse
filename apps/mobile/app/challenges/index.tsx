import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View, ActivityIndicator } from "react-native";
// Navigation header set via App.tsx screen options
import { trpc } from "@/lib/trpc";
import { Trophy, Users } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

const TYPE_LABELS: Record<string, string> = {
  volume: "Volume",
  distance: "Distance",
  streak: "Streak",
};

type Challenge = {
  id: string;
  name: string;
  type: string;
  target: number;
  startsAt: string;
  endsAt: string;
  participantCount: number;
  joined: boolean;
};

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      const result = await trpc.challenge.list.query();
      setChallenges(result.challenges ?? []);
    } catch {
      // silently handle errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  async function handleJoin(challengeId: string) {
    setActionLoading(challengeId);
    try {
      await trpc.challenge.join.mutate({ challengeId });
      await fetchChallenges();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeave(challengeId: string) {
    setActionLoading(challengeId);
    try {
      await trpc.challenge.leave.mutate({ challengeId });
      await fetchChallenges();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.foreground} />
        </View>
      ) : challenges.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Trophy size={40} color={colors.mutedFg} />
          <Text style={{ color: colors.mutedFg, fontSize: 15, textAlign: "center", marginTop: 12 }}>
            No active challenges
          </Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.accent,
                padding: 16,
                gap: 10,
              }}
            >
              {/* Header row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.accent,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600" }}>
                        {TYPE_LABELS[item.type] ?? item.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 4 }}>
                    Ends{" "}
                    {new Date(item.endsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Users size={14} color={colors.mutedFg} />
                    <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
                      {item.participantCount}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => (item.joined ? handleLeave(item.id) : handleJoin(item.id))}
                    disabled={actionLoading === item.id}
                    style={{
                      backgroundColor: item.joined ? colors.accent : colors.primary,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      opacity: actionLoading === item.id ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: item.joined ? colors.foreground : colors.background,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {item.joined ? "Leave" : "Join"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
