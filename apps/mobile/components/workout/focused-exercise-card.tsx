/**
 * The single expanded exercise card in focus mode.
 *
 * Shows: exercise name, superset badge, previous performance,
 * the FocusedSetEditor for the current set, and set list.
 */

import React from "react";
import { Pressable, Text, View } from "react-native";
import { FocusedSetEditor } from "./focused-set-editor";
import type { SetDraft } from "@/lib/workout-set-draft";
import { colors, fonts, radii } from "@/lib/theme";

interface SetRowData {
  id: string;
  set_number: number;
  type?: string | null;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: 0 | 1;
}

interface FocusedExerciseCardProps {
  workoutExerciseId: string;
  exerciseName: string;
  equipment?: string | null;
  supersetGroup: number | null;
  exerciseIndex: number;
  currentSetId: string;
  sets: SetRowData[];
  draft: SetDraft;
  previousPerformance?: string | null;
  onFieldChange(field: "weight" | "reps" | "rpe", value: string): void;
  onCompletedSetTap?(setId: string): void;
  saving?: boolean;
}

export function FocusedExerciseCard({
  workoutExerciseId,
  exerciseName,
  supersetGroup,
  exerciseIndex,
  currentSetId,
  sets,
  draft,
  previousPerformance,
  onFieldChange,
  onCompletedSetTap,
  saving,
}: FocusedExerciseCardProps) {
  const isSuperset = supersetGroup != null;
  const badgeColor = isSuperset ? colors.green : colors.blue;
  const badgeTextColor = isSuperset ? colors.text : colors.blueInk;

  return (
    <View
      testID={`focused-exercise-${workoutExerciseId}`}
      accessibilityLabel={`Current exercise: ${exerciseName}`}
      style={{
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: isSuperset ? colors.green : colors.blue,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingTop: 20,
        paddingBottom: 4,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Badge */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 14,
          paddingVertical: 2,
          paddingHorizontal: 8,
          paddingBottom: 3,
          backgroundColor: badgeColor,
          borderBottomLeftRadius: 5,
          borderBottomRightRadius: 5,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.monoSemi,
            fontSize: 8.5,
            color: badgeTextColor,
            letterSpacing: 1.3,
          }}
        >
          {isSuperset ? `B${exerciseIndex + 1} · SUPERSET` : `A${exerciseIndex + 1}`}
        </Text>
      </View>

      {/* Exercise name */}
      <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontFamily: fonts.displaySemi,
            letterSpacing: -0.3,
          }}
          numberOfLines={2}
        >
          {exerciseName}
        </Text>
        {previousPerformance ? (
          <Text
            style={{
              color: colors.text3,
              fontSize: 12,
              fontFamily: fonts.bodyRegular,
              marginTop: 2,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, color: colors.text2 }}>Last: </Text>
            {previousPerformance}
          </Text>
        ) : null}
      </View>

      {/* Set list (completed + incomplete, current highlighted) */}
      {sets.map((set, idx) => {
        const isCurrent = set.id === currentSetId;
        const isCompleted = set.completed === 1;
        return (
          <View key={set.id}>
            {isCurrent ? (
              <FocusedSetEditor
                setId={set.id}
                draft={draft}
                onFieldChange={onFieldChange}
                onComplete={() => {}}
                saving={saving}
              />
            ) : (
              <Pressable
                onPress={isCompleted && onCompletedSetTap ? () => onCompletedSetTap(set.id) : undefined}
                accessibilityLabel={
                  isCompleted
                    ? `Set ${idx + 1}: ${set.weight_kg != null ? `${set.weight_kg}kg × ` : ""}${set.reps ?? "—"} reps, completed`
                    : `Set ${idx + 1}: upcoming`
                }
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  opacity: isCompleted ? 1 : 0.5,
                }}
              >
                <Text
                  style={{
                    color: isCompleted ? colors.text2 : colors.text4,
                    fontSize: 13,
                    fontFamily: fonts.bodyRegular,
                    flex: 1,
                  }}
                >
                  Set {idx + 1}
                  {isCompleted && set.reps != null
                    ? `  ${set.weight_kg != null ? `${set.weight_kg}kg × ` : ""}${set.reps} reps`
                    : ""}
                </Text>
                {isCompleted && (
                  <Text style={{ color: colors.blue, fontSize: 11, fontFamily: fonts.bodySemi }}>
                    ✓
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
