import React, { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { usePowerSync } from "@powersync/react";
import { Plus, Trash2 } from "lucide-react-native";
import { SetRow } from "./set-row";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  destructive: "hsl(0, 63%, 31%)",
};

interface SetData {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
}

interface ExerciseCardProps {
  exerciseId: string;
  workoutExerciseId: string;
  exerciseName: string;
  sets: SetData[];
  exerciseIndex: number;
  workoutId: string;
  onSetComplete: () => void;
  onRpePick: (setId: string, rpe: number | null) => void;
}

export function ExerciseCard({
  exerciseId,
  workoutExerciseId,
  exerciseName,
  sets,
  exerciseIndex,
  workoutId,
  onSetComplete,
  onRpePick,
}: ExerciseCardProps) {
  const db = usePowerSync();
  const swipeableRef = useRef<Swipeable>(null);

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

    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    await db.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, weight_kg, reps, rpe, completed)
       VALUES (?, ?, ?, NULL, NULL, NULL, 0)`,
      [id, workoutExerciseId, nextNumber]
    );
  }, [db, workoutExerciseId, sets]);

  const renderRightActions = () => (
    <Pressable
      onPress={handleDeleteExercise}
      style={{
        backgroundColor: colors.destructive,
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <Trash2 size={22} color={colors.foreground} />
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
          backgroundColor: colors.muted,
          borderRadius: 12,
          paddingVertical: 12,
          marginHorizontal: 16,
          marginBottom: 12,
        }}
      >
        {/* Exercise name header */}
        <Text
          style={{
            color: colors.primary,
            fontSize: 16,
            fontWeight: "700",
            paddingHorizontal: 12,
            marginBottom: 8,
          }}
        >
          {exerciseName}
        </Text>

        {/* Column headers */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingBottom: 4,
          }}
        >
          <Text style={headerText(28)}>#</Text>
          <Text style={{ ...headerText(0), flex: 1 }}>KG</Text>
          <Text style={{ ...headerText(0), flex: 1 }}>REPS</Text>
          <Text style={headerText(44)}>RPE</Text>
          <View style={{ width: 44 }} />
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
            onComplete={onSetComplete}
            onRpePick={onRpePick}
          />
        ))}

        {/* Add Set button */}
        <Pressable
          onPress={handleAddSet}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
            marginTop: 4,
            marginHorizontal: 12,
            backgroundColor: colors.accent,
            borderRadius: 8,
            gap: 6,
          }}
        >
          <Plus size={16} color={colors.mutedFg} />
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Add Set
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

function headerText(width: number) {
  return {
    color: colors.mutedFg,
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    width: width || undefined,
  };
}
