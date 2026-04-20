import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Bell,
  Check,
  Dumbbell,
  Heart,
  MessageSquare,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import type { RootStackParamList } from "../../App";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
  primary: theme.green,
  error: theme.red,
};

type Notification = Awaited<
  ReturnType<typeof trpc.notification.list.query>
>["notifications"][number];

function iconFor(type: string) {
  switch (type) {
    case "follow": return UserPlus;
    case "reaction": return Heart;
    case "message": return MessageSquare;
    case "pr": return Trophy;
    case "workout_complete": return Dumbbell;
    case "goal_complete": return Target;
    case "achievement": return Trophy;
    case "coach_activity": return Users;
    default: return Bell;
  }
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

// Map server-side link paths to mobile screens
function navigateFromLinkPath(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  linkPath: string | null,
) {
  if (!linkPath) return;
  if (linkPath.startsWith("/messages/")) {
    const userId = linkPath.split("/")[2];
    if (userId) navigation.navigate("MessageThread", { userId });
    return;
  }
  if (linkPath.startsWith("/goals")) {
    navigation.navigate("Goals");
    return;
  }
  if (linkPath.startsWith("/stats")) {
    // No dedicated stats screen in nav — go to dashboard
    navigation.navigate("MainTabs");
    return;
  }
  if (linkPath.startsWith("/messages")) {
    navigation.navigate("Messages");
    return;
  }
  if (linkPath.startsWith("/feed")) {
    navigation.navigate("Feed");
    return;
  }
  if (linkPath.startsWith("/coach/clients/")) {
    const id = linkPath.split("/")[3];
    if (id) navigation.navigate("CoachClientDetail", { id });
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await trpc.notification.list.query({ limit: 50 });
      setNotifications(result.notifications);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleTap(n: Notification) {
    if (n.readAt == null) {
      try {
        await trpc.notification.markRead.mutate({ id: n.id });
      } catch {
        // ignore
      }
    }
    navigateFromLinkPath(navigation, n.linkPath);
  }

  async function handleMarkAllRead() {
    try {
      await trpc.notification.markAllRead.mutate();
      await load();
    } catch {
      Alert.alert("Error", "Failed to mark all as read");
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await trpc.notification.delete.mutate({ id });
      await load();
    } catch {
      Alert.alert("Error", "Failed to delete notification");
    } finally {
      setBusyId(null);
    }
  }

  const unreadCount = notifications.filter((n) => n.readAt == null).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      {unreadCount > 0 && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {unreadCount} unread
          </Text>
          <Pressable
            onPress={handleMarkAllRead}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Check size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
              Mark all read
            </Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.foreground} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <Bell size={40} color={colors.dimFg} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
            No notifications
          </Text>
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Interactions and achievements will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => {
            const Icon = iconFor(item.type);
            const isUnread = item.readAt == null;
            return (
              <Pressable
                onPress={() => handleTap(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isUnread ? colors.primary + "55" : colors.border,
                  backgroundColor: isUnread ? colors.primary + "11" : colors.card,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isUnread ? colors.primary + "33" : colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={16} color={isUnread ? colors.primary : colors.mutedFg} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        flex: 1,
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {isUnread && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.primary,
                        }}
                      />
                    )}
                  </View>
                  {item.body && (
                    <Text
                      style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  )}
                  <Text style={{ color: colors.dimFg, fontSize: 10, marginTop: 4 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  disabled={busyId === item.id}
                  hitSlop={8}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator size="small" color={colors.mutedFg} />
                  ) : (
                    <Trash2 size={14} color={colors.dimFg} />
                  )}
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
