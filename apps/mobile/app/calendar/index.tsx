import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Dumbbell, Activity } from "lucide-react-native";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { MonthGrid } from "@/components/calendar/month-grid";
import { formatElapsed } from "@/lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
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
  const router = useRouter();

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
      <Stack.Screen options={{ title: "Calendar" }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Month navigation */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Pressable onPress={goToPreviousMonth} hitSlop={12}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
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
        <View style={{ flexDirection: "row", gap: 16, marginTop: 12, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" }} />
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Workout</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
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
                fontWeight: "700",
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
                onPress={() => router.push(`/history/workout/${w.id}`)}
              >
                <View
                  style={{
                    backgroundColor: colors.muted,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Dumbbell size={20} color="#3b82f6" />
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
                onPress={() => router.push(`/history/cardio-detail/${c.id}`)}
              >
                <View
                  style={{
                    backgroundColor: colors.muted,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Activity size={20} color="#22c55e" />
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
