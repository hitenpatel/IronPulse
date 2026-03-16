import React, { useEffect, useState } from "react";
import { FlatList, Text, View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Dumbbell, Activity, Trophy } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

type FeedItem = {
  id: string;
  type: string;
  createdAt: string;
  user: { name: string | null };
};

function getActivityIcon(type: string) {
  switch (type) {
    case "workout":
      return <Dumbbell size={20} color="#3b82f6" />;
    case "cardio":
      return <Activity size={20} color="#22c55e" />;
    case "pr":
      return <Trophy size={20} color="#eab308" />;
    default:
      return <Activity size={20} color={colors.mutedFg} />;
  }
}

function getActivityText(type: string): string {
  switch (type) {
    case "workout":
      return "completed a workout";
    case "cardio":
      return "finished a cardio session";
    case "pr":
      return "set a new personal record!";
    default:
      return "logged an activity";
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedScreen() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await trpc.social.feed.query({ limit: 20 });
        if (!cancelled) {
          setItems(result.data ?? []);
        }
      } catch {
        // silently handle errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Feed" }} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.foreground} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Text style={{ color: colors.mutedFg, fontSize: 15, textAlign: "center" }}>
            No activity yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.accent,
                padding: 14,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ marginTop: 2 }}>{getActivityIcon(item.type)}</View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14 }}>
                  <Text style={{ fontWeight: "600" }}>
                    {item.user.name ?? "Unknown"}
                  </Text>{" "}
                  <Text style={{ color: colors.mutedFg }}>
                    {getActivityText(item.type)}
                  </Text>
                </Text>
                <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 4 }}>
                  {timeAgo(new Date(item.createdAt))}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
