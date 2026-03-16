const ZONE_NAMES: Record<number, string> = {
  1: "Recovery",
  2: "Aerobic",
  3: "Tempo",
  4: "Threshold",
  5: "VO2max",
};

const ZONE_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#22C55E",
  3: "#EAB308",
  4: "#F97316",
  5: "#EF4444",
};

const ZONE_THRESHOLDS = [0.6, 0.7, 0.8, 0.9];

/**
 * Returns the heart rate zone (1-5) for a given heart rate and max HR.
 * Zone 1: <60%, Zone 2: 60-70%, Zone 3: 70-80%, Zone 4: 80-90%, Zone 5: 90%+
 */
export function getHRZone(heartRate: number, maxHR: number): number {
  const pct = heartRate / maxHR;
  if (pct < ZONE_THRESHOLDS[0]) return 1;
  if (pct < ZONE_THRESHOLDS[1]) return 2;
  if (pct < ZONE_THRESHOLDS[2]) return 3;
  if (pct < ZONE_THRESHOLDS[3]) return 4;
  return 5;
}

/** Returns the name for a heart rate zone (1-5). */
export function getHRZoneName(zone: number): string {
  return ZONE_NAMES[zone] ?? "Unknown";
}

/** Returns the color for a heart rate zone (1-5). */
export function getHRZoneColor(zone: number): string {
  return ZONE_COLORS[zone] ?? "#6B7280";
}

/** Estimates max heart rate from age using the simple 220-age formula. */
export function estimateMaxHR(age: number): number {
  return 220 - age;
}

/** Returns zone boundaries for a given max HR. */
export function getZoneBoundaries(
  maxHR: number
): { zone: number; min: number; max: number; name: string; color: string }[] {
  const pcts = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  return [1, 2, 3, 4, 5].map((zone, i) => ({
    zone,
    min: Math.round(maxHR * pcts[i]),
    max: Math.round(maxHR * pcts[i + 1]),
    name: getHRZoneName(zone),
    color: getHRZoneColor(zone),
  }));
}
