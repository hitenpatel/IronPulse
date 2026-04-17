import { randomUUID } from "@/lib/uuid";
import React, { useCallback, useRef } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { usePowerSync } from "@powersync/react";
import { Link2, Link2Off, Plus, Trash2 } from "lucide-react-native";
import { SetRow } from "./set-row";
import { Badge } from "../ui/badge";

// Pulse design system tokens
const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
  error: "#EF4444",
  border: "#1E2B47",
  superset: "#A855F7",
};

interface SetData {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
}

interface PreviousSet {
  weight_kg: number | null;
  reps: number | null;
  set_number: number;
}

interface ExerciseCardProps {
  exerciseId: string;
  workoutExerciseId: string;
  exerciseName: string;
  sets: SetData[];
  previousSets?: PreviousSet[];
  exerciseIndex: number;
  workoutId: string;
  supersetGroup?: number | null;
  canLinkSuperset?: boolean;
  nextWorkoutExerciseId?: string;
  onSetComplete: () => void;
  onRpePick: (setId: string, rpe: number | null) => void;
}

export function ExerciseCard({
  exerciseId,
  workoutExerciseId,
  exerciseName,
  sets,
  previousSets,
  exerciseIndex,
  workoutId,
  supersetGroup,
  canLinkSuperset,
  nextWorkoutExerciseId,
  onSetComplete,
  onRpePick,
}: ExerciseCardProps) {
  const db = usePowerSync();
  const swipeableRef = useRef<Swipeable>(null);
  const isInSuperset = supersetGroup != null;

  const handleDeleteExercise = useCallback(async () => {
    // Two-step delete: sets first (no CASCADE in PowerSync SQLite)
    await db.execute(
      "DELETE FROM exercise_sets WHERE workout_exercise_id = ?",
      [workoutExerciseId]
    );
    await db.execute("DELETE FROM workout_exercises WHERE id = ?", [
      workoutExerciseId,
    ]);
  }, [db, workoutExerciseId]);

  const handleAddSet = useCallback(async () => {
    const nextNumber = sets.length > 0
      ? Math.max(...sets.map((s) => s.set_number)) + 1
      : 1;

    const id = randomUUID() ?? `${Date.now()}-${Math.random()}`;
    await db.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, weight_kg, reps, rpe, completed)
       VALUES (?, ?, ?, NULL, NULL, NULL, 0)`,
      [id, workoutExerciseId, nextNumber]
    );
  }, [db, workoutExerciseId, sets]);

  const handleLinkSuperset = useCallback(async () => {
    if (!nextWorkoutExerciseId) return;
    const allGroups = await db.execute(
      "SELECT DISTINCT superset_group FROM workout_exercises WHERE workout_id = ? AND superset_group IS NOT NULL",
      [workoutId]
    );
    const existing = allGroups.rows._array.map((r: any) => r.superset_group as number);
    const newGroup = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    await db.execute("UPDATE workout_exercises SET superset_group = ? WHERE id = ?", [newGroup, workoutExerciseId]);
    await db.execute("UPDATE workout_exercises SET superset_group = ? WHERE id = ?", [newGroup, nextWorkoutExerciseId]);
  }, [db, workoutId, workoutExerciseId, nextWorkoutExerciseId]);

  const handleUnlinkSuperset = useCallback(async () => {
    await db.execute("UPDATE workout_exercises SET superset_group = NULL WHERE id = ?", [workoutExerciseId]);
  }, [db, workoutExerciseId]);

  const handleSupersetPress = useCallback(() => {
    if (isInSuperset) {
      Alert.alert("Superset", "Remove this exercise from the superset?", [
        { text: "Cancel", style: "cancel" },
        { text: "Unlink", style: "destructive", onPress: handleUnlinkSuperset },
      ]);
    } else if (canLinkSuperset) {
      handleLinkSuperset();
    }
  }, [isInSuperset, canLinkSuperset, handleLinkSuperset, handleUnlinkSuperset]);

  const renderRightActions = () => (
    <Pressable
      onPress={handleDeleteExercise}
      style={{
        backgroundColor: colors.error,
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <Trash2 size={22} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isInSuperset ? colors.superset : colors.border,
          borderLeftWidth: isInSuperset ? 3 : 1,
          borderLeftColor: isInSuperset ? colors.superset : colors.border,
          paddingVertical: 12,
          marginHorizontal: 16,
          marginBottom: 12,
        }}
      >
        {/* Exercise name header + superset button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            marginBottom: 6,
          }}
        >
          <View style={{ flex: 1 }}>
            {isInSuperset && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.superset }} />
                <Text style={{ color: colors.superset, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>
                  Superset
                </Text>
              </View>
            )}
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "500",
                fontFamily: "ClashDisplay",
              }}
            >
              {exerciseName}
            </Text>
          </View>
          {(isInSuperset || canLinkSuperset) && (
            <Pressable onPress={handleSupersetPress} hitSlop={8} style={{ padding: 4 }}>
              {isInSuperset ? (
                <Link2Off size={16} color={colors.superset} />
              ) : (
                <Link2 size={16} color={colors.dimFg} />
              )}
            </Pressable>
          )}
        </View>

        {/* Previous performance */}
        {previousSets && previousSets.length > 0 && (
          <Text
            style={{
              color: colors.dimFg,
              fontSize: 12,
              paddingHorizontal: 16,
              marginBottom: 10,
            }}
            numberOfLines={2}
          >
            <Text style={{ fontWeight: "600", color: colors.mutedFg }}>Last: </Text>
            {previousSets
              .map((s) => {
                if (s.weight_kg != null && s.reps != null)
                  return `${s.weight_kg}kg × ${s.reps}`;
                if (s.reps != null) return `${s.reps} reps`;
                return "—";
              })
              .join(", ")}
          </Text>
        )}

        {/* Column headers: SET | PREVIOUS | KG | REPS | ✓ */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 6,
          }}
        >
          <Text style={[headerText, { width: 28 }]}>SET</Text>
          <Text style={[headerText, { flex: 1.2 }]}>PREVIOUS</Text>
          <Text style={[headerText, { flex: 1 }]}>KG</Text>
          <Text style={[headerText, { flex: 1 }]}>REPS</Text>
          <Text style={[headerText, { width: 44 }]}>RPE</Text>
          {/* checkmark column spacer */}
          <View style={{ width: 44 }} />
          {/* delete column spacer */}
          <View style={{ width: 32 }} />
        </View>

        {/* Set rows */}
        {sets.map((set, idx) => (
          <SetRow
            key={set.id}
            setId={set.id}
            setNumber={set.set_number}
            weightKg={set.weight_kg}
            reps={set.reps}
            rpe={set.rpe}
            completed={set.completed}
            exerciseIndex={exerciseIndex}
            setIndex={idx}
            previousSet={previousSets?.[idx]}
            onComplete={onSetComplete}
            onRpePick={onRpePick}
          />
        ))}

        {/* + Add Set button */}
        <Pressable
          onPress={handleAddSet}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            marginTop: 6,
            marginHorizontal: 16,
            gap: 6,
          }}
        >
          <Plus size={16} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            + Add Set
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

const headerText = {
  color: "#8899B4",
  fontSize: 11,
  fontWeight: "600" as const,
  textAlign: "center" as const,
  letterSpacing: 0.5,
};
