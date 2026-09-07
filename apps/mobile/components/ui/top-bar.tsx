import { View, Text, Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";

interface TopBarProps {
  title: string;
  /** If `onBack` is provided, render a back chevron. */
  onBack?: () => void;
  /** Right-side slot (icon button, chip, etc.) */
  right?: React.ReactNode;
  /** `lg` for big screens; defaults small. */
  size?: "sm" | "lg";
  /** Test id applied to the title `Text` — lets E2E flows assert arrival on a screen. */
  testID?: string;
}

export function TopBar({ title, onBack, right, size = "sm", testID }: TopBarProps) {
  const fontSize = size === "lg" ? 26 : onBack ? 18 : 22;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 6,
        paddingBottom: 14,
        gap: 10,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{
            width: 30,
            height: 30,
            marginLeft: -6,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color={colors.text2} />
        </Pressable>
      ) : null}
      <Text
        testID={testID}
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: fonts.displayMedium,
          fontSize,
          letterSpacing: -0.5,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
