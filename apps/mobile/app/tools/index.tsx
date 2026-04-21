import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calculator, Dumbbell, ChevronRight } from "lucide-react-native";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TOOLS: Array<{
  screen: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  tint: string;
  tintBg: string;
}> = [
  {
    screen: "ToolsOneRepMax",
    label: "1RM calculator",
    desc: "Estimate your one-rep max from a working set",
    icon: Calculator,
    tint: colors.blue2,
    tintBg: colors.blueSoft,
  },
  {
    screen: "ToolsPlates",
    label: "Plate calculator",
    desc: "Plate breakdown for any target weight",
    icon: Dumbbell,
    tint: colors.green,
    tintBg: colors.greenSoft,
  },
];

export default function ToolsScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <View style={{ padding: spacing.gutter, gap: 10 }}>
        {TOOLS.map(({ screen, label, desc, icon: Icon, tint, tintBg }) => (
          <Pressable
            key={screen}
            onPress={() => navigation.navigate(screen as never)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
              backgroundColor: colors.bg1,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.line,
              paddingVertical: spacing.cardPaddingY,
              paddingHorizontal: spacing.cardPaddingX,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: tintBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={22} color={tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.body.size,
                  fontFamily: fonts.bodySemi,
                  fontWeight: "600",
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  color: colors.text3,
                  fontSize: typography.caption.size,
                  fontFamily: fonts.bodyRegular,
                  marginTop: 2,
                }}
              >
                {desc}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.text4} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
