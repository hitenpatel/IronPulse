import React from "react";
import { View, Text, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, radii, fonts, spacing } from "@/lib/theme";

interface RowListProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bordered grouped list container. Child `Row` components get a top border
 * between them, matching the handoff `.row-list` primitive.
 */
export function RowList({ children, style }: RowListProps) {
  const items = React.Children.toArray(children);
  return (
    <View
      style={[
        {
          backgroundColor: colors.bg1,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          borderRadius: radii.rowList,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={{
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.lineSoft,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export type RowTone = "blue" | "green" | "amber" | "purple" | "mono";

interface RowProps {
  /** Leading 28×28 colored tile. Pass a node (usually a Lucide icon) to render inside. */
  leading?: React.ReactNode;
  leadingTone?: RowTone;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-side meta like a timestamp or kg value */
  right?: React.ReactNode;
  /** Show chevron-right on the far right (ignored if `right` supplied) */
  chevron?: boolean;
  onPress?: () => void;
  testID?: string;
}

const leadingBg: Record<RowTone, { bg: string; fg: string }> = {
  blue: { bg: colors.blueSoft, fg: colors.blue2 },
  green: { bg: colors.greenSoft, fg: colors.green },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  purple: { bg: colors.purpleSoft, fg: colors.purple },
  mono: { bg: colors.bg3, fg: colors.text2 },
};

export function Row({
  leading,
  leadingTone = "mono",
  title,
  subtitle,
  right,
  chevron,
  onPress,
  testID,
}: RowProps) {
  const tone = leadingBg[leadingTone];
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: spacing.rowPaddingY,
        paddingHorizontal: spacing.rowPaddingX,
      }}
    >
      {leading !== undefined ? (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: tone.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* The icon's color is controlled by the caller; the tile background is tone.bg */}
          {React.isValidElement(leading)
            ? React.cloneElement(leading as React.ReactElement<any>, { color: tone.fg })
            : leading}
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === "string" ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.text,
              fontFamily: fonts.body,
            }}
          >
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 10.5,
                color: colors.text3,
                marginTop: 1,
                fontFamily: fonts.body,
              }}
            >
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {right !== undefined ? (
        typeof right === "string" ? (
          <Text style={{ fontSize: 10, color: colors.text4, fontFamily: fonts.body }}>{right}</Text>
        ) : (
          right
        )
      ) : chevron ? (
        <ChevronRight size={16} color={colors.text4} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} testID={testID} android_ripple={{ color: colors.bg3 }}>
        {body}
      </Pressable>
    );
  }
  return body;
}
