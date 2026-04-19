import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface BadgeProps {
  children: string;
  variant?: "default" | "success" | "warning" | "destructive" | "gold" | "orange";
}

// Token-driven variants. `default` maps to cobalt (the v2 "accent" slot);
// `success` uses cobalt too since v2 replaces the v1 lime-as-green mapping.
const variantStyles: Record<NonNullable<BadgeProps["variant"]>, { bg: string; text: string }> = {
  default: { bg: colors.greenSoft, text: colors.green },
  success: { bg: colors.greenSoft, text: colors.green },
  warning: { bg: colors.amberSoft, text: colors.amber },
  destructive: { bg: "rgba(255,61,90,0.14)", text: colors.red },
  gold: { bg: colors.amberSoft, text: colors.amber },
  orange: { bg: "rgba(255,122,60,0.14)", text: colors.orange },
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  const { bg, text } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: {
    // v2 chip floor: 10px minimum. Was 12 but tokens now drive everything.
    fontSize: 10.5,
    fontFamily: fonts.bodySemi,
  },
});
