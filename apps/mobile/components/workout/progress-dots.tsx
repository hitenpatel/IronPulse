import { View } from "react-native";
import { colors } from "@/lib/theme";

interface ProgressDotsProps {
  /** Total number of sets (or planned checkpoints) in the workout. */
  total: number;
  /** How many are complete. */
  completed: number;
}

/**
 * Thin horizontal segment bar used above the exercise list. 14 segments by
 * default (matches handoff). Auto-scales if the workout has more/less.
 */
export function ProgressDots({ total, completed }: ProgressDotsProps) {
  const segments = Math.max(1, total);
  const done = Math.min(segments, Math.max(0, completed));
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 3,
        paddingHorizontal: 16,
        paddingBottom: 10,
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: segments, now: done }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < done ? colors.blue : colors.bg3,
          }}
        />
      ))}
    </View>
  );
}
