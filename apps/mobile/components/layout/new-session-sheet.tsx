import { useRef, useEffect } from "react";
import { Pressable, Text } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
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
  /** Tone colour pulled from tokens — keep adjacent to the acid-sport palette. */
  iconColor: string;
  label: string;
}> = [
  { key: "workout", icon: Dumbbell, iconColor: colors.blue2, label: "Start workout" },
  { key: "cardio", icon: Activity, iconColor: colors.green, label: "Start cardio" },
  { key: "metrics", icon: Scale, iconColor: colors.purple, label: "Log body metrics" },
];

export function NewSessionSheet({ open, onClose, onStartWorkout, onLogCardio }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (open) bottomSheetRef.current?.expand();
    else bottomSheetRef.current?.close();
  }, [open]);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
      style={[props.style, { backgroundColor: "rgba(11,13,18,0.6)" }]}
    />
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
      snapPoints={["35%"]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.bg1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.line2, width: 40, height: 4 }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 }}
      >
        {ACTIONS.map(({ key, icon: Icon, iconColor, label }) => (
          <Pressable
            key={key}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              height: 56,
              borderRadius: radii.card,
              backgroundColor: colors.bg2,
              borderWidth: 1,
              borderColor: colors.lineSoft,
              paddingHorizontal: 16,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
            onPress={() => handleAction(key)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Icon size={22} color={iconColor} />
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 15,
                fontFamily: fonts.bodyMedium,
              }}
            >
              {label}
            </Text>
            <ChevronRight size={18} color={colors.text4} />
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheet>
  );
}
