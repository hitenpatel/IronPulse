import { View, Text } from "react-native";

interface BadgeProps {
  children: string;
  variant?: "default" | "secondary";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const bg = variant === "default" ? "bg-primary" : "bg-muted";
  const text = variant === "default" ? "text-primary-foreground" : "text-muted-foreground";

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{children}</Text>
    </View>
  );
}
