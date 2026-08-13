/**
 * Focus-mode workout session header.
 * Shows: cancel button, editable/truncated workout name, elapsed time,
 * semantic progress (done / total sets), and stable finish button.
 */

import React, { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";
import { formatElapsed } from "@/lib/workout-utils";

interface WorkoutSessionHeaderProps {
  workoutId: string;
  name: string;
  startedAt: string;
  doneSets: number;
  totalSets: number;
  onCancel(): void;
  onFinish(): void;
  onNameChange(name: string): void;
}

export function WorkoutSessionHeader({
  name,
  startedAt,
  doneSets,
  totalSets,
  onCancel,
  onFinish,
  onNameChange,
}: WorkoutSessionHeaderProps) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(name);

  // Elapsed time state — updated by parent via prop; we derive display value.
  const startMs = new Date(startedAt).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = Math.round((nowMs - startMs) / 1000);

  function handleNameSubmit() {
    setEditing(false);
    const trimmed = localName.trim();
    if (trimmed && trimmed !== name) onNameChange(trimmed);
  }

  return (
    <View
      accessibilityRole="header"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 10,
        paddingHorizontal: 16,
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Cancel */}
      <Pressable
        accessibilityLabel="Cancel workout"
        accessibilityRole="button"
        onPress={onCancel}
        hitSlop={12}
        style={{ padding: 4, minWidth: 48, minHeight: 48, justifyContent: "center" }}
      >
        <X size={20} color={colors.text3} />
      </Pressable>

      {/* Centre: name + progress */}
      <View style={{ flex: 1, alignItems: "center" }}>
        {editing ? (
          <TextInput
            value={localName}
            onChangeText={setLocalName}
            onBlur={handleNameSubmit}
            onSubmitEditing={handleNameSubmit}
            autoFocus
            style={{
              color: colors.text,
              fontSize: 15,
              fontFamily: fonts.displaySemi,
              textAlign: "center",
              minWidth: 120,
            }}
            accessibilityLabel="Workout name"
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} hitSlop={4}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: 15,
                fontFamily: fonts.displaySemi,
                letterSpacing: -0.2,
              }}
            >
              {name}
            </Text>
          </Pressable>
        )}
        <Text
          style={{
            color: colors.text3,
            fontSize: 11,
            fontFamily: fonts.bodyRegular,
            marginTop: 1,
          }}
          accessibilityLabel={`${formatElapsed(elapsedSeconds)} elapsed, ${doneSets} of ${totalSets} sets done`}
        >
          {formatElapsed(elapsedSeconds)} · {doneSets}/{totalSets}
        </Text>
      </View>

      {/* Finish */}
      <Pressable
        testID="finish-button"
        accessibilityLabel="Finish workout"
        accessibilityRole="button"
        onPress={onFinish}
        style={{
          backgroundColor: colors.blue,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          minWidth: 64,
          minHeight: 36,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: colors.blueInk,
            fontSize: 13,
            fontFamily: fonts.bodySemi,
          }}
        >
          Finish
        </Text>
      </Pressable>
    </View>
  );
}
