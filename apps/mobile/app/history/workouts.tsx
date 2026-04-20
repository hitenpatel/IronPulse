import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell, Star } from "lucide-react-native";
import { useWorkouts, type WorkoutRow } from "@ironpulse/sync";
import { formatElapsed } from "@/lib/workout-utils";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

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
  const hasPR = Boolean((item as { has_pr?: unknown }).has_pr);

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 10 }}>
      <View
        style={{
          backgroundColor: colors.bg1,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.line,
          paddingVertical: spacing.cardPaddingY,
          paddingHorizontal: spacing.cardPaddingX,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: typography.body.size,
              lineHeight: typography.body.lineHeight,
              fontFamily: fonts.bodySemi,
              fontWeight: "600",
              flex: 1,
              marginRight: 8,
            }}
          >
            {item.name ?? "Untitled Workout"}
          </Text>
          {hasPR && <Star size={18} color={colors.amber} fill={colors.amber} />}
        </View>
        <Text
          style={{
            color: colors.text3,
            fontSize: typography.caption.size,
            lineHeight: typography.caption.lineHeight,
            fontFamily: fonts.bodyRegular,
            marginTop: 4,
          }}
        >
          {formatDate(item.started_at)}
        </Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
          <Text
            style={{
              color: colors.text3,
              fontSize: typography.caption.size,
              fontFamily: fonts.bodyRegular,
            }}
          >
            {item.exercise_count ?? 0} exercise{(item.exercise_count ?? 0) !== 1 ? "s" : ""}
          </Text>
          {item.duration_seconds != null && (
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.caption.size,
                fontFamily: fonts.bodyRegular,
              }}
            >
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <FlatList
        data={flatData}
        keyExtractor={(item) =>
          item.type === "header" ? `header-${item.title}` : item.item.id
        }
        contentContainerStyle={{ padding: spacing.gutter, flexGrow: 1 }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text
                style={{
                  fontFamily: fonts.displaySemi,
                  fontWeight: "600",
                  fontSize: typography.title.size,
                  lineHeight: typography.title.lineHeight,
                  letterSpacing: typography.title.letterSpacing,
                  color: colors.text,
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
              onPress={() => navigation.navigate("HistoryWorkoutDetail", { id: item.item.id })}
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
            <Dumbbell size={48} color={colors.text4} />
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.body.size,
                fontFamily: fonts.bodyRegular,
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
