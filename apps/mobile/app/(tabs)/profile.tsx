import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Platform, Switch, ScrollView, StyleSheet } from "react-native";
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

function NavSection({
  title,
  items,
  navigation,
  colors: c,
}: {
  title: string;
  items: { label: string; screen: string }[];
  navigation: any;
  colors: typeof colors;
}) {
  return (
    <View
      style={{
        marginBottom: 8,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: c.textFaint,
          textTransform: "uppercase",
          letterSpacing: 1,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 2,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      {items.map((item, idx) => (
        <Pressable
          key={item.screen}
          onPress={() => navigation.navigate(item.screen as any)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            height: 46,
            borderTopWidth: idx === 0 ? 0 : 1,
            borderTopColor: c.borderSubtle,
          }}
        >
          <Text style={{ color: c.text, fontSize: 15 }}>{item.label}</Text>
          <ChevronRight size={17} color={c.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [bioLoading, setBioLoading] = useState(false);

  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<string | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const result = await trpc.user.me.query();
        if (result.user.deletionRequestedAt) {
          setDeletionRequested(true);
          setDeletionRequestedAt(String(result.user.deletionRequestedAt));
        }
      } catch {
        // network error — show stale state
      }
    })();
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

        {/* Tracking nav rows */}
        <NavSection
          title="Tracking"
          items={[
            { label: "Goals", screen: "Goals" },
            { label: "Nutrition", screen: "Nutrition" },
            { label: "Sleep", screen: "Sleep" },
            { label: "Progress Photos", screen: "ProgressPhotos" },
            { label: "My Program", screen: "Program" },
          ]}
          navigation={navigation}
          colors={colors}
        />

        {/* App nav rows */}
        <NavSection
          title="App"
          items={[
            { label: "Settings", screen: "Settings" },
            { label: "Workout Templates", screen: "WorkoutTemplates" },
            { label: "Connected Apps", screen: "SettingsIntegrations" },
            { label: "Subscription", screen: "SettingsSubscription" },
            { label: "Coaching", screen: "Coach" },
            { label: "Find a Coach", screen: "Coaches" },
          ]}
          navigation={navigation}
          colors={colors}
        />

        {/* Data nav rows */}
        <NavSection
          title="Data"
          items={[
            { label: "Export Data", screen: "ExportData" },
            { label: "Import Workouts", screen: "ImportData" },
          ]}
          navigation={navigation}
          colors={colors}
        />

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

        {/* Security nav row */}
        <NavSection
          title="Security"
          items={[{ label: "Password & Passkeys", screen: "SecuritySettings" }]}
          navigation={navigation}
          colors={colors}
        />

        {/* Delete Account */}
        <View
          style={{
            marginBottom: 8,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.error,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.error,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
              fontWeight: "600",
            }}
          >
            Danger Zone
          </Text>
          {deletionRequested ? (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
                Your account is scheduled for deletion on{" "}
                {deletionRequestedAt
                  ? new Date(
                      new Date(deletionRequestedAt).getTime() + 7 * 24 * 60 * 60 * 1000,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "soon"}
                . All your data will be permanently removed.
              </Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Cancel Deletion",
                    "Keep your account and all your data?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes, keep my account",
                        onPress: async () => {
                          setDeletionLoading(true);
                          try {
                            await trpc.user.cancelDeletion.mutate();
                            setDeletionRequested(false);
                            setDeletionRequestedAt(null);
                          } catch {
                            Alert.alert("Error", "Failed to cancel deletion. Please try again.");
                          } finally {
                            setDeletionLoading(false);
                          }
                        },
                      },
                    ],
                  );
                }}
                disabled={deletionLoading}
                style={{
                  height: 40,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: deletionLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {deletionLoading ? "Cancelling..." : "Cancel Deletion"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
                Permanently delete your account and all associated data. You will have 7 days to cancel.
              </Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Delete Account",
                    "Are you sure? This will delete all your data after 7 days. You can cancel the deletion within that period.",
                    [
                      { text: "Keep my account", style: "cancel" },
                      {
                        text: "Yes, delete my account",
                        style: "destructive",
                        onPress: async () => {
                          setDeletionLoading(true);
                          try {
                            const result = await trpc.user.requestDeletion.mutate();
                            if (result.success) {
                              setDeletionRequested(true);
                              setDeletionRequestedAt(new Date().toISOString());
                            }
                          } catch {
                            Alert.alert("Error", "Failed to request deletion. Please try again.");
                          } finally {
                            setDeletionLoading(false);
                          }
                        },
                      },
                    ],
                  );
                }}
                disabled={deletionLoading}
                style={{
                  height: 40,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.error,
                  opacity: deletionLoading ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                  {deletionLoading ? "Requesting..." : "Delete My Account"}
                </Text>
              </Pressable>
            </>
          )}
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
