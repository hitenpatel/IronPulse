import { Pressable, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { Chip } from "@/components/ui";
import { capitalize, humanizeEnumValue, statusTone } from "./labels";
import type { InjurySummary } from "./types";

interface InjuryRowProps {
  injury: InjurySummary;
  onPress: () => void;
}

export function InjuryRow({ injury, onPress }: InjuryRowProps) {
  const bodyParts = injury.bodyParts.map(capitalize).join(", ");
  const injuredAt = new Date(injury.injuredAt);

  return (
    <Pressable
      testID={`recovery-injury-row-${injury.id}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.bg1,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radii.rowList,
        padding: 12,
        marginBottom: 6,
      }}
      accessibilityRole="button"
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 14, color: colors.text, fontFamily: fonts.bodySemi }}>
            {humanizeEnumValue(injury.injuryType)}
          </Text>
          <Chip tone={statusTone(injury.status)}>{humanizeEnumValue(injury.status)}</Chip>
        </View>
        <Text style={{ fontSize: 11.5, color: colors.text3, fontFamily: fonts.bodyRegular }}>
          {bodyParts} · {injuredAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.amberSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 13, color: colors.amber, fontFamily: fonts.bodyBold }}>
          {injury.severity}
        </Text>
      </View>
    </Pressable>
  );
}
