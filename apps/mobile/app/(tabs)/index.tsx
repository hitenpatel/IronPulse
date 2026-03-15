import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { Dumbbell, Activity, Calendar, ChevronRight, Timer } from "lucide-react-native";
import { formatElapsed } from "@/lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Returns [mondayDate, sundayDate] of the current ISO week */
function getCurrentWeekRange(): [Date, Date] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday, sunday];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();
  const router = useRouter();

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const [mon, sun] = getCurrentWeekRange();
    let workoutCount = 0;
    let cardioCount = 0;
    let totalSeconds = 0;

    (workouts ?? []).forEach((w) => {
      const d = new Date(w.started_at);
      if (d >= mon && d <= sun) {
        workoutCount++;
        totalSeconds += w.duration_seconds ?? 0;
      }
    });

    (cardioSessions ?? []).forEach((c) => {
      const d = new Date(c.started_at);
      if (d >= mon && d <= sun) {
        cardioCount++;
        totalSeconds += c.duration_seconds ?? 0;
      }
    });

    return { workoutCount, cardioCount, totalSeconds };
  }, [workouts, cardioSessions]);

  // Merged recent activity (last 10)
  const recentActivity = useMemo(() => {
    const items = [
      ...(workouts ?? []).slice(0, 10).map((w) => ({
        type: "workout" as const,
        id: w.id,
        name: w.name ?? "Workout",
        date: w.started_at,
        duration: w.duration_seconds,
      })),
      ...(cardioSessions ?? []).slice(0, 10).map((c) => ({
        type: "cardio" as const,
        id: c.id,
        name: c.type,
        date: c.started_at,
        duration: c.duration_seconds,
      })),
    ];
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 10);
  }, [workouts, cardioSessions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Greeting */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: colors.foreground,
          }}
        >
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </Text>
        <Text style={{ color: colors.mutedFg, marginTop: 4, marginBottom: 20 }}>
          Ready to train?
        </Text>

        {/* Quick-start cards */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push("/workout/active")}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.accent,
                padding: 20,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Dumbbell size={28} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>
                Start Workout
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/cardio/type-picker")}
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.accent,
                padding: 20,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Activity size={28} color="#22c55e" />
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>
                Log Cardio
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Weekly summary */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          This Week
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Dumbbell size={18} color="#3b82f6" />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
                marginTop: 6,
              }}
            >
              {weeklySummary.workoutCount}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Workouts</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Activity size={18} color="#22c55e" />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
                marginTop: 6,
              }}
            >
              {weeklySummary.cardioCount}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Cardio</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Timer size={18} color={colors.primary} />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 22,
                fontWeight: "800",
                marginTop: 6,
              }}
            >
              {weeklySummary.totalSeconds > 0
                ? formatElapsed(weeklySummary.totalSeconds)
                : "0:00"}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>Duration</Text>
          </View>
        </View>

        {/* Recent activity */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Recent Activity
        </Text>

        {recentActivity.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.mutedFg, fontSize: 14 }}>
              No activity yet. Start your first workout!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginBottom: 24 }}>
            {recentActivity.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  item.type === "workout"
                    ? router.push(`/history/workout/${item.id}`)
                    : router.push(`/history/cardio-detail/${item.id}`)
                }
              >
                <View
                  style={{
                    backgroundColor: colors.muted,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {item.type === "workout" ? (
                    <Dumbbell size={20} color="#3b82f6" />
                  ) : (
                    <Activity size={20} color="#22c55e" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "600",
                        fontSize: 15,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      {item.duration != null && (
                        <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
                          {formatElapsed(item.duration)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.mutedFg} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Navigation links */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Explore
        </Text>
        {[
          { label: "Workout History", route: "/history/workouts" },
          { label: "Cardio History", route: "/history/cardio" },
          { label: "Calendar", route: "/calendar" },
        ].map((link) => (
          <Pressable
            key={link.route}
            onPress={() => router.push(link.route as any)}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.accent,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "500" }}>
                {link.label}
              </Text>
              <ChevronRight size={18} color={colors.mutedFg} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
