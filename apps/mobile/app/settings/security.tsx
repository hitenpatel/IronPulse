import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Fingerprint, KeyRound, Pencil, Trash2, Check, X } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

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
  success: theme.blue, // lime success in v2
};

const LABEL_STYLE = {
  fontSize: 10,
  color: colors.dimFg,
  textTransform: "uppercase" as const,
  fontWeight: "600" as const,
  letterSpacing: 0.8,
  marginBottom: 10,
};

type Passkey = { id: string; name: string | null; createdAt: Date | string };

export default function SecuritySettingsScreen() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadPasskeys = useCallback(async () => {
    try {
      const result = await trpc.passkey.list.query();
      setPasskeys(result.passkeys as Passkey[]);
    } catch {
      // keep stale
    } finally {
      setPasskeysLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPasskeys(); }, [loadPasskeys]));

  async function handleDeletePasskey(id: string) {
    Alert.alert(
      "Delete Passkey",
      "Are you sure you want to remove this passkey?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            try {
              await trpc.passkey.delete.mutate({ passkeyId: id });
              await loadPasskeys();
            } catch {
              Alert.alert("Error", "Failed to delete passkey.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  async function handleRenamePasskey(id: string) {
    setRenaming(true);
    try {
      await trpc.passkey.rename.mutate({ passkeyId: id, name: editName.trim() });
      setEditingId(null);
      setEditName("");
      await loadPasskeys();
    } catch {
      Alert.alert("Error", "Failed to rename passkey.");
    } finally {
      setRenaming(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters.");
      return;
    }

    setChangingPassword(true);
    setPasswordSuccess(false);
    try {
      await trpc.auth.changePassword.mutate({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to change password. Check your current password.");
    } finally {
      setChangingPassword(false);
    }
  }

  function formatDate(val: Date | string): string {
    return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Passkeys */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Fingerprint size={16} color={colors.mutedFg} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Passkeys</Text>
            </View>

            {passkeysLoading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : passkeys.length === 0 ? (
              <Text style={{ color: colors.mutedFg, fontSize: 13, textAlign: "center", paddingVertical: 12 }}>
                No passkeys registered.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {passkeys.map((pk, idx) => (
                  <View
                    key={pk.id}
                    style={{
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: colors.borderSubtle,
                      paddingTop: idx === 0 ? 0 : 8,
                    }}
                  >
                    {editingId === pk.id ? (
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: colors.accent,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 8,
                            height: 40,
                            paddingHorizontal: 10,
                            color: colors.foreground,
                            fontSize: 14,
                          }}
                          value={editName}
                          onChangeText={setEditName}
                          autoFocus
                          placeholder="Passkey name"
                          placeholderTextColor={colors.dimFg}
                        />
                        <Pressable onPress={() => handleRenamePasskey(pk.id)} disabled={renaming} hitSlop={8}>
                          <Check size={18} color={colors.success} />
                        </Pressable>
                        <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
                          <X size={18} color={colors.dimFg} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
                            {pk.name ?? "Unnamed passkey"}
                          </Text>
                          <Text style={{ color: colors.dimFg, fontSize: 12, marginTop: 2 }}>
                            Added {formatDate(pk.createdAt)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable
                            onPress={() => { setEditingId(pk.id); setEditName(pk.name ?? ""); }}
                            hitSlop={8}
                          >
                            <Pencil size={15} color={colors.mutedFg} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeletePasskey(pk.id)}
                            disabled={deletingId === pk.id}
                            hitSlop={8}
                          >
                            {deletingId === pk.id
                              ? <ActivityIndicator size="small" color={colors.mutedFg} />
                              : <Trash2 size={15} color={colors.dimFg} />
                            }
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View
              style={{
                marginTop: 14,
                backgroundColor: colors.accent,
                borderRadius: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.mutedFg, fontSize: 12, textAlign: "center" }}>
                To add new passkeys, visit the web app at Profile → Security.
              </Text>
            </View>
          </View>

          {/* Change Password */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <KeyRound size={16} color={colors.mutedFg} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Change Password</Text>
            </View>

            {[
              { label: "Current Password", value: currentPassword, setter: setCurrentPassword },
              { label: "New Password", value: newPassword, setter: setNewPassword },
              { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword },
            ].map(({ label, value, setter }) => (
              <View key={label} style={{ gap: 4 }}>
                <Text style={{ color: colors.dimFg, fontSize: 10, fontWeight: "600", textTransform: "uppercase" }}>{label}</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.accent,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    height: 44,
                    paddingHorizontal: 12,
                    color: colors.foreground,
                    fontSize: 15,
                  }}
                  value={value}
                  onChangeText={setter}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.dimFg}
                  placeholder="••••••••"
                />
              </View>
            ))}

            {passwordSuccess && (
              <View style={{ backgroundColor: "#14532D", borderRadius: 8, padding: 10 }}>
                <Text style={{ color: colors.success, fontSize: 13, textAlign: "center", fontWeight: "500" }}>
                  Password changed successfully.
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleChangePassword}
              disabled={changingPassword}
              style={{
                backgroundColor: changingPassword ? colors.muted : colors.primary,
                borderRadius: 8,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {changingPassword ? "Changing…" : "Change Password"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
