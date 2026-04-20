import { useEffect } from "react";
import { Flame } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AnimatedFlameProps {
  size?: number;
  color: string;
  /** Pulse only when streak is live. Pass false to freeze. */
  active?: boolean;
}

/**
 * Subtle breathe-pulse for the streak flame. Scales 1 → 1.12 → 1 on a ~1.6s
 * loop, with a slight counter-rotation so the silhouette looks like a flame
 * lapping rather than just scaling.
 *
 * Runs on the UI thread — no JS bridge cost per frame.
 */
export function AnimatedFlame({ size = 18, color, active = true }: AnimatedFlameProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      scale.value = withTiming(1);
      rotation.value = withTiming(0);
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    rotation.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [active, scale, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Flame size={size} color={color} />
    </Animated.View>
  );
}
