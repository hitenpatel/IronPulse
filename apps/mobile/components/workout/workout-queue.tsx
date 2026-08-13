/**
 * Queue of upcoming and recently completed exercises in focus mode.
 * Compact view — tap to expand/edit a completed set.
 */

import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";

export interface QueueItem {
  workoutExerciseId: string;
  exerciseName: string;
  supersetGroup: number | null;
  currentSetNumber: number;
  totalSets: number;
  isCompleted: boolean;
}

interface WorkoutQueueProps {
  items: QueueItem[];
  onItemTap?(workoutExerciseId: string): void;
}

export function WorkoutQueue({ items, onItemTap }: WorkoutQueueProps) {
  if (items.length === 0) return null;

  const upcoming = items.filter((i) => !i.isCompleted);
  const completed = items.filter((i) => i.isCompleted);

  return (
    <View>
      {upcoming.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
          <Text style={sectionLabel}>Up Next</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {upcoming.map((item) => (
              <QueueChip
                key={item.workoutExerciseId}
                item={item}
                onPress={onItemTap ? () => onItemTap(item.workoutExerciseId) : undefined}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {completed.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <Text style={sectionLabel}>Done</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {completed.map((item) => (
              <QueueChip
                key={item.workoutExerciseId}
                item={item}
                completed
                onPress={onItemTap ? () => onItemTap(item.workoutExerciseId) : undefined}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function QueueChip({
  item,
  completed,
  onPress,
}: {
  item: QueueItem;
  completed?: boolean;
  onPress?: () => void;
}) {
  const isSuperset = item.supersetGroup != null;

  return (
    <Pressable
      testID={`queue-exercise-${item.workoutExerciseId}`}
      accessibilityLabel={`${completed ? "Completed" : "Upcoming"}: ${item.exerciseName}${isSuperset ? " (superset)" : ""}, set ${item.currentSetNumber} of ${item.totalSets}`}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: completed ? colors.bg2 : colors.bg3,
        borderRadius: radii.card,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        minWidth: 96,
        minHeight: 48,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: completed ? colors.line : (isSuperset ? colors.green : colors.line2),
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: completed ? colors.text3 : colors.text2,
          fontSize: 12,
          fontFamily: fonts.bodySemi,
        }}
      >
        {item.exerciseName}
      </Text>
      <Text
        style={{
          color: colors.text4,
          fontSize: 10,
          fontFamily: fonts.bodyRegular,
          marginTop: 2,
        }}
      >
        {completed ? "✓ done" : `${item.currentSetNumber}/${item.totalSets}`}
      </Text>
    </Pressable>
  );
}

const sectionLabel = {
  color: colors.text3,
  fontSize: 10,
  fontFamily: fonts.bodySemi,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
  marginBottom: 6,
};
