import { Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost";
  children: React.ReactNode;
}

const variantStyles = {
  default: { backgroundColor: "hsl(210, 40%, 98%)" },
  outline: { borderWidth: 1, borderColor: "hsl(216, 34%, 17%)", backgroundColor: "transparent" },
  ghost: { backgroundColor: "transparent" },
};

const textColorMap = {
  default: "hsl(222.2, 47.4%, 11.2%)",
  outline: "hsl(213, 31%, 91%)",
  ghost: "hsl(213, 31%, 91%)",
};

export function Button({ variant = "default", children, ...props }: ButtonProps) {
  return (
    <Pressable
      style={[
        {
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        variantStyles[variant],
      ]}
      {...props}
    >
      <Text
        style={{
          fontSize: 14,
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
