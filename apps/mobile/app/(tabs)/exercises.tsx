import { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useExercises, useTemplates, type TemplateRow } from "@ironpulse/sync";
import type { RootStackParamList } from "../../App";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getWorkoutName } from "@/lib/workout-utils";
import { Trash2, FileText, Search, Heart } from "lucide-react-native";
import * as crypto from "expo-crypto";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  primary: "#0077FF",
  border: "#1E2B47",
  borderSubtle: "#152035",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  error: "#EF4444",
};

const MUSCLE_FILTERS = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Glutes"];

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { data: exercises } = useExercises({ search: search || undefined });
  const { data: templates } = useTemplates();
  const db = usePowerSync();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  async function startFromTemplate(template: TemplateRow) {
    const workoutId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [workoutId, user!.id, template.name, now, template.id, now],
    );

    const templateExercises = await db.execute(
      `SELECT id, exercise_id, "order", notes FROM template_exercises WHERE template_id = ? ORDER BY "order"`,
      [template.id],
    );

    for (const te of templateExercises.rows._array) {
      const weId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes) VALUES (?, ?, ?, ?, ?)`,
        [weId, workoutId, te.exercise_id, te.order, te.notes],
      );

      const templateSets = await db.execute(
        `SELECT set_number, target_reps, target_weight_kg, type FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number`,
        [te.id],
      );

      for (const ts of templateSets.rows._array) {
        await db.execute(
          `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, completed) VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            crypto.randomUUID(),
            weId,
            ts.set_number,
            ts.type,
            ts.target_weight_kg,
            ts.target_reps,
          ],
        );
      }
    }

    navigation.navigate("WorkoutActive", { workoutId });
  }

  function confirmDeleteTemplate(template: TemplateRow) {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTemplate(template.id),
        },
      ],
    );
  }

  async function deleteTemplate(templateId: string) {
    await db.execute(
      `DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)`,
      [templateId],
    );
    await db.execute(`DELETE FROM template_exercises WHERE template_id = ?`, [
      templateId,
    ]);
    await db.execute(`DELETE FROM workout_templates WHERE id = ?`, [
      templateId,
    ]);
  }

  const filteredExercises = (exercises ?? []).filter((ex) => {
    if (activeFilter === "All") return true;
    const category = (ex.category ?? "").toLowerCase();
    const muscles = (() => {
      try { return JSON.parse(ex.primary_muscles ?? "[]").join(" ").toLowerCase(); }
      catch { return (ex.primary_muscles ?? "").toLowerCase(); }
    })();
    return category.includes(activeFilter.toLowerCase()) || muscles.includes(activeFilter.toLowerCase());
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "600",
            fontFamily: "ClashDisplay",
            color: colors.foreground,
            marginBottom: 16,
          }}
        >
          Exercises
        </Text>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            height: 44,
            paddingHorizontal: 12,
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Search size={16} color={colors.dimFg} />
          <TextInput
            style={{
              flex: 1,
              color: colors.foreground,
              fontSize: 15,
            }}
            placeholder="Search exercises..."
            placeholderTextColor={colors.dimFg}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ marginBottom: 16 }}
        >
          {MUSCLE_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={{
                  backgroundColor: isActive ? colors.primary : colors.accent,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: 24,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#FFFFFF" : colors.mutedFg,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Templates section */}
        {templates.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
                marginBottom: 10,
                paddingBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.dimFg,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Templates
              </Text>
            </View>
            <FlatList
              horizontal
              data={templates}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => startFromTemplate(item)}
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 14,
                    width: 150,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <FileText size={16} color={colors.mutedFg} />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.foreground,
                        fontWeight: "600",
                        flex: 1,
                        fontSize: 14,
                      }}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
                      {item.exercise_count ?? 0} exercise
                      {item.exercise_count !== 1 ? "s" : ""}
                    </Text>
                    <Pressable
                      onPress={() => confirmDeleteTemplate(item)}
                      hitSlop={8}
                    >
                      <Trash2 size={14} color={colors.mutedFg} />
                    </Pressable>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Section header for exercise list */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            paddingBottom: 6,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.dimFg,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {activeFilter === "All" ? "All Exercises" : activeFilter}
          </Text>
        </View>
      </View>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 1 }}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.mutedFg,
              textAlign: "center",
              paddingVertical: 32,
              fontSize: 14,
            }}
          >
            {search ? "No exercises found" : "Syncing exercises..."}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              height: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontWeight: "600",
                  fontSize: 16,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.primary_muscles && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.mutedFg,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {(() => {
                    try {
                      return JSON.parse(item.primary_muscles).join(", ");
                    } catch {
                      return item.primary_muscles;
                    }
                  })()}
                </Text>
              )}
            </View>
            {item.category && (
              <View
                style={{
                  backgroundColor: colors.accent,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.mutedFg,
                    fontWeight: "500",
                    textTransform: "capitalize",
                  }}
                >
                  {item.category}
                </Text>
              </View>
            )}
            <Heart size={18} color={colors.dimFg} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
