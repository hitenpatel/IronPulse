import { ScrollView, Text, Pressable, View } from "react-native";
import { colors, radii, fonts } from "@/lib/theme";

export interface PillItem<K extends string = string> {
  key: K;
  label: string;
  count?: number;
}

interface PillsProps<K extends string> {
  items: PillItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}

/**
 * Horizontal scrolling filter/category pill row (used on Exercises,
 * Templates, Goals). Active pill is solid blue.
 */
export function Pills<K extends string>({ items, activeKey, onChange }: PillsProps<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingHorizontal: 2 }}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: radii.chip,
              backgroundColor: active ? colors.blue : colors.bg2,
              borderWidth: 1,
              borderColor: active ? "transparent" : colors.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: active ? colors.blueInk : colors.text2,
                fontFamily: fonts.body,
              }}
            >
              {it.label}
            </Text>
            {it.count !== undefined ? (
              <Text
                style={{
                  fontSize: 11,
                  color: active ? "rgba(15,21,8,0.65)" : colors.text4,
                  fontFamily: fonts.mono,
                }}
              >
                {it.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface SegmentedProps<K extends string> {
  items: Array<{ key: K; label: string }>;
  activeKey: K;
  onChange: (key: K) => void;
  /** Mono font + compact look for stat range toggles (4w/12w/1y). */
  dense?: boolean;
}

/**
 * Segmented control: pill slides under selected option, matching the
 * 4w/12w/1y and Active/Done/Paused patterns in the handoff.
 */
export function SegmentedControl<K extends string>({
  items,
  activeKey,
  onChange,
  dense,
}: SegmentedProps<K>) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.bg1,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: dense ? 6 : radii.button,
        padding: 2,
        gap: 3,
        alignSelf: dense ? "flex-start" : "stretch",
      }}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flex: dense ? undefined : 1,
              paddingVertical: dense ? 3 : 7,
              paddingHorizontal: dense ? 8 : 12,
              backgroundColor: active ? colors.bg3 : "transparent",
              borderRadius: dense ? 4 : 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: dense ? 10 : 12,
                fontWeight: "500",
                color: active ? colors.text : colors.text3,
                fontFamily: dense ? fonts.mono : fonts.body,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
