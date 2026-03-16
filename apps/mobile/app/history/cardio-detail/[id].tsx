import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import { RouteMap } from "@/components/cardio/route-map";
import { formatElapsed } from "@/lib/workout-utils";
import {
  calculatePace,
  formatPace,
  metersToKm,
} from "@/lib/geo-utils";
import { trpc } from "@/lib/trpc";
import {
  getHRZone,
  getHRZoneName,
  getHRZoneColor,
  getZoneBoundaries,
} from "@ironpulse/shared";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
};

interface CardioRow {
  id: string;
  type: string;
  source: string;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  elevation_gain_m: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  notes: string | null;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.muted,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.mutedFg,
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 20,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function CardioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: rows } = useQuery<CardioRow>(
    "SELECT * FROM cardio_sessions WHERE id = ?",
    [id ?? ""]
  );
  const session = rows?.[0];

  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (!session || session.source !== "gps" || !id) return;
    let cancelled = false;

    setLoadingRoute(true);
    trpc.cardio.getRoutePoints
      .query({ sessionId: id })
      .then((points) => {
        if (!cancelled) setRoutePoints(points as RoutePoint[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.source, id]);

  if (!session) return null;

  const distanceKm =
    session.distance_meters != null ? metersToKm(session.distance_meters) : null;
  const pace =
    session.distance_meters != null
      ? calculatePace(session.distance_meters, session.duration_seconds)
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: capitalize(session.type) }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Route map for GPS sessions */}
        {session.source === "gps" && (
          <View
            style={{
              height: 240,
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {loadingRoute ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator color={colors.foreground} />
              </View>
            ) : routePoints.length >= 2 ? (
              <RouteMap routePoints={routePoints} interactive={false} />
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.mutedFg, fontSize: 14 }}>
                  No route data
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Stats row 1: Duration + Distance */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <StatCard label="Duration" value={formatElapsed(session.duration_seconds)} />
          <StatCard
            label="Distance"
            value={distanceKm != null ? `${distanceKm.toFixed(2)} km` : "-"}
          />
        </View>

        {/* Stats row 2: Pace + Elevation */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <StatCard
            label="Pace"
            value={pace != null ? `${formatPace(pace)} /km` : "-"}
          />
          <StatCard
            label="Elevation"
            value={
              session.elevation_gain_m != null
                ? `${Math.round(session.elevation_gain_m)} m`
                : "-"
            }
          />
        </View>

        {/* Heart Rate Zone */}
        {session.avg_heart_rate != null && session.max_heart_rate != null && (() => {
          const zone = getHRZone(Number(session.avg_heart_rate), Number(session.max_heart_rate));
          const zoneName = getHRZoneName(zone);
          const zoneColor = getHRZoneColor(zone);
          const boundaries = getZoneBoundaries(Number(session.max_heart_rate));
          return (
            <View
              style={{
                backgroundColor: colors.muted,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Text style={{ color: colors.mutedFg, fontSize: 13, fontWeight: "600" }}>
                  Heart Rate Zone
                </Text>
                <View style={{ backgroundColor: zoneColor, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    Zone {zone} — {zoneName}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end" }}>
                {boundaries.map((b) => (
                  <View
                    key={b.zone}
                    style={{
                      flex: 1,
                      height: b.zone === zone ? 24 : 12,
                      borderRadius: 3,
                      backgroundColor: b.zone === zone ? b.color : `${b.color}33`,
                      borderWidth: b.zone === zone ? 2 : 0,
                      borderColor: b.zone === zone ? b.color : "transparent",
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 3, marginTop: 4 }}>
                {boundaries.map((b) => (
                  <Text
                    key={b.zone}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 10,
                      color: colors.mutedFg,
                      fontWeight: b.zone === zone ? "700" : "400",
                    }}
                  >
                    Z{b.zone}
                  </Text>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Notes */}
        {session.notes != null && session.notes.length > 0 && (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              padding: 16,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: colors.mutedFg,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Notes
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 15, lineHeight: 22 }}>
              {session.notes}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
