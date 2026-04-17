import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, CheckCircle2, ClipboardList, Dumbbell, Moon, XCircle } from "lucide-react-native";
import { trpc } from "@/lib/trpc";
import type { RootStackParamList } from "../../App";

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
  success: "#22C55E",
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCurrentDayOfWeek(): string {
  const jsDay = new Date().getDay();
  return DAYS[jsDay === 0 ? 6 : jsDay - 1];
}

function getDayDate(startDate: Date, weekNum: number, dayIndex: number): Date {
  const weekOffset = (weekNum - 1) * 7;
  return new Date(startDate.getTime() + (weekOffset + dayIndex) * 24 * 60 * 60 * 1000);
}

type DayStatus = "done" | "missed" | "today" | "upcoming" | "rest" | "empty";
type Assignment = Awaited<ReturnType<typeof trpc.program.myAssignment.query>>;

export default function ProgramScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [startingWorkout, setStartingWorkout] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await trpc.program.myAssignment.query();
      setData(result);
      if (result) setSelectedWeek(result.currentWeek);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleStartWorkout(templateId: string) {
    setStartingWorkout(templateId);
    try {
      const result = await trpc.workout.create.mutate({ templateId });
      navigation.navigate("WorkoutActive", { workoutId: result.workout.id });
    } catch {
      // silently fail — user can start manually
    } finally {
      setStartingWorkout(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }} edges={["bottom"]}>
        <ActivityIndicator color={colors.foreground} size="large" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
          <ClipboardList size={48} color={colors.dimFg} />
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700", textAlign: "center" }}>
            No Program Assigned
          </Text>
          <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            You don't have an assigned training program yet.{"\n"}Ask your coach to assign one, or browse coaches.
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Coaches")}
            style={{
              backgroundColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>Find a Coach</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { program, coach, currentWeek, completedDays, adherencePct, startedAt } = data;
  const schedule = program.schedule as Record<string, Record<string, { templateId?: string; templateName?: string; isRestDay?: boolean } | undefined>>;
  const today = getCurrentDayOfWeek();
  const programStartDate = new Date(startedAt);
  const now = new Date();

  function getDayStatus(weekNum: number, day: string, dayIdx: number, cell: { templateId?: string; isRestDay?: boolean } | undefined): DayStatus {
    if (!cell) return "empty";
    if (cell.isRestDay) return "rest";
    if (!cell.templateId) return "empty";

    const weekKey = String(weekNum);
    const isDone = (completedDays as Record<string, string[]>)?.[weekKey]?.includes(day) ?? false;
    if (isDone) return "done";

    const dayDate = getDayDate(programStartDate, weekNum, dayIdx);
    const isCurrentWeek = weekNum === currentWeek;
    const isToday = isCurrentWeek && day === today;
    if (isToday) return "today";

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMidnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    if (dayMidnight < todayMidnight) return "missed";

    return "upcoming";
  }

  const weekSchedule = schedule[String(selectedWeek)] ?? {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Program header */}
        <View>
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "700", fontFamily: "ClashDisplay" }}>
            {program.name}
          </Text>
          {coach.name && (
            <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 4 }}>Coach: {coach.name}</Text>
          )}
          {program.description && (
            <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
              {program.description}
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: "center" }}>
            <Calendar size={16} color={colors.mutedFg} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {program.durationWeeks}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 11 }}>weeks</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + "44", padding: 12, alignItems: "center" }}>
            <Dumbbell size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {currentWeek}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 11 }}>current week</Text>
          </View>
          {adherencePct !== undefined && (
            <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: "center" }}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 18, fontWeight: "700", marginTop: 4 }}>
                {adherencePct}%
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 11 }}>adherence</Text>
            </View>
          )}
        </View>

        {/* Week selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {Array.from({ length: program.durationWeeks }, (_, i) => i + 1).map((week) => (
            <Pressable
              key={week}
              onPress={() => setSelectedWeek(week)}
              style={{
                backgroundColor: selectedWeek === week ? colors.primary : colors.accent,
                borderWidth: 1,
                borderColor: selectedWeek === week ? colors.primary : colors.border,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: selectedWeek === week ? "#fff" : colors.mutedFg, fontSize: 13, fontWeight: "500" }}>
                W{week}
                {week === currentWeek && " •"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Schedule for selected week */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: selectedWeek === currentWeek ? colors.primary : colors.border,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Week {selectedWeek}
              {selectedWeek === currentWeek && (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "400" }}> · Current</Text>
              )}
            </Text>
          </View>

          {DAYS.map((day, dayIdx) => {
            const cell = weekSchedule[day];
            const status = getDayStatus(selectedWeek, day, dayIdx, cell);
            const isToday = status === "today";

            const rowBg =
              status === "done" ? "#14532D22" :
              status === "missed" ? "#7F1D1D22" :
              isToday ? colors.primary + "11" :
              "transparent";

            const borderColor =
              status === "done" ? "#22C55E44" :
              status === "missed" ? "#EF444444" :
              isToday ? colors.primary + "44" :
              colors.borderSubtle;

            return (
              <View
                key={day}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: dayIdx === 0 ? 0 : 1,
                  borderTopColor: borderColor,
                  backgroundColor: rowBg,
                }}
              >
                {/* Day label */}
                <Text
                  style={{
                    width: 36,
                    color: isToday ? colors.primary : status === "done" ? colors.success : status === "missed" ? colors.error : colors.mutedFg,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {DAY_LABELS[dayIdx]}
                </Text>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  {status === "rest" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Moon size={13} color={colors.dimFg} />
                      <Text style={{ color: colors.dimFg, fontSize: 14 }}>Rest Day</Text>
                    </View>
                  ) : cell?.templateName ? (
                    <Text style={{
                      color: status === "missed" ? colors.dimFg : colors.foreground,
                      fontSize: 14,
                      fontWeight: "500",
                      textDecorationLine: status === "missed" ? "line-through" : "none",
                    }}>
                      {cell.templateName}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.dimFg, fontSize: 14 }}>—</Text>
                  )}
                </View>

                {/* Status icon + start button */}
                {status === "done" && <CheckCircle2 size={16} color={colors.success} />}
                {status === "missed" && <XCircle size={16} color={colors.error + "99"} />}
                {(status === "today" || (status === "upcoming" && selectedWeek === currentWeek)) && cell?.templateId && (
                  <Pressable
                    onPress={() => handleStartWorkout(cell.templateId!)}
                    disabled={!!startingWorkout}
                    style={{
                      backgroundColor: isToday ? colors.primary : "transparent",
                      borderWidth: 1,
                      borderColor: isToday ? colors.primary : colors.border,
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    {startingWorkout === cell.templateId ? (
                      <ActivityIndicator size="small" color={isToday ? "#fff" : colors.mutedFg} />
                    ) : (
                      <Text style={{ color: isToday ? "#fff" : colors.mutedFg, fontSize: 12, fontWeight: "600" }}>
                        Start
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
