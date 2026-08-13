/**
 * Empty state for the focus-mode screen.
 * Shows when no exercises have been added yet.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

interface WorkoutEmptyStateProps {
  onAddExercise(): void;
}

export function WorkoutEmptyState({ onAddExercise }: WorkoutEmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
      accessibilityLabel="No exercises added. Tap to add one."
    >
      <Text
        style={{
          color: colors.text2,
          fontSize: 18,
          fontFamily: fonts.displaySemi,
          letterSpacing: -0.2,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        No exercises yet
      </Text>
      <Text
        style={{
          color: colors.text3,
          fontSize: 14,
          fontFamily: fonts.bodyRegular,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Add your first exercise to start logging your workout.
      </Text>
      <Pressable
        testID="add-exercise-button"
        accessibilityLabel="Add exercise"
        accessibilityRole="button"
        onPress={onAddExercise}
        style={{
          backgroundColor: colors.blue,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 28,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: colors.blueInk,
            fontSize: 15,
            fontFamily: fonts.bodySemi,
          }}
        >
          Add Exercise
        </Text>
      </Pressable>
    </View>
  );
}
