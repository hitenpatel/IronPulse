import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bike, Footprints, Heart, Mountain } from "lucide-react-native";
import { useCardioSessions, type CardioSessionRow } from "@ironpulse/sync";
import { formatElapsed } from "@/lib/workout-utils";
import { metersToKm } from "@/lib/geo-utils";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

// Per-activity icon tint — sticks with v2 palette slots.
const typeIconColors: Record<string, string> = {
  run: colors.green, // cobalt
  walk: colors.cyan,
  hike: colors.amber,
  cycle: colors.blue, // lime
};

const typeIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  run: Footprints,
  walk: Footprints,
  hike: Mountain,
  cycle: Bike,
};

function getTypeIcon(type: string) {
  return typeIcons[type] ?? Heart;
}

function getTypeIconColor(type: string): string {
  return typeIconColors[type] ?? colors.text3;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CardioCard({
  item,
  onPress,
}: {
  item: CardioSessionRow;
  onPress: () => void;
}) {
  const Icon = getTypeIcon(item.type);
  const iconBg = getTypeIconColor(item.type);

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 10 }}>
      <View
        style={{
          backgroundColor: colors.bg1,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.line,
          paddingVertical: spacing.cardPaddingY,
          paddingHorizontal: spacing.cardPaddingX,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Activity icon in colored circle */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${iconBg}26`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={22} color={iconBg} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.body.size,
              fontFamily: fonts.bodySemi,
              fontWeight: "600",
            }}
          >
            {capitalize(item.type)}
          </Text>
          <Text
            style={{
              color: colors.text3,
              fontSize: typography.caption.size,
              fontFamily: fonts.bodyRegular,
              marginTop: 3,
            }}
          >
            {formatDate(item.started_at)}
          </Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.caption.size,
                fontFamily: fonts.monoMedium,
              }}
            >
              {formatElapsed(item.duration_seconds)}
            </Text>
            {item.distance_meters != null && (
              <Text
                style={{
                  color: colors.text3,
                  fontSize: typography.caption.size,
                  fontFamily: fonts.monoMedium,
                }}
              >
                {metersToKm(item.distance_meters).toFixed(2)} km
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CardioHistoryScreen() {
  const { data: sessions } = useCardioSessions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.gutter, flexGrow: 1 }}
        renderItem={({ item }) => (
          <CardioCard
            item={item}
            onPress={() => navigation.navigate("HistoryCardioDetail", { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <Heart size={48} color={colors.text4} />
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.body.size,
                fontFamily: fonts.bodyRegular,
                marginTop: 16,
              }}
            >
              No cardio sessions yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
