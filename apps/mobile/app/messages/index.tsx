import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { trpc } from "@/lib/trpc";
import { MessageCircle, ChevronRight } from "lucide-react-native";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  primary: theme.green,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  text: theme.text,
  textMuted: theme.text3,
  textFaint: theme.text4,
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

        <ActivityIndicator color={colors.primary} />
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
          <MessageCircle size={40} color={colors.textFaint} />
          <Text
            style={{
              color: colors.textFaint,
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
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount > 0;
            return (
              <Pressable
                onPress={() => navigation.navigate("MessageThread", { userId: item.partnerId })}
              >
                <View
                  style={{
                    backgroundColor: hasUnread ? colors.accent : colors.background,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle,
                  }}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: colors.accent,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 18,
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
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "600",
                          fontSize: 15,
                        }}
                      >
                        {item.partnerName}
                      </Text>
                      {hasUnread && (
                        <View
                          style={{
                            backgroundColor: colors.primary,
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
                      style={{ color: colors.textMuted, fontSize: 13 }}
                    >
                      {item.lastMessage}
                    </Text>
                  </View>

                  <ChevronRight size={16} color={colors.textFaint} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
