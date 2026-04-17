import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatElapsed } from "../../lib/workout-utils";

// Pulse design system tokens
const colors = {
  background: "#060B14",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  primary: "#0077FF",
  error: "#EF4444",
  border: "#1E2B47",
};

interface WorkoutHeaderProps {
  workoutId: string;
  name: string;
  startedAt: string;
  onCancel: () => void;
  onFinish: () => void;
  onNameChange: (name: string) => void;
}

export function WorkoutHeader({
  workoutId,
  name,
  startedAt,
  onCancel,
  onFinish,
  onNameChange,
}: WorkoutHeaderProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    const tick = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const handleNamePress = () => {
    if (Platform.OS === "ios") {
      Alert.prompt("Workout Name", "Enter a new name", (text) => {
        if (text && text.trim()) onNameChange(text.trim());
      }, "plain-text", name);
    } else {
      // Android fallback — Alert.prompt is iOS-only
      Alert.alert("Workout Name", `Current: ${name}`);
    }
  };

  return (
    <SafeAreaView
      style={{ backgroundColor: colors.background }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Elapsed timer — left */}
        <Pressable
          onPress={onCancel}
          hitSlop={8}
          style={{ minWidth: 60 }}
        >
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 15,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatElapsed(elapsed)}
          </Text>
        </Pressable>

        {/* Workout name — center */}
        <Pressable
          onPress={handleNamePress}
          style={{ alignItems: "center", flex: 1 }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 18,
              fontWeight: "500",
              fontFamily: "ClashDisplay",
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
        </Pressable>

        {/* Finish — right */}
        <Pressable
          onPress={onFinish}
          testID="finish-button"
          hitSlop={8}
          style={{
            minWidth: 60,
            alignItems: "flex-end",
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            Finish
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
