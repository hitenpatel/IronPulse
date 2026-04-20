import { Text, type StyleProp, type TextStyle } from "react-native";
import { colors, fonts, tracking } from "@/lib/theme";

interface Props {
  children: React.ReactNode;
  /** `blue2` for greeting date labels ("Sun · 19 Apr · Week 3"). Defaults to text-3. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * 10px uppercase section label used throughout the handoff (`uppercase-xs`).
 * +0.14em tracking → ~1.4 at 10px.
 */
export function UppercaseLabel({ children, color = colors.text3, style }: Props) {
  return (
    <Text
      style={[
        {
          fontSize: 12,
          color,
          textTransform: "uppercase",
          letterSpacing: tracking.caps,
          fontFamily: fonts.bodySemi,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
