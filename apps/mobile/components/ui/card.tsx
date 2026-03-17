import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";

export function Card({ style, children, ...props }: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "hsl(216, 34%, 17%)",
          backgroundColor: "hsl(224, 71%, 4%)",
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
