import { useEffect, useRef } from "react";
import { Animated, ViewStyle, StyleSheet } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: "#243052", opacity },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <Animated.View style={styles.card}>
      <Skeleton width="66%" height={20} />
      <Skeleton width="50%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="75%" height={16} style={{ marginTop: 8 }} />
    </Animated.View>
  );
}

export function ListItemSkeleton() {
  return (
    <Animated.View style={styles.listItem}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <Animated.View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </Animated.View>
    </Animated.View>
  );
}

export function StatsSkeleton() {
  return (
    <Animated.View style={styles.card}>
      <Skeleton width={60} height={32} />
      <Skeleton width={100} height={12} style={{ marginTop: 8 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0F1629",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E2B47",
    padding: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#152035",
  },
});
