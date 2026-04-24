import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActionSheetIOS, Alert, Animated as RNAnimated, Platform, Pressable, Text, TextInput, View } from "react-native";
import { usePowerSync } from "@powersync/react";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "@/lib/haptics";
import { Check, Minus, Trash2 } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

type SetType = "working" | "warmup" | "dropset" | "failure";

const SET_TYPE_LABEL: Record<SetType, string> = {
  working: "Working",
  warmup: "Warm-up",
  dropset: "Drop set",
  failure: "To failure",
};

const SET_TYPE_BADGE: Record<Exclude<SetType, "working">, { letter: string; bg: string; fg: string }> = {
  warmup: { letter: "W", bg: colors.amberSoft, fg: colors.amber },
  dropset: { letter: "D", bg: colors.purpleSoft, fg: colors.purple },
  failure: { letter: "F", bg: colors.red, fg: "#FFFFFF" },
};

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
  /** Working / warmup / dropset / failure. Defaults to working for legacy rows. */
  type?: SetType | string;
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
  type,
  exerciseIndex,
  setIndex,
  previousSet,
  isActive,
  onComplete,
  onRpePick,
}: SetRowProps) {
  const db = usePowerSync();
  const currentType: SetType = (
    type === "warmup" || type === "dropset" || type === "failure" ? type : "working"
  ) as SetType;
  const badge = currentType === "working" ? null : SET_TYPE_BADGE[currentType];

  const handleChangeType = useCallback(
    async (next: SetType) => {
      if (next === currentType) return;
      Haptics.selectionAsync().catch(() => {});
      await db.execute(
        "UPDATE exercise_sets SET type = ? WHERE id = ?",
        [next, setId],
      );
    },
    [db, setId, currentType],
  );

  const handleLongPressType = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const options: SetType[] = ["working", "warmup", "dropset", "failure"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Set type",
          options: [...options.map((o) => SET_TYPE_LABEL[o]), "Cancel"],
          cancelButtonIndex: options.length,
        },
        (idx) => {
          if (idx < options.length) handleChangeType(options[idx]!);
        },
      );
    } else {
      Alert.alert("Set type", "How should this set be classified?", [
        ...options.map((o) => ({
          text: SET_TYPE_LABEL[o] + (o === currentType ? " ✓" : ""),
          onPress: () => handleChangeType(o),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  }, [currentType, handleChangeType]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await db.execute("DELETE FROM exercise_sets WHERE id = ?", [setId]);
  };

  const swipeableRef = useRef<Swipeable>(null);

  // Red reveal behind the row when the user swipes left. Trash icon scales
  // up as the row slides further, giving that iOS-native "about to commit"
  // feedback. Releasing past `rightThreshold` triggers onSwipeableOpen →
  // handleDelete.
  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
  ) => {
    const iconScale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
      extrapolate: "clamp",
    });
    return (
      <View
        style={{
          width: 88,
          backgroundColor: colors.red,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RNAnimated.View style={{ transform: [{ scale: iconScale }] }}>
          <Trash2 size={22} color="#FFFFFF" />
        </RNAnimated.View>
      </View>
    );
  };

  const prevLabel =
    previousSet?.weight_kg != null && previousSet?.reps != null
      ? `${previousSet.weight_kg}×${previousSet.reps}`
      : previousSet?.reps != null
        ? `${previousSet.reps}r`
        : EMPTY_PLACEHOLDER;

  // v2: row backgrounds and value-text contrast
  // - isActive (lime bg)  → everything renders in solid blueInk. No opacity
  //   dimming on lime — translucent ink is illegible against the bright
  //   primary.
  // - isCompleted         → text3 (muted, greyed)
  // - default             → text2
  const valueColor = isActive
    ? colors.blueInk
    : isCompleted
      ? colors.text3
      : colors.text2;
  const placeholderColor = isActive ? colors.blueInk : colors.text4;

  const textInputStyle = {
    color: valueColor,
    backgroundColor: "transparent",
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
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={1.6}
      rightThreshold={60}
      onSwipeableOpen={(direction) => {
        if (direction === "right") {
          handleDelete();
        }
      }}
      // Active-row margins moved to the Swipeable wrapper so the red reveal
      // panel slots flush against the row's rounded edge.
      containerStyle={{
        marginHorizontal: isActive ? 8 : 0,
        marginVertical: isActive ? 3 : 0,
        borderRadius: isActive ? radii.button : 0,
        overflow: "hidden",
      }}
    >
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: isActive ? 8 : 4,
        paddingHorizontal: 12,
        // v2: solid lime bg on the active row. All text/icons ON this row
        // MUST render in blueInk — lime on warm-white is illegible.
        backgroundColor: isActive ? colors.blue : "transparent",
      }}
    >
      {/* Set number / complete indicator. Long-press opens the set-type
          picker (working / warm-up / drop set / failure). Non-working types
          render a coloured letter badge instead of the plain number so the
          row's role is legible at a glance. */}
      <Pressable
        onLongPress={handleLongPressType}
        testID={`set-row-type-${exerciseIndex}-${setIndex}`}
        hitSlop={4}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`Set type: ${SET_TYPE_LABEL[currentType]}. Long-press to change.`}
        style={{ width: 28, alignItems: "center" }}
      >
        {isActive ? (
          <Text
            style={{
              color: colors.blueInk,
              fontSize: 8.5,
              fontFamily: fonts.monoSemi,
              textAlign: "center",
              letterSpacing: 1.3,
            }}
          >
            NEXT
          </Text>
        ) : badge ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: badge.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: badge.fg,
                fontSize: 11,
                fontFamily: fonts.monoSemi,
              }}
            >
              {badge.letter}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: isCompleted ? colors.green : colors.text3,
              fontSize: 13,
              fontFamily: fonts.monoMedium,
              textAlign: "center",
            }}
          >
            {isCompleted ? "✓" : setNumber}
          </Text>
        )}
      </Pressable>

      {/* PREV — read-only, mono small */}
      <Text
        numberOfLines={1}
        style={{
          flex: 1.2,
          color: isActive ? colors.blueInk : colors.text4,
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
        placeholderTextColor={placeholderColor}
        underlineColorAndroid="transparent"
        style={textInputStyle}
      />

      {/* REPS */}
      <TextInput
        testID={`reps-input-${exerciseIndex}-${setIndex}`}
        value={localReps}
        onChangeText={handleRepsChange}
        keyboardType="number-pad"
        placeholder={EMPTY_PLACEHOLDER}
        placeholderTextColor={placeholderColor}
        underlineColorAndroid="transparent"
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
          // On the lime active row the inner chip reads as a cutout — use
          // a subtle ink-tinted bg instead of bg3 which would look bruised.
          backgroundColor:
            rpe != null
              ? isActive
                ? "rgba(15,21,8,0.12)"
                : colors.bg3
              : "transparent",
          borderRadius: radii.buttonSm,
        }}
      >
        <Text
          style={{
            color: isActive
              ? colors.blueInk
              : rpe != null
                ? colors.text
                : colors.text4,
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
          // On the lime row the check button sits on lime — flip it to
          // ink so the icon (blueInk) stays legible against the tile.
          backgroundColor: isCompleted
            ? colors.green
            : isActive
              ? colors.blueInk
              : colors.bg3,
          borderRadius: radii.buttonSm,
        }}
      >
        <Check
          size={16}
          color={isActive ? colors.blue : isCompleted ? colors.white : colors.text3}
        />
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
        <Minus size={14} color={isActive ? colors.blueInk : colors.text4} />
      </Pressable>
    </View>
    </Swipeable>
  );
}
