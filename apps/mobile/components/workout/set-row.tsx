import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { usePowerSync } from "@powersync/react";
import * as Haptics from "@/lib/haptics";
import { Check, Minus } from "lucide-react-native";

const colors = {
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  destructive: "hsl(0, 63%, 31%)",
  green: "hsl(142, 71%, 45%)",
};

interface SetRowProps {
  setId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
  exerciseIndex: number;
  setIndex: number;
  onComplete: () => void;
  onRpePick: (setId: string, currentRpe: number | null) => void;
}

export function SetRow({
  setId,
  setNumber,
  weightKg,
  reps,
  rpe,
  completed,
  exerciseIndex,
  setIndex,
  onComplete,
  onRpePick,
}: SetRowProps) {
  const db = usePowerSync();

  const [localWeight, setLocalWeight] = useState(
    weightKg != null ? String(weightKg) : ""
  );
  const [localReps, setLocalReps] = useState(
    reps != null ? String(reps) : ""
  );
  const [isCompleted, setIsCompleted] = useState(completed === 1);

  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync props to local state when they change externally
  useEffect(() => {
    setLocalWeight(weightKg != null ? String(weightKg) : "");
  }, [weightKg]);

  useEffect(() => {
    setLocalReps(reps != null ? String(reps) : "");
  }, [reps]);

  useEffect(() => {
    setIsCompleted(completed === 1);
  }, [completed]);

  const debouncedWriteWeight = useCallback(
    (value: string) => {
      if (weightTimer.current) clearTimeout(weightTimer.current);
      weightTimer.current = setTimeout(() => {
        const parsed = parseFloat(value);
        const val = isNaN(parsed) ? null : parsed;
        db.execute("UPDATE exercise_sets SET weight_kg = ? WHERE id = ?", [
          val,
          setId,
        ]);
      }, 500);
    },
    [db, setId]
  );

  const debouncedWriteReps = useCallback(
    (value: string) => {
      if (repsTimer.current) clearTimeout(repsTimer.current);
      repsTimer.current = setTimeout(() => {
        const parsed = parseInt(value, 10);
        const val = isNaN(parsed) ? null : parsed;
        db.execute("UPDATE exercise_sets SET reps = ? WHERE id = ?", [
          val,
          setId,
        ]);
      }, 500);
    },
    [db, setId]
  );

  useEffect(() => {
    return () => {
      if (weightTimer.current) clearTimeout(weightTimer.current);
      if (repsTimer.current) clearTimeout(repsTimer.current);
    };
  }, []);

  const handleWeightChange = (text: string) => {
    setLocalWeight(text);
    debouncedWriteWeight(text);
  };

  const handleRepsChange = (text: string) => {
    setLocalReps(text);
    debouncedWriteReps(text);
  };

  const handleToggleComplete = async () => {
    const next = isCompleted ? 0 : 1;
    setIsCompleted(!isCompleted);
    await db.execute("UPDATE exercise_sets SET completed = ? WHERE id = ?", [
      next,
      setId,
    ]);
    if (next === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComplete();
    }
  };

  const handleDelete = async () => {
    await db.execute("DELETE FROM exercise_sets WHERE id = ?", [setId]);
  };

  const inputStyle = {
    color: colors.foreground,
    backgroundColor: colors.muted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    minHeight: 44,
    textAlign: "center" as const,
    flex: 1,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
        paddingHorizontal: 12,
      }}
    >
      {/* Set number */}
      <Text
        style={{
          color: colors.mutedFg,
          fontSize: 14,
          fontWeight: "600",
          width: 28,
          textAlign: "center",
        }}
      >
        {setNumber}
      </Text>

      {/* Weight */}
      <TextInput
        testID={`weight-input-${exerciseIndex}-${setIndex}`}
        value={localWeight}
        onChangeText={handleWeightChange}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.mutedFg}
        style={inputStyle}
      />

      {/* Reps */}
      <TextInput
        testID={`reps-input-${exerciseIndex}-${setIndex}`}
        value={localReps}
        onChangeText={handleRepsChange}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.mutedFg}
        style={inputStyle}
      />

      {/* RPE */}
      <Pressable
        onPress={() => onRpePick(setId, rpe)}
        style={{
          minHeight: 44,
          minWidth: 44,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.muted,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: rpe != null ? colors.foreground : colors.mutedFg, fontSize: 14 }}>
          {rpe != null ? rpe : "RPE"}
        </Text>
      </Pressable>

      {/* Complete checkmark */}
      <Pressable
        testID={`complete-set-${exerciseIndex}-${setIndex}`}
        onPress={handleToggleComplete}
        style={{
          minHeight: 44,
          minWidth: 44,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isCompleted ? colors.green : colors.muted,
          borderRadius: 6,
        }}
      >
        <Check
          size={18}
          color={isCompleted ? "hsl(224, 71%, 4%)" : colors.mutedFg}
        />
      </Pressable>

      {/* Delete */}
      <Pressable
        onPress={handleDelete}
        style={{
          minHeight: 44,
          minWidth: 32,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Minus size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}
