import { View, Text } from "react-native";

interface BadgeProps {
  children: string;
  variant?: "default" | "success" | "warning" | "destructive" | "gold" | "orange";
}

// Pulse design system — NativeWind classes backed by tailwind.config.ts tokens
const variantClasses: Record<NonNullable<BadgeProps["variant"]>, { bg: string; text: string }> = {
  default:     { bg: "bg-primary/15",     text: "text-primary" },
  success:     { bg: "bg-success/15",     text: "text-success" },
  warning:     { bg: "bg-warning/15",     text: "text-warning" },
  destructive: { bg: "bg-destructive/15", text: "text-destructive" },
  gold:        { bg: "bg-pr-gold/15",     text: "text-pr-gold" },
  orange:      { bg: "bg-streak-orange/15", text: "text-streak-orange" },
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  const { bg, text } = variantClasses[variant];

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{children}</Text>
    </View>
  );
}
