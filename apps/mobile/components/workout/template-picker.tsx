import { useRef, useEffect } from "react";
import { Text, Pressable, View, FlatList } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { usePowerSync } from "@powersync/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { Play, FileText } from "lucide-react-native";
import { useTemplates, type TemplateRow } from "@ironpulse/sync";
import { useAuth } from "@/lib/auth";
import { getWorkoutName } from "@/lib/workout-utils";
import * as crypto from "expo-crypto";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TemplatePicker({ open, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const db = usePowerSync();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: templates } = useTemplates();

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  async function createEmptyWorkout() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, user!.id, getWorkoutName(), now, now]
    );
    onClose();
    navigation.navigate("WorkoutActive", { workoutId: id });
  }

  async function createFromTemplate(template: TemplateRow) {
    const workoutId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [workoutId, user!.id, template.name, now, template.id, now]
    );

    const templateExercises = await db.execute(
      `SELECT id, exercise_id, "order", notes FROM template_exercises WHERE template_id = ? ORDER BY "order"`,
      [template.id]
    );

    for (const te of templateExercises.rows._array) {
      const weId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes) VALUES (?, ?, ?, ?, ?)`,
        [weId, workoutId, te.exercise_id, te.order, te.notes]
      );

      const templateSets = await db.execute(
        `SELECT set_number, target_reps, target_weight_kg, type FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number`,
        [te.id]
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
          ]
        );
      }
    }

    onClose();
    navigation.navigate("WorkoutActive", { workoutId });
  }

  const hasTemplates = templates.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["50%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223, 47%, 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215, 20%, 65%)" }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 24, paddingVertical: 16, flex: 1 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 16,
          }}
        >
          Start Workout
        </Text>

        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 12,
            backgroundColor: "hsl(210, 40%, 98%)",
            padding: 16,
          }}
          onPress={createEmptyWorkout}
        >
          <Play size={20} color="hsl(222.2, 47.4%, 11.2%)" />
          <Text
            style={{
              color: "hsl(222.2, 47.4%, 11.2%)",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Empty Workout
          </Text>
        </Pressable>

        {hasTemplates && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: "hsl(216, 34%, 17%)",
                marginVertical: 16,
              }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "hsl(215, 20%, 65%)",
                marginBottom: 8,
              }}
            >
              From Template
            </Text>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 12,
                    backgroundColor: "hsl(216, 34%, 17%)",
                    padding: 16,
                    marginBottom: 8,
                  }}
                  onPress={() => createFromTemplate(item)}
                >
                  <FileText size={20} color="hsl(213, 31%, 91%)" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "500",
                      }}
                    >
                      {item.name}
                    </Text>
                    {item.exercise_count != null && (
                      <Text
                        style={{
                          color: "hsl(215, 20%, 65%)",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {item.exercise_count} exercise
                        {item.exercise_count !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
