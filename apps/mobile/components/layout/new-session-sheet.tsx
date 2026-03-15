import { useRef, useEffect } from "react";
import { Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Dumbbell, Activity } from "lucide-react-native";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewSessionSheet({ open, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["30%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223, 47%, 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215, 20%, 65%)" }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 8,
          }}
        >
          New Session
        </Text>

        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            borderRadius: 12,
            backgroundColor: "hsl(216, 34%, 17%)",
            padding: 16,
          }}
          onPress={() => {
            onClose();
          }}
        >
          <Dumbbell size={24} color="hsl(210, 40%, 98%)" />
          <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
            Start Workout
          </Text>
        </Pressable>

        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            borderRadius: 12,
            backgroundColor: "hsl(216, 34%, 17%)",
            padding: 16,
          }}
          onPress={() => {
            onClose();
          }}
        >
          <Activity size={24} color="hsl(210, 40%, 98%)" />
          <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
            Log Cardio
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
