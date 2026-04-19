import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Svg, { Rect } from "react-native-svg";
import { Moon, Plus, Trash2 } from "lucide-react-native";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { BigNum, Button, Chip, TopBar, UppercaseLabel } from "@/components/ui";

type SleepQuality = "poor" | "fair" | "good" | "excellent";

const QUALITY_OPTIONS: { value: SleepQuality; label: string; tone: "amber" | "green" | "blue" | "purple" }[] = [
  { value: "poor", label: "Poor", tone: "amber" },
  { value: "fair", label: "Fair", tone: "amber" },
  { value: "good", label: "Good", tone: "blue" },
  { value: "excellent", label: "Excellent", tone: "green" },
];

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function durationHm(mins: number | null | undefined): { h: number; m: number } {
  if (!mins) return { h: 0, m: 0 };
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

function formatTime(iso: Date | string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type SleepLogs = Awaited<ReturnType<typeof trpc.sleep.listSleep.query>>;

export default function SleepScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<SleepLogs["logs"]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [quality, setQuality] = useState<SleepQuality | "">("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await trpc.sleep.listSleep.query({ days: 14 });
      setLogs(result.logs);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogSleep() {
    const today = todayDateStr();
    const parsedDate = new Date(`${today}T00:00:00`);
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
      });
      setBedtime("");
      setWakeTime("");
      setDurationMins("");
      setQuality("");
      setFormOpen(false);
      await load();
    } catch {
      Alert.alert("Error", "Failed to log sleep.");
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

  const latest = logs[0];
  const latestHm = durationHm(latest?.durationMins ?? null);
  const latestQuality = QUALITY_OPTIONS.find((q) => q.value === latest?.quality);

  // 7-day bar chart — last 7 logs, oldest-left
  const chartData = useMemo(() => {
    return [...logs].slice(0, 7).reverse();
  }, [logs]);

  const maxDuration = Math.max(1, ...chartData.map((l) => l.durationMins ?? 0)) * 1.1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
          <TopBar
            title="Sleep"
            onBack={() => navigation.goBack()}
            right={
              <Pressable
                onPress={() => setFormOpen((v) => !v)}
                hitSlop={6}
                accessibilityLabel="Log sleep"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: formOpen ? colors.bg2 : colors.purple,
                  borderWidth: 1,
                  borderColor: formOpen ? colors.line : colors.purple,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus
                  size={16}
                  color={formOpen ? colors.text2 : colors.blueInk}
                  style={{ transform: [{ rotate: formOpen ? "45deg" : "0deg" }] }}
                />
              </Pressable>
            }
          />

          {/* Hero: most recent night */}
          <View
            style={{
              backgroundColor: colors.purpleSoft,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.purpleSoft,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <UppercaseLabel color={colors.purple}>Last night</UppercaseLabel>
              {latestQuality ? <Chip tone={latestQuality.tone}>{latestQuality.label}</Chip> : null}
            </View>
            {latest ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 10, gap: 4 }}>
                  <BigNum size={36}>{latestHm.h}</BigNum>
                  <Text style={{ fontSize: 14, color: colors.text3, fontFamily: fonts.bodyRegular }}>h</Text>
                  <BigNum size={36}>{latestHm.m}</BigNum>
                  <Text style={{ fontSize: 14, color: colors.text3, fontFamily: fonts.bodyRegular }}>m</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
                  <TimeStat label="Bedtime" value={formatTime(latest.bedtime)} />
                  <TimeStat label="Wake" value={formatTime(latest.wakeTime)} />
                </View>
              </>
            ) : (
              <Text style={{ color: colors.text3, marginTop: 10, fontSize: 13, fontFamily: fonts.bodyRegular }}>
                No sleep logged yet. Tap the + to log last night.
              </Text>
            )}
          </View>

          {/* 7-day chart */}
          {chartData.length > 0 ? (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <UppercaseLabel style={{ marginBottom: 10 }}>Last 7 days</UppercaseLabel>
              <Svg width="100%" height={70} viewBox="0 0 240 70" preserveAspectRatio="none">
                {chartData.map((l, i, arr) => {
                  const dur = l.durationMins ?? 0;
                  const bh = (dur / maxDuration) * 60;
                  const barW = (240 - 2 * (arr.length - 1)) / arr.length - 4;
                  const x = i * (barW + 4) + 2;
                  const y = 66 - bh;
                  const isLatest = i === arr.length - 1;
                  return (
                    <Rect
                      key={l.id}
                      x={x}
                      y={y}
                      width={barW}
                      height={bh}
                      rx={2}
                      fill={isLatest ? colors.purple : colors.bg3}
                    />
                  );
                })}
              </Svg>
            </View>
          ) : null}

          {/* Log form */}
          {formOpen ? (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                padding: 14,
                gap: 10,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Moon size={14} color={colors.purple} />
                <UppercaseLabel>Log sleep</UppercaseLabel>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <UppercaseLabel style={{ marginBottom: 6 }}>Bedtime</UppercaseLabel>
                  <TextInput
                    style={textInputStyle}
                    placeholder="22:30"
                    placeholderTextColor={colors.text4}
                    value={bedtime}
                    onChangeText={setBedtime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <UppercaseLabel style={{ marginBottom: 6 }}>Wake</UppercaseLabel>
                  <TextInput
                    style={textInputStyle}
                    placeholder="06:30"
                    placeholderTextColor={colors.text4}
                    value={wakeTime}
                    onChangeText={setWakeTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <View>
                <UppercaseLabel style={{ marginBottom: 6 }}>Duration (min)</UppercaseLabel>
                <TextInput
                  style={textInputStyle}
                  placeholder="480"
                  placeholderTextColor={colors.text4}
                  value={durationMins}
                  onChangeText={setDurationMins}
                  keyboardType="number-pad"
                />
              </View>

              <View>
                <UppercaseLabel style={{ marginBottom: 6 }}>Quality</UppercaseLabel>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {QUALITY_OPTIONS.map((q) => {
                    const active = quality === q.value;
                    return (
                      <Pressable
                        key={q.value}
                        onPress={() => setQuality(active ? "" : q.value)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: radii.buttonSm,
                          borderWidth: 1,
                          borderColor: active ? colors.purple : colors.line,
                          backgroundColor: active ? colors.purpleSoft : colors.bg2,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: active ? colors.purple : colors.text3,
                            fontFamily: fonts.bodyMedium,
                          }}
                        >
                          {q.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button variant="primary" onPress={handleLogSleep} disabled={saving}>
                {saving ? "Saving…" : "Log sleep"}
              </Button>
            </View>
          ) : null}

          {/* History */}
          {loading ? (
            <ActivityIndicator color={colors.text3} style={{ marginVertical: 20 }} />
          ) : logs.length === 0 ? null : (
            <View>
              <UppercaseLabel style={{ marginBottom: 6 }}>History</UppercaseLabel>
              {logs.map((l) => {
                const hm = durationHm(l.durationMins ?? null);
                const q = QUALITY_OPTIONS.find((x) => x.value === l.quality);
                return (
                  <View
                    key={l.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: colors.bg1,
                      borderWidth: 1,
                      borderColor: colors.lineSoft,
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: colors.purpleSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Moon size={14} color={colors.purple} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, color: colors.text, fontFamily: fonts.bodyMedium }}>
                        {new Date(l.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10.5,
                          color: colors.text3,
                          marginTop: 1,
                          fontFamily: fonts.monoRegular,
                        }}
                      >
                        {hm.h}h {hm.m}m · {formatTime(l.bedtime)} → {formatTime(l.wakeTime)}
                      </Text>
                    </View>
                    {q ? <Chip tone={q.tone}>{q.label}</Chip> : null}
                    <Pressable onPress={() => handleDelete(l.id)} disabled={deleting === l.id} hitSlop={6}>
                      {deleting === l.id ? (
                        <ActivityIndicator size="small" color={colors.text3} />
                      ) : (
                        <Trash2 size={14} color={colors.text4} />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TimeStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ fontSize: 9, color: colors.text4, fontFamily: fonts.monoRegular, letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 13, color: colors.text, fontFamily: fonts.monoMedium, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

const textInputStyle = {
  backgroundColor: colors.bg2,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radii.button,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.text,
  fontSize: 13,
  fontFamily: fonts.bodyRegular,
};
