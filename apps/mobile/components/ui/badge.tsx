import { View, Text, StyleSheet } from "react-native";

interface BadgeProps {
  children: string;
  variant?: "default" | "success" | "warning" | "destructive" | "gold" | "orange";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, { bg: string; text: string }> = {
  default:     { bg: "rgba(59,130,246,0.15)",  text: "#3B82F6" },   // primary
  success:     { bg: "rgba(34,197,94,0.15)",   text: "#22C55E" },   // success
  warning:     { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },   // warning
  destructive: { bg: "rgba(239,68,68,0.15)",   text: "#EF4444" },   // destructive
  gold:        { bg: "rgba(255,215,0,0.15)",   text: "#FFD700" },   // pr-gold
  orange:      { bg: "rgba(251,146,60,0.15)",  text: "#FB923C" },   // streak-orange
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
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
