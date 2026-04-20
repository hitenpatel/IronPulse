import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Circle } from "react-native-svg";
import {
  Bell,
  Flame,
  Play,
  Dumbbell,
  Activity,
} from "lucide-react-native";
import { usePowerSync, useQuery } from "@powersync/react";

import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { randomUUID } from "@/lib/uuid";
import { formatElapsed } from "@/lib/workout-utils";
import {
  currentWeekRange,
  dateLabel,
  greeting,
  heatmapCells,
  compactDuration,
  volumeTons,
} from "@/lib/dashboard-utils";

import { colors, fonts, radii, spacing, tracking } from "@/lib/theme";
import {
  BigNum,
  Card,
  Chip,
  Logo,
  Row,
  RowList,
  UppercaseLabel,
} from "@/components/ui";
import { SyncIndicator } from "@/components/layout/sync-indicator";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function workoutNameForTimeOfDay(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Morning Workout";
  if (h < 17) return "Afternoon Workout";
  return "Evening Workout";
}

/** Concentric circle decoration used on the Next Up hero card. */
function ConcentricDeco() {
  return (
    <Svg
      width={120}
      height={120}
      viewBox="0 0 100 100"
      style={{ position: "absolute", right: -14, top: -14, opacity: 0.08 }}
    >
      <Circle cx="50" cy="50" r="40" stroke={colors.blue} strokeWidth={1} fill="none" />
      <Circle cx="50" cy="50" r="30" stroke={colors.blue} strokeWidth={1} fill="none" />
      <Circle cx="50" cy="50" r="20" stroke={colors.blue} strokeWidth={1} fill="none" />
    </Svg>
  );
}

/** 3×7 grid of 6px cells, amber intensity per day. */
function StreakHeatmap({ data }: { data: Array<{ intensity: number; count: number }> }) {
  // Render column-major so the grid reads left-to-right, oldest-to-newest.
  const CELL = 6;
  const GAP = 2;
  const ROWS = 3;
  const COLS = Math.ceil(data.length / ROWS);
  return (
    <View style={{ flexDirection: "row", gap: GAP }}>
      {Array.from({ length: COLS }).map((_, col) => (
        <View key={col} style={{ gap: GAP }}>
          {Array.from({ length: ROWS }).map((_, row) => {
            const idx = col * ROWS + row;
            const cell = data[idx];
            if (!cell) return <View key={row} style={{ width: CELL, height: CELL }} />;
            const bg =
              cell.intensity > 0
                ? `rgba(245,158,11,${0.3 + cell.intensity * 0.6})`
                : colors.bg3;
            return (
              <View
                key={row}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 1.5,
                  backgroundColor: bg,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface WeeklyVolumeRow {
  total: number | null;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const db = usePowerSync();
  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);

  useEffect(() => {
    trpc.analytics.streak.query().then(setStreak).catch(() => {});
  }, []);

  const [weekMon, weekSun] = useMemo(() => currentWeekRange(new Date()), []);
  const { data: volumeRows } = useQuery<WeeklyVolumeRow>(
    `SELECT COALESCE(SUM(es.weight_kg * es.reps), 0) AS total
       FROM exercise_sets es
       INNER JOIN workout_exercises we ON es.workout_exercise_id = we.id
       INNER JOIN workouts w ON we.workout_id = w.id
      WHERE es.completed = 1
        AND w.completed_at IS NOT NULL
        AND w.completed_at >= ?
        AND w.completed_at <= ?`,
    [weekMon.toISOString(), weekSun.toISOString()],
  );
  const weeklyVolumeKg = volumeRows?.[0]?.total ?? 0;

  const weeklySummary = useMemo(() => {
    let workoutCount = 0;
    let cardioCount = 0;
    let totalSeconds = 0;
    for (const w of workouts ?? []) {
      const d = new Date(w.started_at);
      if (d >= weekMon && d <= weekSun) {
        workoutCount++;
        totalSeconds += w.duration_seconds ?? 0;
      }
    }
    for (const c of cardioSessions ?? []) {
      const d = new Date(c.started_at);
      if (d >= weekMon && d <= weekSun) {
        cardioCount++;
        totalSeconds += c.duration_seconds ?? 0;
      }
    }
    return { workoutCount, cardioCount, totalSeconds };
  }, [workouts, cardioSessions, weekMon, weekSun]);

  const heatmap = useMemo(
    () =>
      heatmapCells(
        [...(workouts ?? []), ...(cardioSessions ?? [])],
        21,
      ),
    [workouts, cardioSessions],
  );

  const recent = useMemo(() => {
    const items = [
      ...(workouts ?? []).slice(0, 10).map((w) => ({
        kind: "workout" as const,
        id: w.id,
        name: w.name ?? "Workout",
        date: w.started_at,
        duration: w.duration_seconds,
      })),
      ...(cardioSessions ?? []).slice(0, 10).map((c) => ({
        kind: "cardio" as const,
        id: c.id,
        name: c.type,
        date: c.started_at,
        duration: c.duration_seconds,
      })),
    ];
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 5);
  }, [workouts, cardioSessions]);

  const handleStartWorkout = useCallback(async () => {
    const name = workoutNameForTimeOfDay();
    try {
      const workoutId = randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO workouts (id, user_id, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)`,
        [workoutId, user!.id, name, now, now],
      );
      navigation.navigate("WorkoutActive", { workoutId });
    } catch {
      try {
        const result = await trpc.workout.create.mutate({ name });
        navigation.navigate("WorkoutActive", { workoutId: result.workout.id });
      } catch {
        // surfaced to user elsewhere
      }
    }
  }, [db, user, navigation]);

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";
  const timeDuration = compactDuration(weeklySummary.totalSeconds);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
        {/* Brand row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 2,
            paddingBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Logo size={30} />
            <Text
              style={{
                fontFamily: fonts.displaySemi,
                fontSize: 18,
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              IronPulse
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SyncIndicator />
            <Pressable
              testID="notifications-bell"
              onPress={() => navigation.navigate("Notifications")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Bell size={20} color={colors.text2} />
            </Pressable>
          </View>
        </View>

        {/* Greeting */}
        <View style={{ marginBottom: 16 }}>
          <UppercaseLabel color={colors.blue2}>{dateLabel()}</UppercaseLabel>
          <Text
            testID="greeting"
            accessibilityRole="header"
            style={{
              fontFamily: fonts.displaySemi,
              fontSize: 28,
              fontWeight: "600",
              color: colors.text,
              letterSpacing: -0.6,
              marginTop: 6,
            }}
          >
            {greeting()}, {firstName}
          </Text>
          <Text
            testID="sub-greeting"
            style={{
              color: colors.text3,
              fontSize: 14,
              marginTop: 4,
              fontFamily: fonts.bodyRegular,
            }}
          >
            Ready to train?
          </Text>
        </View>

        {/* Next Up hero */}
        <Pressable testID="next-up-hero" onPress={handleStartWorkout}>
          <View
            style={{
              position: "relative",
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.blueSoft,
              backgroundColor: colors.blueSoft,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <ConcentricDeco />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.blue,
                }}
              />
              <UppercaseLabel color={colors.blue2}>
                Next up · fresh session
              </UppercaseLabel>
            </View>
            <Text
              style={{
                fontFamily: fonts.displaySemi,
                fontSize: 22,
                fontWeight: "600",
                letterSpacing: -0.5,
                color: colors.text,
                marginBottom: 2,
              }}
            >
              {workoutNameForTimeOfDay()}
            </Text>
            <Text style={{ color: colors.text3, fontSize: 11.5, marginBottom: 14, fontFamily: fonts.body }}>
              Tap to start logging
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                backgroundColor: colors.blue,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: radii.button,
              }}
            >
              <Play size={14} color={colors.blueInk} />
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: colors.blueInk,
                }}
              >
                Start workout
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Streak */}
        <Pressable onPress={() => navigation.navigate("Calendar")}>
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: colors.amberSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={18} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, fontFamily: fonts.body }}>
                  <Text style={{ fontFamily: fonts.display }}>{streak?.current ?? 0}</Text>
                  -day streak
                </Text>
                <Text style={{ fontSize: 10.5, color: colors.text3, marginTop: 1, fontFamily: fonts.body }}>
                  Longest: {streak?.longest ?? 0}
                </Text>
              </View>
              <StreakHeatmap data={heatmap} />
            </View>
          </Card>
        </Pressable>

        {/* 3-col weekly metrics */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
          <MetricTile
            label="Sessions"
            value={String(weeklySummary.workoutCount + weeklySummary.cardioCount)}
            color={colors.blue2}
          />
          <MetricTile
            label="Volume"
            value={volumeTons(Number(weeklyVolumeKg))}
            unit="t"
            color={colors.green}
          />
          <MetricTile
            label="Time"
            value={timeDuration.value}
            unit={timeDuration.unit}
            color={colors.purple}
          />
        </View>

        {/* Recent */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <UppercaseLabel>Recent</UppercaseLabel>
          <Pressable onPress={() => navigation.navigate("HistoryWorkouts")}>
            <Text
              style={{
                fontSize: 10.5,
                color: colors.blue2,
                fontFamily: fonts.bodySemi,
              }}
            >
              View all
            </Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <Card>
            <Text
              style={{
                color: colors.text3,
                fontSize: 13,
                textAlign: "center",
                paddingVertical: 24,
                fontFamily: fonts.bodyRegular,
              }}
            >
              No activity yet. Start your first workout.
            </Text>
          </Card>
        ) : (
          <RowList>
            {recent.map((item) => (
              <Row
                key={`${item.kind}-${item.id}`}
                leading={
                  item.kind === "workout" ? (
                    <Dumbbell size={14} color={colors.blue2} />
                  ) : (
                    <Activity size={14} color={colors.green} />
                  )
                }
                leadingTone={item.kind === "workout" ? "blue" : "green"}
                title={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12.5,
                        color: colors.text,
                        textTransform: item.kind === "cardio" ? "capitalize" : "none",
                        fontFamily: fonts.bodyMedium,
                      }}
                    >
                      {item.name}
                    </Text>
                  </View>
                }
                subtitle={
                  item.duration != null
                    ? formatElapsed(item.duration)
                    : undefined
                }
                right={new Date(item.date).toLocaleDateString(undefined, {
                  weekday: "short",
                })}
                onPress={() =>
                  item.kind === "workout"
                    ? navigation.navigate("HistoryWorkoutDetail", { id: item.id })
                    : navigation.navigate("HistoryCardioDetail", { id: item.id })
                }
              />
            ))}
          </RowList>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  color: string;
}

function MetricTile({ label, value, unit, color }: MetricTileProps) {
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        backgroundColor: colors.bg1,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: 10,
      }}
    >
      <UppercaseLabel style={{ fontSize: 9.5 }}>{label}</UppercaseLabel>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 3 }}>
        <BigNum size={20} color={color}>
          {value}
        </BigNum>
        {unit ? (
          <Text
            style={{
              color: colors.text4,
              fontSize: 10,
              fontWeight: "400",
              marginLeft: 2,
              fontFamily: fonts.bodyRegular,
            }}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
