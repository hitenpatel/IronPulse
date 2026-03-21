import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Platform, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Flame } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  primary: "#0077FF",
  success: "#10B981",
  error: "#EF4444",
  streakOrange: "#FF6B2C",
  border: "#1E2B47",
  borderSubtle: "#152035",
  text: "#F0F4F8",
  textMuted: "#8899B4",
  textFaint: "#4E6180",
};

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBioAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBioEnabled(enabled);
        const label = await getBiometricLabel();
        setBioLabel(label);
      }
    }
    checkBiometric();
  }, []);

  async function handleBiometricToggle(value: boolean) {
    setBioLoading(true);
    if (value) {
      const success = await enableBiometric();
      setBioEnabled(success);
    } else {
      await disableBiometric();
      setBioEnabled(false);
    }
    setBioLoading(false);
  }

  const handleEditName = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Edit Name",
        "Enter your name",
        async (text) => {
          if (text?.trim()) {
            await trpc.user.updateProfile.mutate({ name: text.trim() });
            await updateUser({ name: text.trim() });
          }
        },
        "plain-text",
        user?.name,
      );
    } else {
      // Android fallback — Alert.prompt is iOS only
      Alert.alert("Edit Name", "Use the web app to update your name.");
    }
  };

  const handleUnitToggle = async (unit: "metric" | "imperial") => {
    if (unit === user?.unitSystem) return;
    await trpc.user.updateProfile.mutate({ unitSystem: unit });
    await updateUser({ unitSystem: unit });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        {/* Header */}
        <Text
          style={{
            fontFamily: "ClashDisplay",
            fontWeight: "600",
            fontSize: 28,
            color: colors.text,
            marginBottom: 24,
          }}
        >
          Profile
        </Text>

        {/* Avatar + name + tier badge + streak */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.accent,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12,
              borderWidth: 2,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 30 }}>
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: "ClashDisplay",
              fontWeight: "600",
              fontSize: 22,
              color: colors.text,
              marginBottom: 8,
            }}
          >
            {user?.name ?? "Athlete"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {/* Tier badge */}
            {user?.tier && (
              <View
                style={{
                  backgroundColor: "rgba(0, 119, 255, 0.15)",
                  borderRadius: 24,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {user.tier}
                </Text>
              </View>
            )}

            {/* Streak */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Flame size={16} color={colors.streakOrange} />
              <Text style={{ color: colors.streakOrange, fontSize: 13, fontWeight: "600" }}>
                0 day streak
              </Text>
            </View>
          </View>
        </View>

        {/* Profile info card */}
        <Card style={{ gap: 0, marginBottom: 8, padding: 0, overflow: "hidden" }}>
          <Pressable
            onPress={handleEditName}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              height: 48,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Name
              </Text>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {user?.name}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textFaint} />
          </Pressable>

          <View
            style={{
              paddingHorizontal: 16,
              height: 48,
              justifyContent: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: colors.textFaint,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Email
            </Text>
            <Text style={{ color: colors.text, fontSize: 15 }}>{user?.email}</Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text
              style={{
                fontSize: 10,
                color: colors.textFaint,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Units
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["metric", "imperial"] as const).map((unit) => {
                const isActive = user?.unitSystem === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => handleUnitToggle(unit)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: isActive ? colors.primary : colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        textTransform: "capitalize",
                        color: isActive ? "#fff" : colors.textMuted,
                      }}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Settings nav rows */}
        <View
          style={{
            marginBottom: 8,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {[
            { label: "Settings", screen: "Settings" as const },
            { label: "Connected Apps", screen: "SettingsIntegrations" as const },
            { label: "Subscription", screen: "SettingsSubscription" as const },
            { label: "Coaching", screen: "Coach" as const },
          ].map((item, idx, arr) => (
            <Pressable
              key={item.screen}
              onPress={() => navigation.navigate(item.screen as any)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                height: 48,
                borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderSubtle,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>
                {item.label}
              </Text>
              <ChevronRight size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>

        {/* Biometric security */}
        {bioAvailable && (
          <View
            style={{
              marginBottom: 8,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: colors.textFaint,
                textTransform: "uppercase",
                letterSpacing: 1,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              Security
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                height: 48,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16 }}>
                {bioLabel} Unlock
              </Text>
              <Switch
                value={bioEnabled}
                onValueChange={handleBiometricToggle}
                disabled={bioLoading}
                trackColor={{ false: colors.accent, true: colors.primary }}
              />
            </View>
          </View>
        )}

        {/* Export data */}
        <View
          style={{
            marginBottom: 24,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.textFaint,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Export Data
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Export your data on the web app at ironpulse.com/profile
          </Text>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={signOut}
          style={{
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.error, fontSize: 16, fontWeight: "600" }}>
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
