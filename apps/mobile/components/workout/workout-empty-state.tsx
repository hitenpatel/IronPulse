/**
 * Empty state for the focus-mode screen.
 * Shows when no exercises have been added yet.
 *
 * Primary CTA: Add Exercise (navigates to exercise picker).
 * Secondary shortcuts: Recent Exercises chip + Templates chip.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Dumbbell, History, FileText } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface WorkoutEmptyStateProps {
  onAddExercise(): void;
  onRecentExercises?(): void;
  onTemplates?(): void;
}

export function WorkoutEmptyState({
  onAddExercise,
  onRecentExercises,
  onTemplates,
}: WorkoutEmptyStateProps) {
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
      <Dumbbell size={36} color={colors.text4} style={{ marginBottom: 16 }} />
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
          marginBottom: 28,
        }}
      >
        Add your first exercise to start logging your workout.
      </Text>

      {/* Primary CTA */}
      <Pressable
        testID="add-exercise-button"
        accessibilityLabel="Add exercise"
        accessibilityRole="button"
        onPress={onAddExercise}
        style={{
          backgroundColor: colors.blue,
          borderRadius: radii.button,
          paddingVertical: 14,
          paddingHorizontal: 28,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          width: "100%",
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

      {/* Secondary shortcuts */}
      {(onRecentExercises || onTemplates) && (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            justifyContent: "center",
            width: "100%",
          }}
        >
          {onRecentExercises && (
            <Pressable
              testID="recent-exercises-chip"
              accessibilityLabel="Recent exercises"
              accessibilityRole="button"
              onPress={onRecentExercises}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 40,
                borderRadius: radii.button,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                backgroundColor: colors.bg2,
                paddingHorizontal: 12,
              }}
            >
              <History size={14} color={colors.text3} />
              <Text
                style={{
                  color: colors.text3,
                  fontSize: 13,
                  fontFamily: fonts.bodyMedium,
                }}
              >
                Recent
              </Text>
            </Pressable>
          )}
          {onTemplates && (
            <Pressable
              testID="templates-chip"
              accessibilityLabel="Use a template"
              accessibilityRole="button"
              onPress={onTemplates}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 40,
                borderRadius: radii.button,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                backgroundColor: colors.bg2,
                paddingHorizontal: 12,
              }}
            >
              <FileText size={14} color={colors.text3} />
              <Text
                style={{
                  color: colors.text3,
                  fontSize: 13,
                  fontFamily: fonts.bodyMedium,
                }}
              >
                Templates
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
