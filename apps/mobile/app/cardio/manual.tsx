import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";

const colors = {
  bg: "hsl(224, 71%, 4%)",
  card: "hsl(216, 34%, 17%)",
  foreground: "hsl(213, 31%, 91%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(215, 20%, 65%)",
  border: "hsl(223, 47%, 11%)",
};

export default function ManualCardioScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const db = usePowerSync();
  const { user } = useAuth();
  const isMetric = user?.unitSystem !== "imperial";

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distance, setDistance] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [elevation, setElevation] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    try {
      const totalSeconds =
        (parseInt(hours || "0", 10) || 0) * 3600 +
        (parseInt(minutes || "0", 10) || 0) * 60 +
        (parseInt(seconds || "0", 10) || 0);

      const rawDistance = parseFloat(distance || "0") || 0;
      const distanceMeters = isMetric
        ? rawDistance * 1000
        : rawDistance * 1609.34;

      const sessionId = `cardio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();

      const elevationVal = elevation ? parseFloat(elevation) : null;
      const hrVal = avgHeartRate ? parseInt(avgHeartRate, 10) : null;
      const calVal = calories ? parseInt(calories, 10) : null;
      const notesVal = notes.trim() || null;

      await db.execute(
        `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, elevation_gain_m, avg_heart_rate, calories, notes, created_at)
         VALUES (?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          user!.id,
          type,
          now,
          totalSeconds,
          distanceMeters,
          elevationVal,
          hrVal,
          calVal,
          notesVal,
          now,
        ]
      );

      router.push({
        pathname: "/cardio/summary",
        params: { sessionId, type },
      });
    } catch (e) {
      console.error("Failed to save cardio session:", e);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: colors.foreground,
                textTransform: "capitalize",
              }}
            >
              Log {type}
            </Text>
            <Pressable onPress={() => router.back()}>
              <X size={24} color={colors.muted} />
            </Pressable>
          </View>

          {/* Duration */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.muted,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Duration
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            <DurationInput
              value={hours}
              onChangeText={setHours}
              placeholder="HH"
            />
            <Text style={{ color: colors.muted, fontSize: 18 }}>:</Text>
            <DurationInput
              value={minutes}
              onChangeText={setMinutes}
              placeholder="MM"
              testID="duration-minutes"
            />
            <Text style={{ color: colors.muted, fontSize: 18 }}>:</Text>
            <DurationInput
              value={seconds}
              onChangeText={setSeconds}
              placeholder="SS"
            />
          </View>

          {/* Distance */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.muted,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Distance ({isMetric ? "km" : "mi"})
          </Text>
          <TextInput
            testID="distance-input"
            style={{
              backgroundColor: colors.card,
              borderRadius: 10,
              padding: 14,
              fontSize: 18,
              color: colors.foreground,
              marginBottom: 24,
            }}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={colors.muted}
            value={distance}
            onChangeText={setDistance}
          />

          {/* More Details */}
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: showMore ? 16 : 32,
            }}
            onPress={() => setShowMore((prev) => !prev)}
          >
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "500" }}>
              More Details
            </Text>
            {showMore ? (
              <ChevronUp size={16} color={colors.muted} />
            ) : (
              <ChevronDown size={16} color={colors.muted} />
            )}
          </Pressable>

          {showMore && (
            <View style={{ gap: 16, marginBottom: 32 }}>
              <LabeledInput
                label="Elevation Gain (m)"
                value={elevation}
                onChangeText={setElevation}
                keyboardType="numeric"
              />
              <LabeledInput
                label="Avg Heart Rate (bpm)"
                value={avgHeartRate}
                onChangeText={setAvgHeartRate}
                keyboardType="numeric"
              />
              <LabeledInput
                label="Calories"
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.muted,
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Notes
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 15,
                    color: colors.foreground,
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  multiline
                  placeholder="Add notes..."
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          )}

          {/* Save Button */}
          <Pressable
            testID="save-cardio"
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              opacity: saving ? 0.6 : 1,
            }}
            onPress={handleSave}
            disabled={saving}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.bg,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DurationInput({
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      style={{
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 14,
        fontSize: 20,
        color: colors.foreground,
        textAlign: "center",
        width: 70,
      }}
      keyboardType="number-pad"
      maxLength={2}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "numeric" | "decimal-pad";
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.muted,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.card,
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          color: colors.foreground,
        }}
        keyboardType={keyboardType ?? "numeric"}
        placeholder="0"
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
