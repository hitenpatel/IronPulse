import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bike, Footprints, Heart, Mountain } from "lucide-react-native";
import { useCardioSessions, type CardioSessionRow } from "@ironpulse/sync";
import { formatElapsed } from "@/lib/workout-utils";
import { metersToKm } from "@/lib/geo-utils";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
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

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: colors.muted,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.accent,
          padding: 16,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Icon size={24} color={colors.mutedFg} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {capitalize(item.type)}
          </Text>
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 13,
              marginTop: 4,
            }}
          >
            {formatDate(item.started_at)}
          </Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
              {formatElapsed(item.duration_seconds)}
            </Text>
            {item.distance_meters != null && (
              <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
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
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Cardio" }} />
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => (
          <CardioCard
            item={item}
            onPress={() => router.push(`/history/cardio-detail/${item.id}`)}
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
            <Heart size={48} color={colors.mutedFg} />
            <Text
              style={{
                color: colors.mutedFg,
                fontSize: 16,
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
