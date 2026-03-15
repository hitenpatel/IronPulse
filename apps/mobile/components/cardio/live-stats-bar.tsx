import React from "react";
import { Text, View } from "react-native";
import { formatElapsed } from "@/lib/workout-utils";
import { formatPace, metersToKm, metersToMiles } from "@/lib/geo-utils";

const colors = {
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
};

interface LiveStatsBarProps {
  durationSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm: number;
  unitSystem: "metric" | "imperial";
}

export function LiveStatsBar({
  durationSeconds,
  distanceMeters,
  paceSecondsPerKm,
  unitSystem,
}: LiveStatsBarProps) {
  const distance =
    unitSystem === "metric"
      ? metersToKm(distanceMeters).toFixed(2)
      : metersToMiles(distanceMeters).toFixed(2);

  const distanceUnit = unitSystem === "metric" ? "km" : "mi";
  const paceUnit = unitSystem === "metric" ? "/km" : "/mi";

  const paceValue =
    unitSystem === "imperial"
      ? formatPace(Math.round(paceSecondsPerKm * 1.60934))
      : formatPace(paceSecondsPerKm);

  return (
    <View
      style={{
        backgroundColor: colors.muted,
        borderTopWidth: 1,
        borderTopColor: colors.mutedFg,
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 14,
        paddingHorizontal: 8,
      }}
    >
      <StatItem label="Duration" value={formatElapsed(durationSeconds)} />
      <StatItem label={`Distance (${distanceUnit})`} value={distance} />
      <StatItem label={`Pace (${paceUnit})`} value={paceValue} />
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text
        style={{
          color: colors.mutedFg,
          fontSize: 11,
          fontWeight: "500",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.primary,
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
