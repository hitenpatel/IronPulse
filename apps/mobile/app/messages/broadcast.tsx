import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { trpc } from "@/lib/trpc";
import { Send } from "lucide-react-native";
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

type Client = {
  athleteId: string;
  athleteName: string | null;
};

export default function BroadcastMessageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const result = await trpc.coach.clients.query();
      setClients(result as Client[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleSend = async () => {
    const ids = Array.from(selected);
    const trimmed = content.trim();
    if (ids.length === 0 || !trimmed || sending) return;

    setSending(true);
    try {
      await trpc.message.sendBulk.mutate({ athleteIds: ids, content: trimmed });
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to send broadcast. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const canSend = selected.size > 0 && content.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Athlete selector */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
          SELECT RECIPIENTS ({selected.size} selected)
        </Text>
      </View>

      {clients.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textFaint, fontSize: 14 }}>No assigned athletes.</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.athleteId}
          style={{ maxHeight: 240 }}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.athleteId);
            return (
              <Pressable onPress={() => toggle(item.athleteId)}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle,
                    backgroundColor: isSelected ? colors.accent : colors.background,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {isSelected && (
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ color: colors.text, fontSize: 15 }}>
                    {item.athleteName ?? "Unknown"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Message composer */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>MESSAGE</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Type your broadcast message…"
          placeholderTextColor={colors.textFaint}
          multiline
          style={{
            flex: 1,
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.text,
            fontSize: 14,
            textAlignVertical: "top",
          }}
        />
      </View>

      {/* Send bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13 }}>
          {selected.size === 0
            ? "Select at least one athlete"
            : `Sending to ${selected.size} athlete${selected.size !== 1 ? "s" : ""}`}
        </Text>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: canSend ? colors.primary : colors.accent,
            opacity: sending ? 0.5 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send size={16} color={canSend ? "#fff" : colors.textFaint} />
          )}
          <Text style={{ color: canSend ? "#fff" : colors.textFaint, fontWeight: "600", fontSize: 14 }}>
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
