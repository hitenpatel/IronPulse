import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";

// Pulse design system — hex values sourced from tailwind.config.ts tokens
export function Card({ style, children, ...props }: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#1E2B47",
          backgroundColor: "#0F1629",
          padding: 16,
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
