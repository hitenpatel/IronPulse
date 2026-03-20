import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell, Star } from "lucide-react-native";
import { useWorkouts, type WorkoutRow } from "@ironpulse/sync";
import { formatElapsed } from "@/lib/workout-utils";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  border: "#1E2B47",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  prGold: "#FFD700",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function WorkoutCard({ item, onPress }: { item: WorkoutRow; onPress: () => void }) {
  const hasPR = (item as any).has_pr;

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 10 }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "600",
              flex: 1,
              marginRight: 8,
            }}
          >
            {item.name ?? "Untitled Workout"}
          </Text>
          {hasPR && <Star size={16} color={colors.prGold} fill={colors.prGold} />}
        </View>
        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 13,
            marginTop: 4,
          }}
        >
          {formatDate(item.started_at)}
        </Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {item.exercise_count ?? 0} exercise{(item.exercise_count ?? 0) !== 1 ? "s" : ""}
          </Text>
          {item.duration_seconds != null && (
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
              {formatElapsed(item.duration_seconds)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function WorkoutHistoryScreen() {
  const { data: workouts } = useWorkouts();
  const router = useRouter();

  // Group workouts by month
  const grouped = React.useMemo(() => {
    const map = new Map<string, WorkoutRow[]>();
    (workouts ?? []).forEach((w) => {
      const key = getMonthYear(w.started_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return Array.from(map.entries());
  }, [workouts]);

  type ListItem = { type: "header"; title: string } | { type: "workout"; item: WorkoutRow };

  const flatData: ListItem[] = React.useMemo(() => {
    const result: ListItem[] = [];
    for (const [month, items] of grouped) {
      result.push({ type: "header", title: month });
      for (const item of items) {
        result.push({ type: "workout", item });
      }
    }
    return result;
  }, [grouped]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Workouts" }} />
      <FlatList
        data={flatData}
        keyExtractor={(item, index) =>
          item.type === "header" ? `header-${item.title}` : item.item.id
        }
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text
                style={{
                  fontFamily: "ClashDisplay",
                  fontWeight: "600",
                  fontSize: 22,
                  color: colors.foreground,
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                {item.title}
              </Text>
            );
          }
          return (
            <WorkoutCard
              item={item.item}
              onPress={() => router.push(`/history/workout/${item.item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <Dumbbell size={48} color={colors.dimFg} />
            <Text
              style={{
                color: colors.mutedFg,
                fontSize: 16,
                marginTop: 16,
              }}
            >
              No workouts yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
