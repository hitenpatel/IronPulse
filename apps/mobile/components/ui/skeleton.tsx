import { useEffect } from "react";
import { View, StyleSheet, type ViewStyle, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Reanimated skeleton with a moving highlight sweep. The base tile stays
 * at colors.bg3; a lighter `bg4` strip sweeps from left→right on a 1.4s loop.
 * All animation runs on the UI thread.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const progress = useSharedValue(-1);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const shimmer = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bg3,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "50%",
            backgroundColor: colors.bg4,
            opacity: 0.55,
          },
          shimmer,
        ]}
      />
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="66%" height={20} />
      <Skeleton width="50%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="75%" height={16} style={{ marginTop: 8 }} />
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function StatsSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={60} height={32} />
      <Skeleton width={100} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
});
