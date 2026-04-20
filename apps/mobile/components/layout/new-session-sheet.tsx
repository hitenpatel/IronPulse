import { useEffect, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Dumbbell, Activity, Scale, ChevronRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, fonts, radii } from "@/lib/theme";
import type { RootStackParamList } from "../../App";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartWorkout?: () => void;
  onLogCardio?: () => void;
}

type ActionKey = "workout" | "cardio" | "metrics";

const ACTIONS: ReadonlyArray<{
  key: ActionKey;
  icon: typeof Dumbbell;
  iconColor: string;
  label: string;
}> = [
  { key: "workout", icon: Dumbbell, iconColor: colors.blue2, label: "Start workout" },
  { key: "cardio", icon: Activity, iconColor: colors.green, label: "Start cardio" },
  { key: "metrics", icon: Scale, iconColor: colors.purple, label: "Log body metrics" },
];

// Soft, responsive spring — feels closer to native iOS sheets than gorhom's default.
const SHEET_SPRING = {
  damping: 22,
  stiffness: 240,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const;

function ActionRow({
  icon: Icon,
  iconColor,
  label,
  onPress,
  index,
}: {
  icon: typeof Dumbbell;
  iconColor: string;
  label: string;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 55).springify().damping(18).mass(0.9)}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 60,
          borderRadius: radii.card,
          backgroundColor: colors.bg2,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        <Icon size={24} color={iconColor} />
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 16,
            fontFamily: fonts.bodyMedium,
          }}
        >
          {label}
        </Text>
        <ChevronRight size={18} color={colors.text4} />
      </Pressable>
    </Animated.View>
  );
}

export function NewSessionSheet({ open, onClose, onStartWorkout, onLogCardio }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (open) bottomSheetRef.current?.expand();
    else bottomSheetRef.current?.close();
  }, [open]);

  const renderBackdrop = useMemo(
    () => (props: BottomSheetBackdropProps) =>
      (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.55}
          pressBehavior="close"
          style={[props.style, { backgroundColor: "rgba(11,13,18,1)" }]}
        />
      ),
    [],
  );

  const handleAction = (key: ActionKey) => {
    onClose();
    if (key === "workout") onStartWorkout?.();
    else if (key === "cardio") onLogCardio?.();
    else if (key === "metrics") navigation.navigate("Settings" as never);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["38%"]}
      enablePanDownToClose
      animationConfigs={SHEET_SPRING}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.bg1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.line2,
        width: 44,
        height: 4,
      }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10 }}
      >
        <Animated.View entering={FadeInUp.duration(280)}>
          <Text
            style={{
              color: colors.text3,
              fontSize: 12,
              fontFamily: fonts.bodySemi,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            New Session
          </Text>
        </Animated.View>
        <View style={{ gap: 10 }}>
          {ACTIONS.map(({ key, icon, iconColor, label }, index) => (
            <ActionRow
              key={key}
              index={index}
              icon={icon}
              iconColor={iconColor}
              label={label}
              onPress={() => handleAction(key)}
            />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
