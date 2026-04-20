/**
 * Warm-up set generator.
 *
 * Given a target working weight and rep count, returns a ramp of warm-up
 * sets that primes the CNS without burning glycogen. Schemes are configurable
 * — the default is a 3-set ramp at 40 / 60 / 80% with decreasing rep counts,
 * which matches the common "Prilepin-lite" strength-training warm-up.
 *
 * All weights round to the nearest plate-friendly increment (2.5 kg / 5 lb)
 * so sets are loadable on a real bar.
 */

export type WarmupScheme =
  | "strength" // 40/60/80% — 3 sets, for compound lifts
  | "hypertrophy" // 50/70% — 2 sets, for isolation work
  | "light" // 60% — 1 set, for accessory days
  | "none"; // no warm-up generated

export interface WarmupSet {
  /** Position in the warm-up ramp, 1-indexed. */
  setNumber: number;
  /** Weight to lift, rounded to the plate increment. */
  weight: number;
  /** Target reps for this warm-up. Descends as intensity climbs. */
  reps: number;
  /** Percentage of working weight this set represents (0–1). */
  pct: number;
}

export interface WarmupOptions {
  /** Working set weight to ramp toward. Must be > 0. */
  workingWeight: number;
  /** Working set rep target — shapes the warm-up rep scheme. */
  workingReps: number;
  /** Scheme template. Default `"strength"`. */
  scheme?: WarmupScheme;
  /** Plate increment the gym's smallest plates allow. Default 2.5. */
  increment?: number;
  /** Empty-bar weight — warm-ups below this clamp to the bar. Default 20. */
  barWeight?: number;
}

const SCHEMES: Record<Exclude<WarmupScheme, "none">, Array<{ pct: number; repFactor: number }>> = {
  // 40/60/80 with descending reps — classic Rippetoe-style ramp.
  strength: [
    { pct: 0.4, repFactor: 1.3 },
    { pct: 0.6, repFactor: 0.8 },
    { pct: 0.8, repFactor: 0.4 },
  ],
  // 50/70 — lighter, shorter ramp for 12+ rep work.
  hypertrophy: [
    { pct: 0.5, repFactor: 1.0 },
    { pct: 0.7, repFactor: 0.6 },
  ],
  // Single priming set at 60% for accessories.
  light: [{ pct: 0.6, repFactor: 0.8 }],
};

/**
 * Round `value` to the nearest multiple of `step`. 2.5kg-plate gyms will
 * pass 2.5; Olympic weights or imperial gyms will pass 5 (lb plate pairs).
 */
function roundToIncrement(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function generateWarmupSets(opts: WarmupOptions): WarmupSet[] {
  const {
    workingWeight,
    workingReps,
    scheme = "strength",
    increment = 2.5,
    barWeight = 20,
  } = opts;

  if (scheme === "none" || workingWeight <= 0 || workingReps <= 0) return [];

  // A working weight at or below the bar has no useful ramp — one prime set.
  if (workingWeight <= barWeight) {
    return [
      {
        setNumber: 1,
        weight: barWeight,
        reps: Math.max(5, Math.round(workingReps * 0.8)),
        pct: 1,
      },
    ];
  }

  const template = SCHEMES[scheme];
  return template.map((step, idx) => {
    const raw = workingWeight * step.pct;
    // Clamp to the bar — warming up with less than the empty bar isn't useful.
    const clamped = Math.max(raw, barWeight);
    const weight = roundToIncrement(clamped, increment);
    // At least 1 rep even if repFactor * workingReps rounds to 0.
    const reps = Math.max(1, Math.round(workingReps * step.repFactor));
    return { setNumber: idx + 1, weight, reps, pct: step.pct };
  });
}
