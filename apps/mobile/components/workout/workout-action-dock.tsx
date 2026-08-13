/**
 * Action dock — sole Complete Set control and secondary actions.
 *
 * Primary: lime Complete Set button (colors.blue per theme alias).
 * Secondary: Undo (conditional), Add Exercise, Discard.
 * When editing a completed set: Return to Next Set replaces Complete.
 *
 * Uses a regular-layout dock that reserves bottom space.
 * No absolute overlay — KeyboardAvoidingView parent handles lift.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";

export type DockMode = "complete" | "return-to-next" | "loading" | "retry";

interface WorkoutActionDockProps {
  currentSetId: string | null;
  mode: DockMode;
  canUndo: boolean;
  /** Disabled while saving */
  savingState?: "idle" | "saving" | "slow" | "retry";
  onComplete(): void;
  onUndo(): void;
  onAddExercise(): void;
  onDiscard(): void;
  onRetry(): void;
  onReturnToNext(): void;
}

export function WorkoutActionDock({
  currentSetId,
  mode,
  canUndo,
  savingState = "idle",
  onComplete,
  onUndo,
  onAddExercise,
  onDiscard,
  onRetry,
  onReturnToNext,
}: WorkoutActionDockProps) {
  const insets = useSafeAreaInsets();
  const isRetry = mode === "retry" || savingState === "retry";

  return (
    <View
      style={{
        paddingBottom: insets.bottom + 8,
        paddingTop: 10,
        paddingHorizontal: 16,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        gap: 10,
      }}
    >
      {/* Primary action */}
      {mode === "return-to-next" ? (
        <Pressable
          accessibilityLabel="Return to next set"
          accessibilityRole="button"
          onPress={onReturnToNext}
          style={[primaryBtn, { backgroundColor: colors.green }]}
        >
          <Text style={[primaryLabel, { color: colors.text }]}>Return to Next Set</Text>
        </Pressable>
      ) : isRetry ? (
        <Pressable
          testID={currentSetId ? `complete-set-${currentSetId}` : "complete-set"}
          accessibilityLabel="Retry saving set"
          accessibilityRole="button"
          onPress={onRetry}
          style={[primaryBtn, { backgroundColor: colors.red }]}
        >
          <Text style={[primaryLabel, { color: colors.text }]}>Retry</Text>
        </Pressable>
      ) : (
        <Pressable
          testID={currentSetId ? `complete-set-${currentSetId}` : "complete-set"}
          accessibilityLabel="Complete set"
          accessibilityRole="button"
          onPress={onComplete}
          disabled={savingState === "saving" || savingState === "slow"}
          style={[
            primaryBtn,
            { backgroundColor: colors.blue },
            (savingState === "saving" || savingState === "slow") && { opacity: 0.6 },
          ]}
        >
          <Text style={[primaryLabel, { color: colors.blueInk }]}>
            {savingState === "slow" ? "Saving…" : "Complete Set"}
          </Text>
        </Pressable>
      )}

      {/* Secondary actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {canUndo && (
          <Pressable
            accessibilityLabel="Undo last set"
            accessibilityRole="button"
            onPress={onUndo}
            style={secondaryBtn}
          >
            <Text style={secondaryLabel}>Undo</Text>
          </Pressable>
        )}

        <Pressable
          testID="add-exercise-button"
          accessibilityLabel="Add exercise"
          accessibilityRole="button"
          onPress={onAddExercise}
          style={[secondaryBtn, { flex: 1 }]}
        >
          <Text style={secondaryLabel}>+ Exercise</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Discard workout"
          accessibilityRole="button"
          onPress={onDiscard}
          style={[secondaryBtn, { backgroundColor: colors.bg2 }]}
        >
          <Text style={[secondaryLabel, { color: colors.red }]}>Discard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const primaryBtn = {
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 56,
};

const primaryLabel = {
  fontSize: 17,
  fontFamily: fonts.bodySemi,
  letterSpacing: -0.2,
};

const secondaryBtn = {
  backgroundColor: colors.bg3,
  borderRadius: 10,
  paddingVertical: 11,
  paddingHorizontal: 16,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 44,
};

const secondaryLabel = {
  color: colors.text2,
  fontSize: 13,
  fontFamily: fonts.bodySemi,
};
