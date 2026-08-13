/**
 * Finish review sheet.
 *
 * Shows completed/incomplete counts, duration, and Finish/Return actions.
 * Flush only flushes touched-draft and DB-backed incomplete sets.
 * Never persists untouched suggestions.
 */

import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/lib/theme";
import { formatElapsed } from "@/lib/workout-utils";

interface WorkoutFinishSheetProps {
  visible: boolean;
  completedCount: number;
  incompleteCount: number;
  touchedUnsavedCount: number;
  durationSeconds: number;
  flushing?: boolean;
  flushError?: string | null;
  onFinish(): void;
  onReturn(): void;
}

export function WorkoutFinishSheet({
  visible,
  completedCount,
  incompleteCount,
  touchedUnsavedCount,
  durationSeconds,
  flushing,
  flushError,
  onFinish,
  onReturn,
}: WorkoutFinishSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onReturn}
      accessibilityViewIsModal
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: colors.bg1,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontFamily: fonts.displaySemi,
              letterSpacing: -0.3,
              marginBottom: 16,
            }}
          >
            Finish Workout?
          </Text>

          {/* Stats */}
          <View style={{ gap: 8, marginBottom: 20 }}>
            <StatRow label="Duration" value={formatElapsed(durationSeconds)} />
            <StatRow label="Completed sets" value={String(completedCount)} />
            {incompleteCount > 0 && (
              <StatRow
                label="Incomplete sets"
                value={String(incompleteCount)}
                accent={colors.amber}
              />
            )}
            {touchedUnsavedCount > 0 && (
              <StatRow
                label="Unsaved draft sets"
                value={String(touchedUnsavedCount)}
                accent={colors.text3}
              />
            )}
          </View>

          {flushError && (
            <Text
              style={{
                color: colors.red,
                fontSize: 13,
                fontFamily: fonts.bodyRegular,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {flushError}
            </Text>
          )}

          {/* Actions */}
          <Pressable
            accessibilityLabel="Finish workout anyway"
            accessibilityRole="button"
            onPress={onFinish}
            disabled={flushing}
            style={{
              backgroundColor: colors.blue,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 10,
              minHeight: 52,
              opacity: flushing ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.blueInk, fontSize: 16, fontFamily: fonts.bodySemi }}>
              {flushing ? "Saving…" : "Finish Anyway"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Return to workout"
            accessibilityRole="button"
            onPress={onReturn}
            style={{
              backgroundColor: colors.bg3,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              minHeight: 48,
            }}
          >
            <Text style={{ color: colors.text2, fontSize: 15, fontFamily: fonts.bodySemi }}>
              Return
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: colors.text3, fontSize: 14, fontFamily: fonts.bodyRegular }}>
        {label}
      </Text>
      <Text
        style={{
          color: accent ?? colors.text,
          fontSize: 14,
          fontFamily: fonts.bodySemi,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
