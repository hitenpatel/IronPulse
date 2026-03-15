import { Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost";
  children: React.ReactNode;
}

const variantClasses = {
  default: "bg-primary",
  outline: "border border-border bg-transparent",
  ghost: "bg-transparent",
};

const textClasses = {
  default: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
};

export function Button({ variant = "default", children, ...props }: ButtonProps) {
  return (
    <Pressable
      className={`rounded-lg px-4 py-3 items-center justify-center ${variantClasses[variant]} active:opacity-70`}
      {...props}
    >
      <Text className={`text-sm font-semibold ${textClasses[variant]}`}>
        {typeof children === "string" ? children : null}
      </Text>
      {typeof children !== "string" ? children : null}
    </Pressable>
  );
}
