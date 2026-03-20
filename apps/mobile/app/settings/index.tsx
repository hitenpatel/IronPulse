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
import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  primary: "#0077FF",
  error: "#EF4444",
  border: "#1E2B47",
  borderSubtle: "#152035",
  text: "#F0F4F8",
  textMuted: "#8899B4",
  textFaint: "#4E6180",
};

const LABEL_STYLE = {
  fontSize: 10,
  color: colors.textFaint,
  textTransform: "uppercase" as const,
  fontWeight: "500" as const,
  letterSpacing: 1,
  marginBottom: 8,
};

export default function SettingsScreen() {
  const { user, updateUser } = useAuth();

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

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

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
        const Notifications = require("expo-notifications");
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === "granted");
      } catch {
        // expo-notifications unavailable in this environment
      }
    })();
  }, []);

  // Check deletion status from server on mount
  useEffect(() => {
    (async () => {
      try {
        const result = await trpc.user.me.query();
        setDeletionRequested(!!result.user.deletionRequestedAt);
      } catch {
        // network error — show stale state
      }
    })();
  }, []);

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

  async function handleNotificationToggle(value: boolean) {
    setNotifLoading(true);
    try {
      const Notifications = require("expo-notifications");
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotificationsEnabled(status === "granted");
        if (status !== "granted") {
          Alert.alert(
            "Notifications Blocked",
            "Enable notifications for IronPulse in your device Settings to receive workout reminders.",
          );
        }
      } else {
        // Can only direct user to settings — OS controls revoking permissions
        Alert.alert(
          "Disable Notifications",
          "To disable notifications, go to your device Settings and turn off notifications for IronPulse.",
        );
      }
    } catch {
      // expo-notifications unavailable
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
      <Stack.Screen options={{ title: "Settings" }} />

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
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
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
              <Text style={{ color: colors.text, fontSize: 16 }}>
                Workout Reminders
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
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
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
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
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
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
                    fontSize: 14,
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
