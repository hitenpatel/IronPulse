import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell } from "lucide-react-native";
import { useWorkouts, type WorkoutRow } from "@ironpulse/sync";
import { formatElapsed } from "@/lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function WorkoutCard({ item, onPress }: { item: WorkoutRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: colors.muted,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.accent,
          padding: 16,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          {item.name ?? "Untitled Workout"}
        </Text>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Workouts" }} />
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => (
          <WorkoutCard
            item={item}
            onPress={() => router.push(`/history/workout/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <Dumbbell size={48} color={colors.mutedFg} />
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
