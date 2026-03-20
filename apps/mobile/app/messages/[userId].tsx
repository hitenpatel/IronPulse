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
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  primary: "#0077FF",
  border: "#1E2B47",
  text: "#F0F4F8",
  textMuted: "#8899B4",
  textFaint: "#4E6180",
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
        <ActivityIndicator color={colors.primary} />
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
                  backgroundColor: isOwn ? colors.primary : colors.card,
                  borderRadius: 12,
                  borderBottomRightRadius: isOwn ? 4 : 12,
                  borderBottomLeftRadius: isOwn ? 12 : 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    color: isOwn ? "#fff" : colors.text,
                    fontSize: 14,
                  }}
                >
                  {item.content}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.textFaint,
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
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          gap: 10,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textFaint}
          style={{
            flex: 1,
            backgroundColor: colors.accent,
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: colors.text,
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
            backgroundColor: text.trim() ? colors.primary : colors.accent,
            justifyContent: "center",
            alignItems: "center",
            opacity: sending ? 0.5 : 1,
          }}
        >
          <Send size={18} color={text.trim() ? "#fff" : colors.textFaint} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
