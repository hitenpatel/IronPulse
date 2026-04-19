import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { useQuery } from "@powersync/react";
import { useExercises } from "@ironpulse/sync";

import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Pills, TopBar, UppercaseLabel } from "@/components/ui";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filter = "all" | "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

interface RecentRow {
  exercise_id: string;
  uses: number;
}

interface ExerciseBrief {
  id: string;
  name: string;
  category: string | null;
  primary_muscles: string | null;
  one_rep_max_kg?: number | null;
}

function musclesText(ex: { primary_muscles: string | null }): string {
  try {
    return JSON.parse(ex.primary_muscles ?? "[]").join(", ");
  } catch {
    return ex.primary_muscles ?? "";
  }
}

function matchesFilter(ex: ExerciseBrief, filter: Filter): boolean {
  if (filter === "all") return true;
  const category = (ex.category ?? "").toLowerCase();
  const muscles = musclesText(ex).toLowerCase();
  return category.includes(filter) || muscles.includes(filter);
}

export default function ExercisesScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: exercises } = useExercises({ search: search || undefined });

  // Most-used exercises from the user's workouts. Drives the Recent rail
  // with its circular "frequency" ring.
  const { data: recentRows } = useQuery<RecentRow>(
    `SELECT we.exercise_id, COUNT(*) AS uses
       FROM workout_exercises we
       INNER JOIN workouts w ON w.id = we.workout_id
       GROUP BY we.exercise_id
       ORDER BY uses DESC
       LIMIT 4`,
    [],
  );
  const maxUses = Math.max(1, ...((recentRows ?? []).map((r) => r.uses)));

  const filtered = useMemo(() => {
    return ((exercises ?? []) as ExerciseBrief[]).filter((e) => matchesFilter(e, filter));
  }, [exercises, filter]);

  const recentExercises = useMemo(() => {
    const byId = new Map((exercises ?? []).map((e) => [e.id, e as ExerciseBrief]));
    return (recentRows ?? [])
      .map((r) => ({ uses: r.uses, ex: byId.get(r.exercise_id) }))
      .filter((x): x is { uses: number; ex: ExerciseBrief } => x.ex != null);
  }, [exercises, recentRows]);

  const filterItems = [
    { key: "all" as const, label: "All", count: exercises?.length },
    { key: "chest" as const, label: "Chest" },
    { key: "back" as const, label: "Back" },
    { key: "legs" as const, label: "Legs" },
    { key: "shoulders" as const, label: "Shoulders" },
    { key: "arms" as const, label: "Arms" },
    { key: "core" as const, label: "Core" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.gutter }}>
        <TopBar
          title="Exercises"
          right={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable hitSlop={6} accessibilityLabel="Filters" style={iconBtn}>
                <SlidersHorizontal size={16} color={colors.text2} />
              </Pressable>
              <Pressable
                testID="create-custom-exercise"
                onPress={() => navigation.navigate("WorkoutAddExercise" as never)}
                hitSlop={6}
                accessibilityLabel="Create exercise"
                style={[iconBtn, { backgroundColor: colors.blue, borderColor: colors.blue }]}
              >
                <Plus size={16} color={colors.blueInk} />
              </Pressable>
            </View>
          }
        />

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.bg2,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.button,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        >
          <Search size={14} color={colors.text4} />
          <TextInput
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 13,
              fontFamily: fonts.bodyRegular,
              padding: 0,
            }}
            placeholder="Search exercises"
            placeholderTextColor={colors.text4}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Pills items={filterItems} activeKey={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, marginTop: 10 }}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 32 }}
        ListHeaderComponent={
          recentExercises.length > 0 ? (
            <View style={{ marginBottom: 14 }}>
              <UppercaseLabel style={{ marginBottom: 6 }}>Recent</UppercaseLabel>
              <View
                style={{
                  backgroundColor: colors.bg1,
                  borderWidth: 1,
                  borderColor: colors.lineSoft,
                  borderRadius: radii.rowList,
                  overflow: "hidden",
                }}
              >
                {recentExercises.map((r, i) => (
                  <View
                    key={r.ex.id}
                    style={{
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.lineSoft,
                    }}
                  >
                    <Pressable
                      onPress={() => navigation.navigate("ExerciseDetail", { id: r.ex.id })}
                      android_ripple={{ color: colors.bg3 }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: spacing.rowPaddingY,
                        paddingHorizontal: spacing.rowPaddingX,
                      }}
                    >
                      <ProgressRing
                        percent={r.uses / maxUses}
                        count={r.uses}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 13,
                            color: colors.text,
                            fontFamily: fonts.bodyMedium,
                          }}
                        >
                          {r.ex.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 10.5,
                            color: colors.text3,
                            marginTop: 1,
                            fontFamily: fonts.bodyRegular,
                            textTransform: "capitalize",
                          }}
                        >
                          {r.ex.category ?? musclesText(r.ex)}
                        </Text>
                      </View>
                      {r.ex.one_rep_max_kg != null ? (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontFamily: fonts.displayMedium,
                              fontSize: 13,
                              color: colors.text,
                            }}
                          >
                            {Number(r.ex.one_rep_max_kg).toFixed(0)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color: colors.text4,
                              fontFamily: fonts.monoRegular,
                            }}
                          >
                            kg 1RM
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Text
              style={{
                color: colors.text3,
                fontSize: 13,
                fontFamily: fonts.bodyRegular,
              }}
            >
              {search ? "No exercises found" : "Syncing exercises…"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: 1,
              borderColor: colors.lineSoft,
              paddingHorizontal: 4,
            }}
          >
            <Pressable
              onPress={() => navigation.navigate("ExerciseDetail", { id: item.id })}
              android_ripple={{ color: colors.bg3 }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13.5, color: colors.text, fontFamily: fonts.bodyMedium }}
                >
                  {item.name}
                </Text>
                {musclesText(item) ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 10.5,
                      color: colors.text3,
                      marginTop: 1,
                      fontFamily: fonts.bodyRegular,
                    }}
                  >
                    {musclesText(item)}
                  </Text>
                ) : null}
              </View>
              {item.category ? (
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.text4,
                    fontFamily: fonts.monoRegular,
                    textTransform: "lowercase",
                  }}
                >
                  [{item.category}]
                </Text>
              ) : null}
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const iconBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.line,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.bg1,
};

function ProgressRing({ percent, count }: { percent: number; count: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, percent)));
  return (
    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
      <Svg width={32} height={32} viewBox="0 0 32 32" style={{ position: "absolute" }}>
        <Circle cx={16} cy={16} r={r} stroke={colors.bg3} strokeWidth={2} fill={colors.bg2} />
        <Circle
          cx={16}
          cy={16}
          r={r}
          stroke={colors.blue}
          strokeWidth={2}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
        />
      </Svg>
      <Text
        style={{
          fontSize: 10,
          fontFamily: fonts.monoSemi,
          color: colors.text2,
        }}
      >
        {count}
      </Text>
    </View>
  );
}
