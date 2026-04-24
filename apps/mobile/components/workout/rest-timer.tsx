import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { colors, fonts, radii } from "@/lib/theme";
import { BigNum, Button, UppercaseLabel } from "@/components/ui";

const DEFAULT_REST = 90;

interface RestTimerProps {
  visible: boolean;
  onDismiss: () => void;
  defaultRest?: number;
  /** Next set preview text, e.g. "Bench · 102.5 × 5". Optional. */
  nextSetLabel?: string;
}

/**
 * Rest-timer surface shown inline during a workout. Matches the handoff:
 * blue-tinted card with a 40×40 SVG ring showing countdown, "Rest"
 * uppercase label, next-set preview, +30s / Skip buttons.
 */
export function RestTimer({
  visible,
  onDismiss,
  defaultRest = DEFAULT_REST,
  nextSetLabel,
}: RestTimerProps) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(defaultRest);
  const [totalDuration, setTotalDuration] = useState(defaultRest);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setRemaining(defaultRest);
      setTotalDuration(defaultRest);
      setPaused(false);
    }
  }, [visible, defaultRest]);

  useEffect(() => {
    // Only tick while visible AND not paused. Pausing releases the
    // interval entirely so the countdown truly freezes rather than
    // skipping ahead when resumed (which happens if you just gate inside
    // the callback).
    if (!visible || paused) return;
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
  }, [visible, paused, onDismiss]);

  const adjustTime = useCallback((delta: number) => {
    setRemaining((prev) => Math.max(0, prev + delta));
    setTotalDuration((prev) => Math.max(15, prev + delta));
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Breathing glow — pulse the card's tint opacity on a 2.6s loop while the
  // timer is running, speed up on the final 10s to build urgency.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!visible) {
      glow.value = withTiming(0);
      return;
    }
    if (paused) {
      // Freeze mid-pulse when paused so the glow doesn't keep breathing.
      glow.value = withTiming(0.2);
      return;
    }
    const fast = remaining <= 10 && remaining > 0;
    const dur = fast ? 500 : 1300;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [visible, paused, remaining <= 10, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    // Shift the card tint from `blueSoft` (16% lime) up to ~32% at peak.
    opacity: 0.55 + glow.value * 0.45,
  }));

  if (!visible) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalDuration > 0 ? remaining / totalDuration : 0;

  // Ring: 40×40 with r=16 per handoff. Circumference ≈ 100.53.
  const RING_RADIUS = 16;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const dashOffset = RING_CIRC * (1 - progress);

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
      <View
        style={{
          backgroundColor: colors.blueSoft,
          borderWidth: 1,
          borderColor: colors.blueSoft,
          borderRadius: radii.card,
          paddingVertical: 10,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          overflow: "hidden",
        }}
      >
        {/* Breathing glow layer — pulses the lime tint while resting */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.blueGlow,
              borderRadius: radii.card,
            },
            glowStyle,
          ]}
        />
        {/* Ring */}
        <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Svg width={40} height={40} viewBox="0 0 40 40" style={{ position: "absolute" }}>
            <Circle
              cx={20}
              cy={20}
              r={RING_RADIUS}
              stroke={colors.bg3}
              strokeWidth={2.5}
              fill="none"
            />
            <Circle
              cx={20}
              cy={20}
              r={RING_RADIUS}
              stroke={colors.blue}
              strokeWidth={2.5}
              fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
            />
          </Svg>
          <Text
            style={{
              fontSize: 10,
              fontFamily: fonts.displaySemi,
              color: colors.text,
              fontVariant: ["tabular-nums"],
            }}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
        </View>

        {/* Label + next */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <UppercaseLabel color={colors.blue2}>Rest</UppercaseLabel>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              color: colors.text3,
              marginTop: 1,
              fontFamily: fonts.bodyRegular,
            }}
          >
            {nextSetLabel ?? "Next set coming up"}
          </Text>
        </View>

        {/* Pause / Resume */}
        <Pressable
          onPress={togglePause}
          testID="rest-timer-pause"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={paused ? "Resume rest timer" : "Pause rest timer"}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: paused ? colors.blue : colors.line,
            backgroundColor: paused ? colors.blueSoft : "transparent",
            borderRadius: radii.buttonSm,
          }}
        >
          <Text style={{ fontSize: 10, color: paused ? colors.blue2 : colors.text2, fontFamily: fonts.bodyMedium }}>
            {paused ? "Resume" : "Pause"}
          </Text>
        </Pressable>

        {/* +30 / Skip controls */}
        <Pressable
          onPress={() => adjustTime(30)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add 30 seconds"
          style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.buttonSm,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.text2, fontFamily: fonts.bodyMedium }}>
            +30s
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
          style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.buttonSm,
          }}
        >
          <Text style={{ fontSize: 10, color: colors.text2, fontFamily: fonts.bodyMedium }}>
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
