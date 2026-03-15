import { useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useRouter } from "expo-router";
import { useExercises, useTemplates, type TemplateRow } from "@ironpulse/sync";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getWorkoutName } from "@/lib/workout-utils";
import { Trash2, FileText } from "lucide-react-native";
import * as crypto from "expo-crypto";

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises({ search: search || undefined });
  const { data: templates } = useTemplates();
  const db = usePowerSync();
  const router = useRouter();
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

    router.push(`/workout/active?workoutId=${workoutId}`);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 16,
          }}
        >
          Exercises
        </Text>

        {templates.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "hsl(213, 31%, 91%)",
                marginBottom: 8,
              }}
            >
              Templates
            </Text>
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
                    backgroundColor: "hsl(216, 34%, 17%)",
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
                    <FileText size={16} color="hsl(213, 31%, 91%)" />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "500",
                        flex: 1,
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
                    <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                      {item.exercise_count ?? 0} exercise
                      {item.exercise_count !== 1 ? "s" : ""}
                    </Text>
                    <Pressable
                      onPress={() => confirmDeleteTemplate(item)}
                      hitSlop={8}
                    >
                      <Trash2 size={14} color="hsl(215, 20%, 65%)" />
                    </Pressable>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        <Input
          label=""
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text
            style={{
              color: "hsl(215, 20%, 65%)",
              textAlign: "center",
              paddingVertical: 32,
            }}
          >
            {search ? "No exercises found" : "Syncing exercises..."}
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
              {item.name}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              {item.category && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "hsl(215, 20%, 65%)",
                    textTransform: "capitalize",
                  }}
                >
                  {item.category}
                </Text>
              )}
              {item.primary_muscles && (
                <Text style={{ fontSize: 12, color: "hsl(215, 20%, 65%)" }}>
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
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
