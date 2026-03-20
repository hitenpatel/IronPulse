import { Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost" | "destructive";
  children: React.ReactNode;
}

// Pulse design system — hex values sourced from tailwind.config.ts tokens
const variantStyles = {
  default: { backgroundColor: "#0077FF" },
  outline: { borderWidth: 1, borderColor: "#1E2B47", backgroundColor: "transparent" },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: "#EF4444" },
};

const textColorMap = {
  default: "#FFFFFF",
  outline: "#F0F4F8",
  ghost: "#0077FF",
  destructive: "#FFFFFF",
};

export function Button({ variant = "default", children, ...props }: ButtonProps) {
  return (
    <Pressable
      style={[
        {
          borderRadius: 8,
          height: 48,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
        },
        variantStyles[variant],
      ]}
      {...props}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: textColorMap[variant],
        }}
      >
        {typeof children === "string" ? children : null}
      </Text>
      {typeof children !== "string" ? children : null}
    </Pressable>
  );
}
