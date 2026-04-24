import { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  Switch,
  Platform,
  Pressable,
} from "react-native";
// Navigation header set via App.tsx screen options
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { registerForPushNotifications } from "@/lib/notifications";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  primary: theme.green, // cobalt v2
  error: theme.red,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  text: theme.text,
  textMuted: theme.text3,
  textFaint: theme.text4,
};

const LABEL_STYLE = {
  fontSize: 12,
  color: colors.textFaint,
  textTransform: "uppercase" as const,
  fontWeight: "500" as const,
  letterSpacing: 1.2,
  marginBottom: 12,
};

export default function SettingsScreen() {
  const { user, updateUser } = useAuth();
  const theme = useTheme();

  // Name
  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  // Unit system
  const [unitSaving, setUnitSaving] = useState(false);

  // Default rest seconds
  const [restSecondsText, setRestSecondsText] = useState(
    String(user?.defaultRestSeconds ?? 90),
  );
  const [restSaving, setRestSaving] = useState(false);

  // Warm-up preferences
  const [warmupEnabled, setWarmupEnabled] = useState(user?.warmupEnabled ?? true);
  const [warmupScheme, setWarmupScheme] = useState<
    "strength" | "hypertrophy" | "light"
  >(
    (user?.warmupScheme === "none" ? "strength" : user?.warmupScheme) ?? "strength",
  );
  const [warmupSaving, setWarmupSaving] = useState(false);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  // Weekly summary
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);
  const [weeklySummarySaving, setWeeklySummarySaving] = useState(false);

  // Account deletion
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionLoading, setDeletionLoading] = useState(false);

  // Sync name field if user object changes
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  // Load notification permission status
  useEffect(() => {
    (async () => {
      try {
        // Notification permissions stubbed — replace with @notifee/react-native
        setNotificationsEnabled(false);
      } catch {
        // notifications module unavailable
      }
    })();
  }, []);

  // Check deletion status + weekly summary preference from server on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await trpc.user.me.query();
        setDeletionRequested(!!result.user.deletionRequestedAt);
        if (result.user.weeklySummaryEnabled !== undefined) {
          setWeeklySummaryEnabled(result.user.weeklySummaryEnabled);
        }
        if (result.user.warmupEnabled !== undefined) {
          setWarmupEnabled(result.user.warmupEnabled);
        }
        if (
          result.user.warmupScheme &&
          result.user.warmupScheme !== "none"
        ) {
          setWarmupScheme(
            result.user.warmupScheme as "strength" | "hypertrophy" | "light",
          );
        }
      } catch {
        // network error — show stale state
      }
    })();
  }, []);

  async function handleWeeklySummaryToggle(value: boolean) {
    setWeeklySummarySaving(true);
    try {
      await trpc.user.updateProfile.mutate({ weeklySummaryEnabled: value });
      setWeeklySummaryEnabled(value);
    } catch {
      Alert.alert("Error", "Failed to update preference. Please try again.");
    } finally {
      setWeeklySummarySaving(false);
    }
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    setNameSaving(true);
    try {
      await trpc.user.updateProfile.mutate({ name: trimmed });
      await updateUser({ name: trimmed });
    } catch {
      Alert.alert("Error", "Failed to update name. Please try again.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleUnitToggle(unit: "metric" | "imperial") {
    if (unit === user?.unitSystem || unitSaving) return;
    setUnitSaving(true);
    try {
      await trpc.user.updateProfile.mutate({ unitSystem: unit });
      await updateUser({ unitSystem: unit });
    } catch {
      Alert.alert("Error", "Failed to update unit system. Please try again.");
    } finally {
      setUnitSaving(false);
    }
  }

  async function handleSaveRestTimer() {
    const seconds = parseInt(restSecondsText, 10);
    if (isNaN(seconds) || seconds < 15 || seconds > 600) {
      Alert.alert("Invalid Value", "Rest timer must be between 15 and 600 seconds.");
      return;
    }
    if (seconds === user?.defaultRestSeconds) return;
    setRestSaving(true);
    try {
      await trpc.user.updateProfile.mutate({ defaultRestSeconds: seconds });
      await updateUser({ defaultRestSeconds: seconds });
    } catch {
      Alert.alert("Error", "Failed to update rest timer. Please try again.");
    } finally {
      setRestSaving(false);
    }
  }

  async function handleWarmupToggle(value: boolean) {
    setWarmupSaving(true);
    try {
      await trpc.user.updateProfile.mutate({ warmupEnabled: value });
      await updateUser({ warmupEnabled: value });
      setWarmupEnabled(value);
    } catch {
      Alert.alert("Error", "Failed to update warm-up preference.");
    } finally {
      setWarmupSaving(false);
    }
  }

  async function handleWarmupSchemeChange(
    scheme: "strength" | "hypertrophy" | "light",
  ) {
    if (scheme === warmupScheme || warmupSaving) return;
    setWarmupSaving(true);
    try {
      await trpc.user.updateProfile.mutate({ warmupScheme: scheme });
      await updateUser({ warmupScheme: scheme });
      setWarmupScheme(scheme);
    } catch {
      Alert.alert("Error", "Failed to update warm-up scheme.");
    } finally {
      setWarmupSaving(false);
    }
  }

  async function handleNotificationToggle(value: boolean) {
    setNotifLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotifications();
        if (token) {
          await trpc.user.registerPushToken.mutate({
            token,
            platform: Platform.OS as "ios" | "android",
          });
          setNotificationsEnabled(true);
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            "Permission Denied",
            "Enable notifications in your device Settings for IronPulse.",
          );
        }
      } else {
        Alert.alert(
          "Disable Notifications",
          "To disable notifications, go to your device Settings and turn off notifications for IronPulse.",
        );
      }
    } catch {
      Alert.alert("Error", "Failed to enable notifications. Please try again.");
    } finally {
      setNotifLoading(false);
    }
  }

  function handleRequestDeletion() {
    Alert.alert(
      "Delete Account?",
      "Your account and all data will be permanently deleted after 7 days. You can cancel within that period.",
      [
        { text: "Keep My Account", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeletionLoading(true);
            try {
              await trpc.user.requestDeletion.mutate();
              setDeletionRequested(true);
              Alert.alert(
                "Deletion Requested",
                "Your account is scheduled for deletion in 7 days. Sign in again to cancel.",
              );
            } catch {
              Alert.alert("Error", "Failed to request account deletion. Please try again.");
            } finally {
              setDeletionLoading(false);
            }
          },
        },
      ],
    );
  }

  function handleCancelDeletion() {
    Alert.alert(
      "Cancel Deletion?",
      "This will cancel the pending account deletion and restore your account.",
      [
        { text: "Dismiss", style: "cancel" },
        {
          text: "Cancel Deletion",
          onPress: async () => {
            setDeletionLoading(true);
            try {
              await trpc.user.cancelDeletion.mutate();
              setDeletionRequested(false);
            } catch {
              Alert.alert("Error", "Failed to cancel deletion. Please try again.");
            } finally {
              setDeletionLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {/* Profile */}
        <Card style={{ gap: 16 }}>
          <Text style={LABEL_STYLE}>Profile</Text>

          <View style={{ gap: 8 }}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <Button
              variant="outline"
              onPress={handleSaveName}
              disabled={nameSaving || !name.trim() || name.trim() === user?.name}
            >
              {nameSaving ? "Saving…" : "Save Name"}
            </Button>
          </View>
        </Card>

        {/* Unit System */}
        <Card style={{ gap: 12 }}>
          <Text style={LABEL_STYLE}>Unit System</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["metric", "imperial"] as const).map((unit) => {
              const isActive = user?.unitSystem === unit;
              return (
                <Pressable
                  key={unit}
                  onPress={() => handleUnitToggle(unit)}
                  disabled={unitSaving}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: isActive ? colors.primary : colors.accent,
                    opacity: unitSaving ? 0.6 : 1,
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
        </Card>

        {/* Default Rest Timer */}
        <Card style={{ gap: 12 }}>
          <Text style={LABEL_STYLE}>Default Rest Timer</Text>
          <Input
            label="Duration (seconds)"
            value={restSecondsText}
            onChangeText={setRestSecondsText}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleSaveRestTimer}
          />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Between 15 and 600 seconds
          </Text>
          <Button
            variant="outline"
            onPress={handleSaveRestTimer}
            disabled={restSaving}
          >
            {restSaving ? "Saving…" : "Save Rest Timer"}
          </Button>
        </Card>

        {/* Warm-up Preferences */}
        <Card style={{ gap: 12 }}>
          <Text style={LABEL_STYLE}>Warm-up Sets</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.text, fontSize: 17 }}>
              Enable warm-up suggestions
            </Text>
            <Switch
              testID="warmup-enabled-switch"
              value={warmupEnabled}
              onValueChange={handleWarmupToggle}
              disabled={warmupSaving}
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Show a "+ warm-up" chip on exercise cards once you've entered a working
            weight.
          </Text>
          {warmupEnabled && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 4 }}>
                PREFERRED SCHEME
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["strength", "hypertrophy", "light"] as const).map((s) => {
                  const selected = warmupScheme === s;
                  return (
                    <Pressable
                      key={s}
                      testID={`warmup-pref-${s}`}
                      onPress={() => handleWarmupSchemeChange(s)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.card,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.background : colors.text,
                          fontSize: 13,
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </Card>

        {/* Appearance */}
        <Card style={{ gap: 12 }}>
          <Text style={LABEL_STYLE}>Appearance</Text>
          <Text style={{ color: colors.text, fontSize: 17 }}>Theme</Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginTop: -6,
              marginBottom: 4,
            }}
          >
            Currently: {theme.resolvedTheme}
            {theme.mode === "system" ? " (system)" : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["system", "dark", "light"] as ThemeMode[]).map((opt) => {
              const active = theme.mode === opt;
              return (
                <Pressable
                  key={opt}
                  accessibilityRole="button"
                  accessibilityLabel={`Theme: ${opt}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    void theme.setMode(opt);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#FFFFFF" : colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                      textTransform: "capitalize",
                    }}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Notifications */}
        <Card style={{ gap: 12 }}>
          <Text style={LABEL_STYLE}>Notifications</Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 17 }}>
                Workout Reminders
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                Receive push notifications for reminders and updates
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              disabled={notifLoading}
              trackColor={{
                false: colors.accent,
                true: colors.primary,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingTop: 12,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 17 }}>
                Weekly Summary
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                Get a weekly training summary via email and push
              </Text>
            </View>
            <Switch
              value={weeklySummaryEnabled}
              onValueChange={handleWeeklySummaryToggle}
              disabled={weeklySummarySaving}
              trackColor={{ false: colors.accent, true: colors.primary }}
            />
          </View>
        </Card>

        {/* Danger Zone */}
        <Card
          style={{
            gap: 12,
            borderColor: colors.error,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.error,
              textTransform: "uppercase",
              fontWeight: "500",
              letterSpacing: 1,
            }}
          >
            Danger Zone
          </Text>

          {deletionRequested ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>
                Your account is scheduled for deletion. All data will be
                permanently removed after 7 days.
              </Text>
              <Button
                variant="outline"
                onPress={handleCancelDeletion}
                disabled={deletionLoading}
              >
                {deletionLoading ? "Cancelling…" : "Cancel Deletion"}
              </Button>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>
                Permanently delete your account and all associated data.
              </Text>
              <Pressable
                onPress={handleRequestDeletion}
                disabled={deletionLoading}
                style={{
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  opacity: deletionLoading ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.error,
                  }}
                >
                  {deletionLoading ? "Requesting…" : "Delete Account"}
                </Text>
              </Pressable>
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  );
}
