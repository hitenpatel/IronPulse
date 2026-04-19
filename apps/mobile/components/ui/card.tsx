import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

interface CardProps extends ViewProps {
  /** `tinted` wraps the card in an accent-colored translucent bg (hero variants) */
  tint?: "blue" | "purple" | "green" | "amber";
  children: React.ReactNode;
}

const tintBg: Record<NonNullable<CardProps["tint"]>, string> = {
  blue: colors.blueSoft,
  purple: colors.purpleSoft,
  green: colors.greenSoft,
  amber: colors.amberSoft,
};

export function Card({ style, tint, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: tint ? colors.blueSoft : colors.lineSoft,
          backgroundColor: tint ? tintBg[tint] : colors.bg1,
          paddingVertical: spacing.cardPaddingY,
          paddingHorizontal: spacing.cardPaddingX,
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
