import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Dumbbell, Activity } from "lucide-react-native";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { MonthGrid } from "@/components/calendar/month-grid";
import { formatElapsed } from "@/lib/workout-utils";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  muted: theme.bg2,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
  primary: theme.green,
  success: theme.blue, // lime
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

export default function CalendarScreen() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();

  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    (workouts ?? []).forEach((w) => set.add(toDateStr(w.started_at)));
    return set;
  }, [workouts]);

  const cardioDays = useMemo(() => {
    const set = new Set<string>();
    (cardioSessions ?? []).forEach((c) => set.add(toDateStr(c.started_at)));
    return set;
  }, [cardioSessions]);

  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return (workouts ?? []).filter((w) => toDateStr(w.started_at) === selectedDate);
  }, [workouts, selectedDate]);

  const selectedCardio = useMemo(() => {
    if (!selectedDate) return [];
    return (cardioSessions ?? []).filter((c) => toDateStr(c.started_at) === selectedDate);
  }, [cardioSessions, selectedDate]);

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      {/* Title set via navigation options in App.tsx */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Month navigation */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Pressable onPress={goToPreviousMonth} hitSlop={12}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text
            style={{
              fontFamily: "ClashDisplay",
              fontWeight: "600",
              fontSize: 22,
              color: colors.foreground,
            }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <Pressable onPress={goToNextMonth} hitSlop={12}>
            <ChevronRight size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Month grid */}
        <MonthGrid
          year={currentYear}
          month={currentMonth}
          workoutDays={workoutDays}
          cardioDays={cardioDays}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 14, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.primary,
              }}
            />
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Workout</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.success,
              }}
            />
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Cardio</Text>
          </View>
        </View>

        {/* Selected date activities */}
        {selectedDate && (
          <View>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {selectedWorkouts.length === 0 && selectedCardio.length === 0 && (
              <Text style={{ color: colors.mutedFg, fontSize: 14 }}>No activity on this day.</Text>
            )}

            {selectedWorkouts.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => navigation.navigate("HistoryWorkoutDetail", { id: w.id })}
                style={{ marginBottom: 10 }}
              >
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${colors.primary}26`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Dumbbell size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}>
                      {w.name ?? "Workout"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                      {w.duration_seconds != null && (
                        <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                          {formatElapsed(w.duration_seconds)}
                        </Text>
                      )}
                      <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                        {w.exercise_count ?? 0} exercise{(w.exercise_count ?? 0) !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}

            {selectedCardio.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => navigation.navigate("HistoryCardioDetail", { id: c.id })}
                style={{ marginBottom: 10 }}
              >
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${colors.success}26`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Activity size={18} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "600",
                        fontSize: 15,
                        textTransform: "capitalize",
                      }}
                    >
                      {c.type}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                        {formatElapsed(c.duration_seconds)}
                      </Text>
                      {c.distance_meters != null && (
                        <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                          {(c.distance_meters / 1000).toFixed(2)} km
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
