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
import { Moon, Trash2 } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  borderSubtle: "#152035",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
  error: "#EF4444",
};

type SleepQuality = "poor" | "fair" | "good" | "excellent";

const QUALITY_OPTIONS: { value: SleepQuality; label: string; color: string }[] = [
  { value: "poor", label: "Poor", color: "#EF4444" },
  { value: "fair", label: "Fair", color: "#F59E0B" },
  { value: "good", label: "Good", color: "#3B82F6" },
  { value: "excellent", label: "Excellent", color: "#22C55E" },
];

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDurationMins(mins: number | null): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: Date | string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(iso: Date | string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

type SleepLogs = Awaited<ReturnType<typeof trpc.sleep.listSleep.query>>;

export default function SleepScreen() {
  const [logs, setLogs] = useState<SleepLogs["logs"]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [quality, setQuality] = useState<SleepQuality | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await trpc.sleep.listSleep.query({ days: 14 });
      setLogs(result.logs);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogSleep() {
    const today = todayDateStr();
    const parsedDate = new Date(today + "T00:00:00");
    if (isNaN(parsedDate.getTime())) return;

    setSaving(true);
    try {
      await trpc.sleep.logSleep.mutate({
        date: parsedDate,
        ...(bedtime !== "" && { bedtime: new Date(`${today}T${bedtime}`) }),
        ...(wakeTime !== "" && { wakeTime: new Date(`${today}T${wakeTime}`) }),
        ...(durationMins !== "" && { durationMins: parseInt(durationMins, 10) }),
        ...(quality !== "" && { quality }),
        source: "manual",
        ...(notes.trim() !== "" && { notes: notes.trim() }),
      });
      setBedtime("");
      setWakeTime("");
      setDurationMins("");
      setQuality("");
      setNotes("");
      await load();
    } catch {
      Alert.alert("Error", "Failed to log sleep. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await trpc.sleep.deleteSleep.mutate({ id });
      await load();
    } catch {
      Alert.alert("Error", "Failed to delete sleep log.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Log Sleep Form */}
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
              <Moon size={16} color={colors.mutedFg} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Log Sleep</Text>
            </View>

            {/* Bedtime + Wake time */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "Bedtime (HH:MM)", value: bedtime, setter: setBedtime, placeholder: "22:30" },
                { label: "Wake Time (HH:MM)", value: wakeTime, setter: setWakeTime, placeholder: "06:30" },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label} style={{ flex: 1, gap: 4 }}>
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
                    placeholder={placeholder}
                    placeholderTextColor={colors.dimFg}
                    value={value}
                    onChangeText={setter}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              ))}
            </View>

            {/* Duration */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.dimFg, fontSize: 10, fontWeight: "600", textTransform: "uppercase" }}>
                Duration (minutes)
              </Text>
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
                placeholder="e.g. 480 for 8 hours"
                placeholderTextColor={colors.dimFg}
                value={durationMins}
                onChangeText={setDurationMins}
                keyboardType="number-pad"
              />
            </View>

            {/* Quality picker */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.dimFg, fontSize: 10, fontWeight: "600", textTransform: "uppercase" }}>Quality</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {QUALITY_OPTIONS.map((q) => (
                  <Pressable
                    key={q.value}
                    onPress={() => setQuality((prev) => prev === q.value ? "" : q.value)}
                    style={{
                      flex: 1,
                      backgroundColor: quality === q.value ? q.color : colors.accent,
                      borderWidth: 1,
                      borderColor: quality === q.value ? q.color : colors.border,
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: quality === q.value ? "#fff" : colors.mutedFg, fontSize: 12, fontWeight: "500" }}>
                      {q.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
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
              placeholder="Notes (optional)"
              placeholderTextColor={colors.dimFg}
              value={notes}
              onChangeText={setNotes}
            />

            <Pressable
              onPress={handleLogSleep}
              disabled={saving}
              style={{
                backgroundColor: saving ? colors.muted : colors.primary,
                borderRadius: 8,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {saving ? "Saving…" : "Log Sleep"}
              </Text>
            </Pressable>
          </View>

          {/* Sleep History */}
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Recent Sleep</Text>

          {loading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : logs.length === 0 ? (
            <Text style={{ color: colors.mutedFg, textAlign: "center", paddingVertical: 24, fontSize: 14 }}>
              No sleep logs yet.
            </Text>
          ) : (
            logs.map((log) => {
              const qualityOption = QUALITY_OPTIONS.find((q) => q.value === log.quality);
              return (
                <View
                  key={log.id}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}>
                        {formatDate(log.date)}
                      </Text>
                      {qualityOption && (
                        <View style={{ backgroundColor: qualityOption.color + "22", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: qualityOption.color, fontSize: 11, fontWeight: "600" }}>
                            {qualityOption.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                        {formatDurationMins(log.durationMins)}
                      </Text>
                      {log.bedtime && (
                        <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                          {formatTime(log.bedtime)} → {log.wakeTime ? formatTime(log.wakeTime) : "?"}
                        </Text>
                      )}
                    </View>
                    {log.notes && (
                      <Text style={{ color: colors.dimFg, fontSize: 12, fontStyle: "italic" }}>{log.notes}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleDelete(log.id)}
                    disabled={deleting === log.id}
                    hitSlop={8}
                  >
                    {deleting === log.id ? (
                      <ActivityIndicator size="small" color={colors.mutedFg} />
                    ) : (
                      <Trash2 size={16} color={colors.dimFg} />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
