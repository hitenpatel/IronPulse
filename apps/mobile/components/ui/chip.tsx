import { View, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, fonts } from "@/lib/theme";

export type ChipTone = "blue" | "green" | "amber" | "purple" | "mono";

interface ChipProps {
  tone?: ChipTone;
  dot?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const toneStyles: Record<ChipTone, { color: string; bg: string }> = {
  blue: { color: colors.blue2, bg: colors.blueSoft },
  green: { color: colors.green, bg: colors.greenSoft },
  amber: { color: colors.amber, bg: colors.amberSoft },
  purple: { color: colors.purple, bg: colors.purpleSoft },
  mono: { color: colors.text2, bg: colors.bg3 },
};

export function Chip({ tone = "mono", dot, children, style }: ChipProps) {
  const t = toneStyles[tone];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingVertical: 2,
          paddingHorizontal: 7,
          borderRadius: radii.chip,
          backgroundColor: t.bg,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: t.color,
          }}
        />
      ) : null}
      <Text
        style={{
          fontSize: 10,
          color: t.color,
          letterSpacing: 0.2,
          fontFamily: fonts.bodySemi,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
