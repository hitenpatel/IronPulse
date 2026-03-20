import { useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Dumbbell, Activity, Scale, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartWorkout?: () => void;
  onLogCardio?: () => void;
}

const ACTIONS = [
  {
    key: "workout",
    icon: Dumbbell,
    iconColor: "#0077FF",
    label: "Start Workout",
  },
  {
    key: "cardio",
    icon: Activity,
    iconColor: "#10B981",
    label: "Start Cardio",
  },
  {
    key: "metrics",
    icon: Scale,
    iconColor: "#8B5CF6",
    label: "Log Body Metrics",
  },
] as const;

export function NewSessionSheet({ open, onClose, onStartWorkout, onLogCardio }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
      style={[props.style, { backgroundColor: "rgba(6, 11, 20, 0.6)" }]}
    />
  );

  const handleAction = (key: (typeof ACTIONS)[number]["key"]) => {
    onClose();
    if (key === "workout") {
      onStartWorkout?.();
    } else if (key === "cardio") {
      onLogCardio?.();
    } else if (key === "metrics") {
      router.push("/settings/body-metrics");
    }
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
        backgroundColor: "#0F1629",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#243052",
        width: 40,
        height: 4,
      }}
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
              borderRadius: 12,
              backgroundColor: "#1A2340",
              paddingHorizontal: 16,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
            onPress={() => handleAction(key)}
          >
            <Icon size={22} color={iconColor} />
            <Text
              style={{
                flex: 1,
                color: "#F0F4F8",
                fontSize: 15,
                fontWeight: "500",
              }}
            >
              {label}
            </Text>
            <ChevronRight size={18} color="#4E6180" />
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheet>
  );
}
