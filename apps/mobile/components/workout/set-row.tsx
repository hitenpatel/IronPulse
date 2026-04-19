import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { usePowerSync } from "@powersync/react";
import * as Haptics from "@/lib/haptics";
import { Check, Minus } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface PreviousSet {
  weight_kg: number | null;
  reps: number | null;
  set_number: number;
}

interface SetRowProps {
  setId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
  exerciseIndex: number;
  setIndex: number;
  previousSet?: PreviousSet;
  /** When true, this row renders with a blue-tinted bg — the "next up" row. */
  isActive?: boolean;
  onComplete: () => void;
  onRpePick: (setId: string, currentRpe: number | null) => void;
}

const EMPTY_PLACEHOLDER = "—";

/**
 * A single set inside an exercise card. Matches the 5-column grid in the
 * handoff: # · PREV · KG · REPS · RPE · ✓ · delete.
 */
export function SetRow({
  setId,
  setNumber,
  weightKg,
  reps,
  rpe,
  completed,
  exerciseIndex,
  setIndex,
  previousSet,
  isActive,
  onComplete,
  onRpePick,
}: SetRowProps) {
  const db = usePowerSync();

  const [localWeight, setLocalWeight] = useState(
    weightKg != null ? String(weightKg) : "",
  );
  const [localReps, setLocalReps] = useState(reps != null ? String(reps) : "");
  const [isCompleted, setIsCompleted] = useState(completed === 1);

  const weightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        db.execute("UPDATE exercise_sets SET weight_kg = ? WHERE id = ?", [val, setId]);
      }, 500);
    },
    [db, setId],
  );

  const debouncedWriteReps = useCallback(
    (value: string) => {
      if (repsTimer.current) clearTimeout(repsTimer.current);
      repsTimer.current = setTimeout(() => {
        const parsed = parseInt(value, 10);
        const val = isNaN(parsed) ? null : parsed;
        db.execute("UPDATE exercise_sets SET reps = ? WHERE id = ?", [val, setId]);
      }, 500);
    },
    [db, setId],
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
    await db.execute("UPDATE exercise_sets SET completed = ? WHERE id = ?", [next, setId]);
    if (next === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComplete();
    }
  };

  const handleDelete = async () => {
    await db.execute("DELETE FROM exercise_sets WHERE id = ?", [setId]);
  };

  const prevLabel =
    previousSet?.weight_kg != null && previousSet?.reps != null
      ? `${previousSet.weight_kg}×${previousSet.reps}`
      : previousSet?.reps != null
        ? `${previousSet.reps}r`
        : EMPTY_PLACEHOLDER;

  const valueColor = isCompleted ? colors.text3 : colors.text;
  const inputBg = isActive ? "rgba(0,119,255,0.10)" : "transparent";

  const textInputStyle = {
    color: valueColor,
    backgroundColor: inputBg,
    borderRadius: radii.buttonSm,
    paddingHorizontal: 4,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: fonts.displayMedium,
    textAlign: "center" as const,
    flex: 1,
    minHeight: 36,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor: isActive ? "rgba(0,119,255,0.06)" : "transparent",
        marginHorizontal: isActive ? 4 : 0,
        marginVertical: isActive ? 2 : 0,
        borderRadius: isActive ? radii.buttonSm : 0,
      }}
    >
      {/* Set number / complete indicator */}
      <Text
        style={{
          color: isCompleted ? colors.green : colors.text3,
          fontSize: 13,
          fontFamily: fonts.monoMedium,
          width: 28,
          textAlign: "center",
        }}
      >
        {isCompleted ? "✓" : setNumber}
      </Text>

      {/* PREV — read-only, mono small */}
      <Text
        numberOfLines={1}
        style={{
          flex: 1.2,
          color: colors.text4,
          fontSize: 11,
          fontFamily: fonts.monoRegular,
          textAlign: "center",
        }}
      >
        {prevLabel}
      </Text>

      {/* KG */}
      <TextInput
        testID={`weight-input-${exerciseIndex}-${setIndex}`}
        value={localWeight}
        onChangeText={handleWeightChange}
        keyboardType="decimal-pad"
        placeholder={EMPTY_PLACEHOLDER}
        placeholderTextColor={colors.text4}
        style={textInputStyle}
      />

      {/* REPS */}
      <TextInput
        testID={`reps-input-${exerciseIndex}-${setIndex}`}
        value={localReps}
        onChangeText={handleRepsChange}
        keyboardType="number-pad"
        placeholder={EMPTY_PLACEHOLDER}
        placeholderTextColor={colors.text4}
        style={textInputStyle}
      />

      {/* RPE */}
      <Pressable
        onPress={() => onRpePick(setId, rpe)}
        hitSlop={4}
        style={{
          width: 44,
          minHeight: 36,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: rpe != null ? colors.bg3 : "transparent",
          borderRadius: radii.buttonSm,
        }}
      >
        <Text
          style={{
            color: rpe != null ? colors.text : colors.text4,
            fontSize: 11,
            fontFamily: fonts.monoMedium,
          }}
        >
          {rpe != null ? rpe : EMPTY_PLACEHOLDER}
        </Text>
      </Pressable>

      {/* Complete toggle */}
      <Pressable
        testID={`complete-set-${exerciseIndex}-${setIndex}`}
        onPress={handleToggleComplete}
        hitSlop={4}
        style={{
          width: 44,
          minHeight: 36,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isCompleted ? colors.green : isActive ? colors.blue : colors.bg3,
          borderRadius: radii.buttonSm,
        }}
      >
        <Check size={16} color={isCompleted || isActive ? colors.white : colors.text3} />
      </Pressable>

      {/* Delete */}
      <Pressable
        onPress={handleDelete}
        hitSlop={4}
        style={{
          width: 32,
          minHeight: 36,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Minus size={14} color={colors.text4} />
      </Pressable>
    </View>
  );
}
