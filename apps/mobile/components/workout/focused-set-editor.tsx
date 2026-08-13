/**
 * Editor row for the currently focused set.
 *
 * Immediate completion — final typed values stored in ONE local transaction
 * (via completeSetAtomic). No blur/debounce. The Complete button is the sole
 * trigger for persistence.
 */

import React, { useRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import type { SetDraft } from "@/lib/workout-set-draft";
import { colors, fonts } from "@/lib/theme";

interface FocusedSetEditorProps {
  setId: string;
  draft: SetDraft;
  isBodyweight?: boolean;
  /** Called with the field key and new value on each keystroke */
  onFieldChange(field: "weight" | "reps" | "rpe", value: string): void;
  /** Called when user taps Complete — triggers the atomic transaction */
  onComplete(): void;
  /** Disabled while a transaction is in progress */
  saving?: boolean;
}

export function FocusedSetEditor({
  setId,
  draft,
  isBodyweight,
  onFieldChange,
  onComplete,
  saving,
}: FocusedSetEditorProps) {
  const repsRef = useRef<TextInputType>(null);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      {/* Weight */}
      {!isBodyweight && (
        <View style={{ flex: 1, minHeight: 48 }}>
          <Text style={labelStyle}>KG</Text>
          <TextInput
            testID={`set-weight-${setId}`}
            accessibilityLabel="Weight in kilograms"
            value={draft.weight.value}
            onChangeText={(v) => onFieldChange("weight", v)}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => repsRef.current?.focus()}
            placeholder={draft.weight.touched ? undefined : "—"}
            placeholderTextColor={colors.text4}
            style={inputStyle}
          />
        </View>
      )}

      {/* Reps */}
      <View style={{ flex: 1, minHeight: 48 }}>
        <Text style={labelStyle}>REPS</Text>
        <TextInput
          ref={repsRef}
          testID={`set-reps-${setId}`}
          accessibilityLabel="Repetitions"
          value={draft.reps.value}
          onChangeText={(v) => onFieldChange("reps", v)}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder={draft.reps.touched ? undefined : "—"}
          placeholderTextColor={colors.text4}
          style={inputStyle}
        />
      </View>

      {/* RPE (optional) */}
      <View style={{ flex: 1, minHeight: 48 }}>
        <Text style={labelStyle}>RPE</Text>
        <TextInput
          testID={`set-rpe-${setId}`}
          accessibilityLabel="Rate of perceived exertion"
          value={draft.rpe.value}
          onChangeText={(v) => onFieldChange("rpe", v)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="—"
          placeholderTextColor={colors.text4}
          style={inputStyle}
        />
      </View>
    </View>
  );
}

const labelStyle = {
  color: colors.text3,
  fontSize: 9,
  fontFamily: fonts.bodySemi,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
  textAlign: "center" as const,
  marginBottom: 4,
};

const inputStyle = {
  color: colors.text,
  fontSize: 22,
  fontFamily: fonts.displaySemi,
  textAlign: "center" as const,
  backgroundColor: colors.bg2,
  borderRadius: 8,
  paddingVertical: 10,
  minHeight: 48,
};
