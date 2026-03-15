import { View, type ViewProps } from "react-native";

export function Card({ className = "", children, ...props }: ViewProps & { children: React.ReactNode }) {
  return (
    <View className={`rounded-xl border border-border bg-card p-4 ${className}`} {...props}>
      {children}
    </View>
  );
}
