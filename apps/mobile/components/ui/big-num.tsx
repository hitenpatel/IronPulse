import { Text, type StyleProp, type TextStyle } from "react-native";
import { colors, fonts } from "@/lib/theme";

interface BigNumProps {
  children: React.ReactNode;
  /** px size — handoff uses 16–36 across hero metrics */
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Tabular-numerics display text used for hero metrics, stats, set weights.
 * Matches handoff `.bignum` — Space Grotesk 500, tight tracking, tnum.
 */
export function BigNum({ children, size = 20, color = colors.text, style }: BigNumProps) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.displayMedium,
          fontSize: size,
          letterSpacing: size >= 20 ? -0.5 : -0.2,
          color,
          // RN 0.76+: tabular-nums via `fontVariant`
          fontVariant: ["tabular-nums"],
          lineHeight: size * 1.05,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
