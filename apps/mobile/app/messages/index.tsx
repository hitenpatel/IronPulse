import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { MessageCircle, ChevronRight } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const result = await trpc.message.conversations.query();
      setConversations(result as Conversation[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
        <Stack.Screen options={{ title: "Messages" }} />
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Messages" }} />

      {conversations.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <MessageCircle size={40} color={colors.mutedFg} />
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 15,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            No messages yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partnerId}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/messages/${item.partnerId}`)}
            >
              <View
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
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
                      color: colors.foreground,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {item.partnerName?.charAt(0).toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "600",
                        fontSize: 15,
                      }}
                    >
                      {item.partnerName}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View
                        style={{
                          backgroundColor: "#3b82f6",
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          justifyContent: "center",
                          alignItems: "center",
                          paddingHorizontal: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}
                  >
                    {item.lastMessage}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.mutedFg} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
