import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { formatElapsed } from "../../lib/workout-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  destructive: "hsl(0, 63%, 31%)",
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
      edges={["top"] as any}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
        }}
      >
        {/* Cancel */}
        <Pressable
          onPress={onCancel}
          hitSlop={8}
          style={{ minWidth: 60 }}
        >
          <Text
            style={{
              color: colors.destructive,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Cancel
          </Text>
        </Pressable>

        {/* Center: Name + Timer */}
        <Pressable
          onPress={handleNamePress}
          style={{ alignItems: "center", flex: 1 }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 17,
              fontWeight: "700",
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              fontVariant: ["tabular-nums"],
              marginTop: 2,
            }}
          >
            {formatElapsed(elapsed)}
          </Text>
        </Pressable>

        {/* Finish */}
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
