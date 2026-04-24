import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import type { WarmupScheme, WarmupSet } from "@ironpulse/shared";
import { generateWarmupSets } from "@ironpulse/shared";
import { colors, fonts, radii } from "@/lib/theme";

interface WarmupSheetProps {
  visible: boolean;
  /** Working weight to ramp toward. */
  workingWeight: number;
  /** Working rep target, used to shape the warm-up rep counts. */
  workingReps: number;
  /** User's preferred default — the picker opens on this. */
  defaultScheme: Exclude<WarmupScheme, "none">;
  onDismiss: () => void;
  onConfirm: (scheme: Exclude<WarmupScheme, "none">, sets: WarmupSet[]) => void;
}

const SCHEME_META: Record<
  Exclude<WarmupScheme, "none">,
  { label: string; detail: string }
> = {
  strength: { label: "Strength", detail: "3 sets · 40 / 60 / 80%" },
  hypertrophy: { label: "Hypertrophy", detail: "2 sets · 50 / 70%" },
  light: { label: "Light", detail: "1 set · 60%" },
};

/**
 * Lightweight bottom sheet for picking a warm-up scheme and previewing
 * the generated ramp before committing it to the workout.
 */
export function WarmupSheet({
  visible,
  workingWeight,
  workingReps,
  defaultScheme,
  onDismiss,
  onConfirm,
}: WarmupSheetProps) {
  const [scheme, setScheme] = useState<Exclude<WarmupScheme, "none">>(defaultScheme);

  // Reset picker when re-opened with a different default.
  React.useEffect(() => {
    if (visible) setScheme(defaultScheme);
  }, [visible, defaultScheme]);

  const preview = generateWarmupSets({
    workingWeight,
    workingReps,
    scheme,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
      >
        <Pressable
          testID="warmup-sheet"
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg1,
            borderTopLeftRadius: radii.card,
            borderTopRightRadius: radii.card,
            borderTopWidth: 1,
            borderColor: colors.lineSoft,
            paddingTop: 16,
            paddingBottom: 28,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontFamily: fonts.displaySemi,
                letterSpacing: -0.3,
              }}
            >
              Add warm-up
            </Text>
            <Pressable onPress={onDismiss} hitSlop={10} testID="warmup-sheet-close">
              <X size={20} color={colors.text3} />
            </Pressable>
          </View>

          <Text
            style={{
              color: colors.text3,
              fontSize: 12,
              fontFamily: fonts.bodyRegular,
              marginBottom: 14,
            }}
          >
            Ramp to {workingWeight}kg × {workingReps}
          </Text>

          {/* Scheme picker */}
          <View style={{ gap: 8 }}>
            {(Object.keys(SCHEME_META) as Array<Exclude<WarmupScheme, "none">>).map((s) => {
              const selected = scheme === s;
              return (
                <Pressable
                  key={s}
                  testID={`warmup-scheme-${s}`}
                  onPress={() => setScheme(s)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected ? colors.blue : colors.lineSoft,
                    backgroundColor: selected ? colors.blueSoft : colors.bg2,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontFamily: fonts.bodySemi,
                    }}
                  >
                    {SCHEME_META[s].label}
                  </Text>
                  <Text
                    style={{
                      color: colors.text3,
                      fontSize: 12,
                      fontFamily: fonts.bodyRegular,
                    }}
                  >
                    {SCHEME_META[s].detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preview */}
          {preview.length > 0 && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: colors.bg2,
                borderRadius: 10,
              }}
            >
              {preview.map((set) => (
                <View
                  key={set.setNumber}
                  style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}
                >
                  <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.bodyRegular }}>
                    Warm-up {set.setNumber}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 12, fontFamily: fonts.bodySemi }}>
                    {set.weight}kg × {set.reps} ({Math.round(set.pct * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            testID="warmup-confirm"
            onPress={() => onConfirm(scheme, preview)}
            style={{
              marginTop: 18,
              backgroundColor: colors.blue,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.blueInk,
                fontSize: 14,
                fontFamily: fonts.bodySemi,
              }}
            >
              Add {preview.length} warm-up set{preview.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
