import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../App";
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

import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

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
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: spacing.cardPaddingY,
        paddingHorizontal: spacing.cardPaddingX,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: colors.text3,
          fontSize: typography.eyebrow.size,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: typography.eyebrow.letterSpacing,
          fontFamily: fonts.bodySemi,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.title.size,
          fontWeight: "700",
          fontFamily: fonts.displayBold,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function CardioDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "HistoryCardioDetail">>();
  const id = route.params?.id;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      {/* Title set via navigation options in App.tsx */}
      <ScrollView contentContainerStyle={{ padding: spacing.gutter }}>
        {/* Route map for GPS sessions — full-width at top */}
        {session.source === "gps" && (
          <View
            style={{
              height: 240,
              borderRadius: radii.card,
              overflow: "hidden",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            {loadingRoute ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator color={colors.text} />
              </View>
            ) : routePoints.length >= 2 ? (
              <RouteMap routePoints={routePoints} interactive={false} />
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.caption.size,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  No route data
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Stats grid: 2×2 */}
        <View style={{ gap: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard label="Duration" value={formatElapsed(session.duration_seconds)} />
            <StatCard
              label="Distance"
              value={distanceKm != null ? `${distanceKm.toFixed(2)} km` : "-"}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
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
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.line,
                paddingVertical: spacing.cardPaddingY,
                paddingHorizontal: spacing.cardPaddingX,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.caption.size,
                    fontFamily: fonts.bodySemi,
                    fontWeight: "600",
                  }}
                >
                  Heart Rate Zone
                </Text>
                <View
                  style={{
                    backgroundColor: zoneColor,
                    borderRadius: radii.chip,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: colors.blueInk,
                      fontSize: typography.caption.size,
                      fontWeight: "700",
                      fontFamily: fonts.bodyBold,
                    }}
                  >
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
                      fontSize: typography.eyebrow.size,
                      fontFamily: fonts.bodyMedium,
                      color: colors.text3,
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
              backgroundColor: colors.bg1,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.line,
              paddingVertical: spacing.cardPaddingY,
              paddingHorizontal: spacing.cardPaddingX,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: colors.text3,
                fontSize: typography.caption.size,
                fontFamily: fonts.bodySemi,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Notes
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.bodySmall.size,
                lineHeight: typography.bodySmall.lineHeight,
                fontFamily: fonts.bodyRegular,
              }}
            >
              {session.notes}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
