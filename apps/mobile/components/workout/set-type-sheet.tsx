import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { SET_TYPE_ORDER, SET_TYPE_LABEL, type SetType } from "@/lib/set-type";

export type { SetType };

const DESCRIPTIONS: Record<SetType, string> = {
  working: "Counts toward PRs and volume.",
  warmup: "Excluded from PR detection.",
  dropset: "Excluded from PR detection.",
  failure: "Excluded from PR detection.",
};

const BADGES: Record<SetType, { letter: string; bg: string; fg: string }> = {
  working: { letter: "•", bg: colors.bg3, fg: colors.text2 },
  warmup: { letter: "W", bg: colors.amberSoft, fg: colors.amber },
  dropset: { letter: "D", bg: colors.purpleSoft, fg: colors.purple },
  failure: { letter: "F", bg: colors.red, fg: "#FFFFFF" },
};

const OPTIONS = SET_TYPE_ORDER.map((type) => ({
  type,
  label: SET_TYPE_LABEL[type],
  description: DESCRIPTIONS[type],
  badge: BADGES[type],
}));

interface SetTypeSheetProps {
  visible: boolean;
  current: SetType;
  onDismiss: () => void;
  onSelect: (next: SetType) => void;
}

// Android's Alert.alert only renders 3 buttons; a Modal lets us show all 4 options consistently across platforms.
export function SetTypeSheet({
  visible,
  current,
  onDismiss,
  onSelect,
}: SetTypeSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <Pressable
        onPress={onDismiss}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          testID="set-type-sheet"
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
              marginBottom: 14,
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
              Set type
            </Text>
            <Pressable
              onPress={onDismiss}
              hitSlop={10}
              testID="set-type-sheet-close"
            >
              <X size={20} color={colors.text3} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            {OPTIONS.map((opt) => {
              const selected = opt.type === current;
              return (
                <Pressable
                  key={opt.type}
                  testID={`set-type-${opt.type}`}
                  onPress={() => onSelect(opt.type)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected ? colors.blue : colors.lineSoft,
                    backgroundColor: selected ? colors.blueSoft : colors.bg2,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: opt.badge.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: opt.badge.fg,
                        fontSize: 12,
                        fontFamily: fonts.monoSemi,
                      }}
                    >
                      {opt.badge.letter}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontFamily: fonts.bodySemi,
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.text3,
                        fontSize: 12,
                        fontFamily: fonts.bodyRegular,
                        marginTop: 2,
                      }}
                    >
                      {opt.description}
                    </Text>
                  </View>
                  {selected && <Check size={16} color={colors.blue} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
