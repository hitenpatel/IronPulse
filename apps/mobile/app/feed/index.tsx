import React, { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View, ActivityIndicator } from "react-native";
// Navigation header set via App.tsx screen options
import { trpc } from "@/lib/trpc";
import { Dumbbell, Activity, Trophy, Heart, MessageCircle, Share2 } from "lucide-react-native";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  primary: theme.green, // cobalt v2
  success: theme.blue, // lime v2
  warning: theme.amber,
  error: theme.red,
  prGold: theme.amber,
  streakOrange: theme.orange,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  text: theme.text,
  textMuted: theme.text3,
  textFaint: theme.text4,
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
      return <Dumbbell size={20} color={colors.primary} />;
    case "cardio":
      return <Activity size={20} color={colors.success} />;
    case "pr":
      return <Trophy size={20} color={colors.prGold} />;
    default:
      return <Activity size={20} color={colors.textFaint} />;
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

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Text style={{ color: colors.textFaint, fontSize: 15, textAlign: "center" }}>
            No activity yet
          </Text>
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
            <Text
              style={{
                fontFamily: "ClashDisplay",
                fontWeight: "600",
                fontSize: 28,
                color: colors.text,
              }}
            >
              Feed
            </Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isPR = item.type === "pr";
              return (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    ...(isPR
                      ? {
                          borderTopWidth: 2,
                          borderTopColor: colors.prGold,
                        }
                      : {}),
                    padding: 16,
                  }}
                >
                  {/* Header row: avatar + name + timestamp */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.accent,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "700",
                          fontSize: 16,
                        }}
                      >
                        {item.user.name?.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                        {item.user.name ?? "Unknown"}
                      </Text>
                      <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 1 }}>
                        {timeAgo(new Date(item.createdAt))}
                      </Text>
                    </View>
                    <View style={{ marginTop: 2 }}>{getActivityIcon(item.type)}</View>
                  </View>

                  {/* Activity text */}
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                    {getActivityText(item.type)}
                  </Text>

                  {/* Reactions row */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.borderSubtle,
                    }}
                  >
                    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Heart size={14} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>0</Text>
                    </Pressable>
                    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MessageCircle size={14} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>0</Text>
                    </Pressable>
                    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Share2 size={14} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>0</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}
