import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { formatElapsed } from "../../lib/workout-utils";
import { colors, fonts } from "@/lib/theme";
import { BigNum, Button, UppercaseLabel } from "@/components/ui";

interface WorkoutHeaderProps {
  workoutId: string;
  name: string;
  startedAt: string;
  onCancel: () => void;
  onFinish: () => void;
  onNameChange: (name: string) => void;
}

/**
 * Matches designs/claude-design-handoff/screens-primary.jsx::ActiveWorkout
 * header — close X + workout name/timer cluster on the left, Finish sm
 * primary on the right.
 */
export function WorkoutHeader({
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
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const handleNamePress = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Workout Name",
        "Enter a new name",
        (text) => {
          if (text && text.trim()) onNameChange(text.trim());
        },
        "plain-text",
        name,
      );
    } else {
      Alert.alert("Workout Name", `Current: ${name}`);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
        }}
      >
        <Pressable
          onPress={onCancel}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel workout"
          style={{
            width: 30,
            height: 30,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} color={colors.text2} />
        </Pressable>

        <Pressable onPress={handleNamePress} style={{ flex: 1 }}>
          <UppercaseLabel color={colors.blue2}>{name}</UppercaseLabel>
          <BigNum size={18} color={colors.text} style={{ marginTop: 1 }}>
            {formatElapsed(elapsed)}
          </BigNum>
        </Pressable>

        <Button
          variant="primary"
          size="sm"
          onPress={onFinish}
          testID="finish-button"
          style={{ paddingHorizontal: 12 }}
        >
          Finish
        </Button>
      </View>
    </SafeAreaView>
  );
}
