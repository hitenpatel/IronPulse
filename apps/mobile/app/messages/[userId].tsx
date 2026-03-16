import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export default function MessageThreadScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await trpc.message.history.query({
        partnerId: userId,
        limit: 50,
      });
      setMessages((result.messages as Message[]).reverse());
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark read on open
  useEffect(() => {
    if (!userId) return;
    trpc.message.markRead.mutate({ partnerId: userId }).catch(() => {});
  }, [userId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !userId || sending) return;

    setSending(true);
    try {
      await trpc.message.send.mutate({
        receiverId: userId,
        content: trimmed,
      });
      setText("");
      await fetchMessages();
    } catch {
      // silently handle
    } finally {
      setSending(false);
    }
  };

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
        <Stack.Screen options={{ title: "Chat" }} />
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: "Chat" }} />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          const isOwn = item.senderId === user?.id;
          return (
            <View
              style={{
                alignSelf: isOwn ? "flex-end" : "flex-start",
                maxWidth: "80%",
              }}
            >
              <View
                style={{
                  backgroundColor: isOwn ? "#3b82f6" : colors.accent,
                  borderRadius: 16,
                  borderBottomRightRadius: isOwn ? 4 : 16,
                  borderBottomLeftRadius: isOwn ? 16 : 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    color: isOwn ? "#fff" : colors.foreground,
                    fontSize: 14,
                  }}
                >
                  {item.content}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.mutedFg,
                  fontSize: 10,
                  marginTop: 4,
                  alignSelf: isOwn ? "flex-end" : "flex-start",
                }}
              >
                {new Date(item.createdAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: colors.accent,
          backgroundColor: colors.muted,
          gap: 10,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedFg}
          style={{
            flex: 1,
            backgroundColor: colors.accent,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: colors.foreground,
            fontSize: 14,
          }}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !text.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: text.trim() ? "#3b82f6" : colors.accent,
            justifyContent: "center",
            alignItems: "center",
            opacity: sending ? 0.5 : 1,
          }}
        >
          <Send size={18} color={text.trim() ? "#fff" : colors.mutedFg} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
