import React, { useCallback } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTemplates, type TemplateRow } from "@ironpulse/sync";
import { ClipboardList, Play, Trash2 } from "lucide-react-native";
import { randomUUID } from "@/lib/uuid";
import { useAuth } from "@/lib/auth";
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
};

export default function WorkoutTemplatesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = usePowerSync();
  const { user } = useAuth();
  const { data: templates } = useTemplates();

  const handleStartWorkout = useCallback(async (template: TemplateRow) => {
    const workoutId = randomUUID();
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
      const weId = randomUUID();
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
          [randomUUID(), weId, ts.set_number, ts.type, ts.target_weight_kg, ts.target_reps],
        );
      }
    }

    navigation.navigate("WorkoutActive", { workoutId });
  }, [db, user, navigation]);

  const handleDelete = useCallback((template: TemplateRow) => {
    Alert.alert(
      "Delete Template",
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await db.execute(
              `DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)`,
              [template.id],
            );
            await db.execute("DELETE FROM template_exercises WHERE template_id = ?", [template.id]);
            await db.execute("DELETE FROM workout_templates WHERE id = ?", [template.id]);
          },
        },
      ],
    );
  }, [db]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <FlatList
        data={templates ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 64, gap: 12 }}>
            <ClipboardList size={48} color={colors.dimFg} />
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" }}>
              No Templates
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Complete a workout and save it as a template,{"\n"}or create one from the web app.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardList size={20} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                  {item.exercise_count ?? 0} exercise{item.exercise_count !== 1 ? "s" : ""}
                </Text>
              </View>

              <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                <Trash2 size={17} color={colors.dimFg} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => handleStartWorkout(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 14,
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 10,
              }}
            >
              <Play size={15} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                Start Workout
              </Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
