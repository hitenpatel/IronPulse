import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import {
  PersonStanding,
  Bike,
  Waves,
  Mountain,
  Footprints,
  Activity,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { formatElapsed } from "@/lib/workout-utils";
import {
  calculatePace,
  formatPace,
  metersToKm,
  metersToMiles,
} from "@/lib/geo-utils";

const colors = {
  bg: "hsl(224, 71%, 4%)",
  card: "hsl(216, 34%, 17%)",
  foreground: "hsl(213, 31%, 91%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(215, 20%, 65%)",
  success: "hsl(142, 71%, 45%)",
};

const typeIcons: Record<string, LucideIcon> = {
  run: PersonStanding,
  cycle: Bike,
  swim: Waves,
  hike: Mountain,
  walk: Footprints,
  other: Activity,
};

const typeLabels: Record<string, string> = {
  run: "Run",
  cycle: "Cycle",
  swim: "Swim",
  hike: "Hike",
  walk: "Walk",
  other: "Other",
};

export default function SummaryScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{
    sessionId: string;
    type: string;
  }>();
  const { user } = useAuth();
  const isMetric = user?.unitSystem !== "imperial";

  const { data } = useQuery(
    `SELECT * FROM cardio_sessions WHERE id = ?`,
    [sessionId]
  );

  const session = data?.[0] as any;

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const Icon = typeIcons[type ?? session.type] ?? Activity;
  const label = typeLabels[type ?? session.type] ?? "Activity";
  const duration = session.duration_seconds ?? 0;
  const distance = session.distance_meters ?? 0;
  const isGps = session.source === "gps";

  const displayDistance = isMetric
    ? metersToKm(distance).toFixed(2)
    : metersToMiles(distance).toFixed(2);
  const distanceUnit = isMetric ? "km" : "mi";

  const paceSecondsPerKm = calculatePace(distance, duration);
  const paceValue = isMetric
    ? formatPace(paceSecondsPerKm)
    : formatPace(Math.round(paceSecondsPerKm * 1.60934));
  const paceUnit = isMetric ? "/km" : "/mi";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        {/* Activity Header */}
        <View
          style={{
            alignItems: "center",
            marginBottom: 32,
            gap: 12,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 40,
              width: 80,
              height: 80,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={36} color={colors.success} />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colors.foreground,
            }}
          >
            {label}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {isGps ? "GPS Tracked" : "Manual Entry"}
          </Text>
        </View>

        {/* Main Stats */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            <StatBlock label="Duration" value={formatElapsed(duration)} />
            <StatBlock
              label={`Distance (${distanceUnit})`}
              value={displayDistance}
            />
            <StatBlock label={`Pace (${paceUnit})`} value={paceValue} />
          </View>
        </View>

        {/* Optional Stats */}
        {(session.elevation_gain_m != null ||
          session.avg_heart_rate != null ||
          session.calories != null) && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              {session.elevation_gain_m != null && (
                <StatBlock
                  label="Elevation (m)"
                  value={String(Math.round(session.elevation_gain_m))}
                />
              )}
              {session.avg_heart_rate != null && (
                <StatBlock
                  label="Avg HR (bpm)"
                  value={String(session.avg_heart_rate)}
                />
              )}
              {session.calories != null && (
                <StatBlock
                  label="Calories"
                  value={String(session.calories)}
                />
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {session.notes ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.muted,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Notes
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
              {session.notes}
            </Text>
          </View>
        ) : null}

        {/* Route Map Thumbnail (GPS only) */}
        {isGps && session.route_file_url && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              overflow: "hidden",
              height: 200,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.muted,
                textTransform: "uppercase",
                padding: 16,
                paddingBottom: 8,
              }}
            >
              Route
            </Text>
            {/* Route map would render here if route points were available */}
          </View>
        )}

        {/* Done Button */}
        <Pressable
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginTop: 8,
          }}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.bg,
            }}
          >
            Done
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "500",
          color: colors.muted,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: colors.primary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
