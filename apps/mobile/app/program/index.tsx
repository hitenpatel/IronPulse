import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, ChevronRight, ClipboardList, Moon } from "lucide-react-native";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing, tracking } from "@/lib/theme";
import { BigNum, Button, Chip, TopBar, UppercaseLabel } from "@/components/ui";
import type { RootStackParamList } from "../../App";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCurrentDayOfWeek(): string {
  const jsDay = new Date().getDay();
  return DAYS[jsDay === 0 ? 6 : jsDay - 1]!;
}

function getDayDate(startDate: Date, weekNum: number, dayIndex: number): Date {
  const weekOffset = (weekNum - 1) * 7;
  return new Date(startDate.getTime() + (weekOffset + dayIndex) * 86400000);
}

type DayStatus = "done" | "missed" | "today" | "upcoming" | "rest" | "empty";
type Assignment = Awaited<ReturnType<typeof trpc.program.myAssignment.query>>;

const WORKOUT_COLORS = [colors.blue2, colors.green, colors.purple, colors.amber];

function colorForTemplate(name?: string): string {
  if (!name) return colors.text4;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return WORKOUT_COLORS[h % WORKOUT_COLORS.length]!;
}

export default function ProgramScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [data, setData] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [startingWorkout, setStartingWorkout] = useState<string | null>(null);

  // Pulse animation for today's rail node
  const pulse = useMemo(() => new Animated.Value(0), []);
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const load = useCallback(async () => {
    try {
      const result = await trpc.program.myAssignment.query();
      setData(result);
      if (result) setSelectedWeek(result.currentWeek);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleStartWorkout = async (templateId: string) => {
    setStartingWorkout(templateId);
    try {
      const result = await trpc.workout.create.mutate({ templateId });
      navigation.navigate("WorkoutActive", { workoutId: result.workout.id });
    } catch {
      /* silent */
    } finally {
      setStartingWorkout(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text3} size="large" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
        <View style={{ paddingHorizontal: spacing.gutter }}>
          <TopBar title="My program" onBack={() => navigation.goBack()} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 }}>
          <ClipboardList size={36} color={colors.text4} />
          <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.displaySemi, letterSpacing: -0.3 }}>
            No program assigned
          </Text>
          <Text style={{ color: colors.text3, textAlign: "center", fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 18 }}>
            Ask your coach to assign one, or browse available coaches.
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button variant="primary" onPress={() => navigation.navigate("Coaches")}>
              Find a coach
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { program, coach, currentWeek, completedDays, adherencePct, startedAt } = data;
  const schedule = program.schedule as Record<
    string,
    Record<string, { templateId?: string; templateName?: string; isRestDay?: boolean } | undefined>
  >;
  const today = getCurrentDayOfWeek();
  const programStart = new Date(startedAt);
  const now = new Date();

  function getDayStatus(
    weekNum: number,
    day: string,
    dayIdx: number,
    cell: { templateId?: string; isRestDay?: boolean } | undefined,
  ): DayStatus {
    if (!cell) return "empty";
    if (cell.isRestDay) return "rest";
    if (!cell.templateId) return "empty";
    const weekKey = String(weekNum);
    const isDone = (completedDays as Record<string, string[]>)?.[weekKey]?.includes(day) ?? false;
    if (isDone) return "done";
    const dayDate = getDayDate(programStart, weekNum, dayIdx);
    const isCurrentWeek = weekNum === currentWeek;
    const isToday = isCurrentWeek && day === today;
    if (isToday) return "today";
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMidnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    if (dayMidnight < todayMidnight) return "missed";
    return "upcoming";
  }

  const weekSchedule = schedule[String(selectedWeek)] ?? {};
  const weekStart = getDayDate(programStart, selectedWeek, 0);
  const weekEnd = getDayDate(programStart, selectedWeek, 6);
  const weekRange =
    weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" }) +
    "–" +
    weekEnd.toLocaleDateString("en-GB", { day: "numeric" });

  const workoutDays = DAYS.filter((d) => {
    const c = weekSchedule[d];
    return c && !c.isRestDay && c.templateId;
  });
  const doneThisWeek = workoutDays.filter((d) =>
    (completedDays as Record<string, string[]>)?.[String(selectedWeek)]?.includes(d),
  ).length;
  const totalThisWeek = workoutDays.length;

  const overallPct = Math.round(((currentWeek - 1) / program.durationWeeks) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
        <TopBar title="My program" onBack={() => navigation.goBack()} />

        {/* Program hero card */}
        <View
          style={{
            backgroundColor: colors.bg1,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Chip tone="blue" dot>
                  Active
                </Chip>
                <Text style={{ fontSize: 10, color: colors.text3, fontFamily: fonts.monoRegular }}>
                  {program.durationWeeks}-week · {coach.name ?? "Self-coached"}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: fonts.displaySemi,
                  fontSize: 20,
                  color: colors.text,
                  letterSpacing: -0.4,
                  marginTop: 4,
                }}
              >
                {program.name}
              </Text>
              <Text
                style={{
                  fontSize: 11.5,
                  color: colors.text3,
                  marginTop: 2,
                  fontFamily: fonts.bodyRegular,
                }}
              >
                Week {currentWeek} of {program.durationWeeks}
                {adherencePct !== undefined ? ` · ${adherencePct}% adherence` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <BigNum size={22}>{overallPct}</BigNum>
              <Text style={{ fontSize: 10, color: colors.text3, fontFamily: fonts.monoRegular }}>
                % done
              </Text>
            </View>
          </View>

          {/* Program progress bar */}
          <View
            style={{
              flexDirection: "row",
              gap: 3,
              marginTop: 12,
            }}
          >
            {Array.from({ length: program.durationWeeks }).map((_, i) => {
              const active = i < currentWeek;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: active ? colors.blue : colors.bg3,
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* Week selector */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Pressable
            onPress={() => setSelectedWeek((w) => Math.max(1, w - 1))}
            hitSlop={6}
            disabled={selectedWeek === 1}
            style={{ opacity: selectedWeek === 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={18} color={colors.text2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UppercaseLabel>This week · {weekRange}</UppercaseLabel>
          </View>
          <Text style={{ fontSize: 11, color: colors.text3, fontFamily: fonts.monoRegular }}>
            {doneThisWeek}/{totalThisWeek} done
          </Text>
          <Pressable
            onPress={() => setSelectedWeek((w) => Math.min(program.durationWeeks, w + 1))}
            hitSlop={6}
            disabled={selectedWeek === program.durationWeeks}
            style={{ opacity: selectedWeek === program.durationWeeks ? 0.3 : 1 }}
          >
            <ChevronRight size={18} color={colors.text2} />
          </Pressable>
        </View>

        {/* Timeline rail */}
        <View style={{ position: "relative", paddingLeft: 40, marginTop: 6 }}>
          {/* Vertical rail at left:16, full column height minus small top/bottom bleed */}
          <View
            style={{
              position: "absolute",
              left: 16,
              top: 12,
              bottom: 12,
              width: 2,
              backgroundColor: colors.line,
              opacity: 0.6,
            }}
          />

          {DAYS.map((day, dayIdx) => {
            const cell = weekSchedule[day];
            const status = getDayStatus(selectedWeek, day, dayIdx, cell);
            const isToday = status === "today";
            const isDone = status === "done";
            const isMissed = status === "missed";
            const isRest = status === "rest";

            const nodeColor =
              isToday
                ? colors.blue
                : isDone
                  ? colors.green
                  : isRest
                    ? colors.line2
                    : isMissed
                      ? colors.red
                      : colorForTemplate(cell?.templateName);

            const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });

            return (
              <View
                key={day}
                style={{
                  position: "relative",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 6,
                  borderRadius: radii.card,
                  backgroundColor: isToday ? colors.blueSoft : colors.bg1,
                  borderWidth: 1,
                  borderColor: isToday ? colors.blueSoft : colors.lineSoft,
                  opacity: isRest ? 0.6 : 1,
                }}
              >
                {/* Rail node */}
                <View
                  style={{
                    position: "absolute",
                    left: -32,
                    top: "50%",
                    marginTop: -8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: nodeColor,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(isDone || isToday) ? (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: nodeColor,
                      }}
                    />
                  ) : null}
                </View>

                {/* Pulse ring on today */}
                {isToday ? (
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: -36,
                      top: "50%",
                      marginTop: -12,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.blue,
                      opacity: pulseOpacity,
                    }}
                    pointerEvents="none"
                  />
                ) : null}

                {/* Day label */}
                <View style={{ width: 38 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isToday ? colors.blue2 : colors.text3,
                      fontFamily: fonts.monoSemi,
                      letterSpacing: 1.2,
                    }}
                  >
                    {DAY_LABELS[dayIdx]!.toUpperCase()}
                  </Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  {isRest ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Moon size={12} color={colors.text4} />
                      <Text style={{ color: colors.text3, fontSize: 13, fontFamily: fonts.bodyRegular }}>
                        Rest day
                      </Text>
                    </View>
                  ) : cell?.templateName ? (
                    <View>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: isMissed ? colors.text3 : colors.text,
                          fontSize: 13,
                          fontFamily: fonts.bodyMedium,
                          textDecorationLine: isMissed ? "line-through" : "none",
                        }}
                      >
                        {cell.templateName}
                      </Text>
                      {/* 14x2 underline swatch in workout color */}
                      <View
                        style={{
                          width: 14,
                          height: 2,
                          backgroundColor: nodeColor,
                          marginTop: 3,
                          borderRadius: 1,
                        }}
                      />
                    </View>
                  ) : (
                    <Text style={{ color: colors.text4, fontSize: 13, fontFamily: fonts.bodyRegular }}>—</Text>
                  )}
                </View>

                {/* Right slot — Start / status */}
                {(isToday || (status === "upcoming" && selectedWeek === currentWeek)) && cell?.templateId ? (
                  <Pressable
                    onPress={() => handleStartWorkout(cell.templateId!)}
                    disabled={!!startingWorkout}
                    style={{
                      backgroundColor: isToday ? colors.blue : "transparent",
                      borderWidth: 1,
                      borderColor: isToday ? colors.blue : colors.line,
                      borderRadius: radii.buttonSm,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    {startingWorkout === cell.templateId ? (
                      <ActivityIndicator size="small" color={isToday ? colors.white : colors.text2} />
                    ) : (
                      <Text
                        style={{
                          color: isToday ? colors.white : colors.text2,
                          fontSize: 11,
                          fontFamily: fonts.bodySemi,
                        }}
                      >
                        Start
                      </Text>
                    )}
                  </Pressable>
                ) : isDone ? (
                  <Text style={{ color: colors.green, fontSize: 11, fontFamily: fonts.monoSemi, letterSpacing: 1 }}>
                    ✓ DONE
                  </Text>
                ) : isMissed ? (
                  <Text style={{ color: colors.red, fontSize: 11, fontFamily: fonts.monoSemi, letterSpacing: 1 }}>
                    MISSED
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* 2-col summary cards */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <SummaryCard
            label="Weekly goal"
            value={`${doneThisWeek}/${totalThisWeek}`}
            hint="workouts logged"
          />
          {adherencePct !== undefined ? (
            <SummaryCard
              label="Adherence"
              value={`${adherencePct}%`}
              hint={`over ${currentWeek} wk`}
            />
          ) : (
            <SummaryCard
              label="Remaining"
              value={String(Math.max(0, program.durationWeeks - currentWeek))}
              hint="weeks"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        padding: 12,
      }}
    >
      <UppercaseLabel style={{ fontSize: 9 }}>{label}</UppercaseLabel>
      <BigNum size={22} style={{ marginTop: 4 }}>
        {value}
      </BigNum>
      <Text style={{ color: colors.text4, fontSize: 10, fontFamily: fonts.monoRegular, marginTop: 2 }}>
        {hint}
      </Text>
    </View>
  );
}
