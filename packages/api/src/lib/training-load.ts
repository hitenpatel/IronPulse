export function calculateCardioLoad(
  durationSeconds: number,
  avgHeartRate?: number | null,
): number {
  const minutes = durationSeconds / 60;
  const hrFactor = avgHeartRate ? avgHeartRate / 180 : 0.8;
  return minutes * hrFactor;
}

export function calculateStrengthLoad(totalVolume: number): number {
  return totalVolume / 1000;
}

export function calculateEWMA(
  dailyLoads: { date: string; load: number }[],
  days: number,
): number {
  if (dailyLoads.length === 0) return 0;
  const alpha = 2 / (days + 1);
  let ewma = dailyLoads[0].load;
  for (let i = 1; i < dailyLoads.length; i++) {
    ewma = alpha * dailyLoads[i].load + (1 - alpha) * ewma;
  }
  return ewma;
}

export function calculateTrainingStatus(
  acuteLoad: number,
  chronicLoad: number,
) {
  const tsb = chronicLoad - acuteLoad;
  let status: "fresh" | "optimal" | "fatigued" | "overreaching";
  if (tsb > 10) status = "fresh";
  else if (tsb > -10) status = "optimal";
  else if (tsb > -30) status = "fatigued";
  else status = "overreaching";
  return { atl: acuteLoad, ctl: chronicLoad, tsb, status };
}
