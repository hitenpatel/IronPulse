import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  green: "hsl(142, 71%, 45%)",
};

const DEFAULT_REST = 90;

interface RestTimerProps {
  visible: boolean;
  onDismiss: () => void;
}

export function RestTimer({ visible, onDismiss }: RestTimerProps) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(DEFAULT_REST);
  const [totalDuration, setTotalDuration] = useState(DEFAULT_REST);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when becoming visible
  useEffect(() => {
    if (visible) {
      setRemaining(DEFAULT_REST);
      setTotalDuration(DEFAULT_REST);
      setExpanded(false);
    }
  }, [visible]);

  // Countdown logic
  useEffect(() => {
    if (!visible) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, onDismiss]);

  const adjustTime = useCallback((delta: number) => {
    setRemaining((prev) => Math.max(0, prev + delta));
    setTotalDuration((prev) => Math.max(15, prev + delta));
  }, []);

  if (!visible) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalDuration > 0 ? remaining / totalDuration : 0;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom + 8,
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={{
          backgroundColor: colors.muted,
          borderRadius: 16,
          padding: 16,
          alignItems: "center",
        }}
      >
        {/* Progress bar */}
        <View
          style={{
            width: "100%",
            height: 4,
            backgroundColor: colors.accent,
            borderRadius: 2,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(progress * 100, 100)}%`,
              height: "100%",
              backgroundColor: colors.green,
              borderRadius: 2,
            }}
          />
        </View>

        {/* Countdown */}
        <Text
          style={{
            color: colors.foreground,
            fontSize: 36,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>

        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 13,
            marginTop: 4,
          }}
        >
          Rest Timer
        </Text>

        {/* Adjustment buttons (shown when expanded) */}
        {expanded && (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 12,
            }}
          >
            <Pressable
              onPress={() => adjustTime(-15)}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
                -15s
              </Text>
            </Pressable>

            <Pressable
              onPress={() => adjustTime(15)}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
                +15s
              </Text>
            </Pressable>
          </View>
        )}

        {/* Skip button */}
        <Pressable
          onPress={onDismiss}
          style={{
            marginTop: 12,
            paddingVertical: 8,
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Skip
          </Text>
        </Pressable>
      </Pressable>
    </View>
  );
}
