import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { usePowerSync } from "@powersync/react";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
};

const RPE_VALUES = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

interface RpePickerProps {
  open: boolean;
  setId: string;
  currentRpe: number | null;
  onClose: () => void;
}

export function RpePicker({ open, setId, currentRpe, onClose }: RpePickerProps) {
  const db = usePowerSync();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["35%"], []);

  const handleSelect = useCallback(
    async (value: number) => {
      await db.execute("UPDATE exercise_sets SET rpe = ? WHERE id = ?", [
        value,
        setId,
      ]);
      onClose();
    },
    [db, setId, onClose]
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.muted }}
      handleIndicatorStyle={{ backgroundColor: colors.mutedFg }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 17,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Rate of Perceived Exertion
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {RPE_VALUES.map((value) => {
            const isSelected = currentRpe === value;
            return (
              <Pressable
                key={value}
                onPress={() => handleSelect(value)}
                style={{
                  width: 64,
                  height: 48,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: isSelected ? colors.primary : colors.accent,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? colors.background : colors.foreground,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
