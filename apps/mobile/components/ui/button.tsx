import { Pressable, Text, View, type PressableProps } from "react-native";
import { colors, radii, fonts, shadows } from "@/lib/theme";

interface ButtonProps extends PressableProps {
  /**
   * Design handoff: `default` = bg-2/line; `primary` = brand blue with glow;
   * `ghost` = transparent with border; `destructive` = red; `outline` alias for ghost.
   */
  variant?: "default" | "primary" | "ghost" | "outline" | "destructive";
  size?: "md" | "sm";
  children: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, object> = {
  default: { backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line },
  primary: { backgroundColor: colors.blue, ...shadows.primaryButton },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  destructive: { backgroundColor: colors.red },
};

const textColorMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: colors.text,
  // Primary = lime. On-lime text MUST be blueInk, not white.
  primary: colors.blueInk,
  ghost: colors.text2,
  outline: colors.text2,
  destructive: colors.white,
};

export function Button({ variant = "default", size = "md", children, style, ...props }: ButtonProps) {
  const isSm = size === "sm";
  return (
    <Pressable
      style={({ pressed }) => [
        {
          borderRadius: isSm ? radii.buttonSm : radii.button,
          paddingVertical: isSm ? 6 : 11,
          paddingHorizontal: isSm ? 10 : 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: pressed ? 0.85 : 1,
        },
        variantStyles[variant],
        style as object,
      ]}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          style={{
            fontSize: isSm ? 11.5 : 13.5,
            color: textColorMap[variant],
            fontFamily: fonts.bodySemi,
          }}
        >
          {children}
        </Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{children}</View>
      )}
    </Pressable>
  );
}
