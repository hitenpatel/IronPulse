/**
 * One-rep-max estimators. All three formulas below are industry-standard;
 * the `average` field blends them to smooth out the noise any single formula
 * introduces at high-rep loads.
 *
 * Reps must be in [1, 36]. At reps === 1 the lift IS the 1RM, so every
 * formula returns the original weight.
 */

export interface OneRepMaxResult {
  epley: number;
  brzycki: number;
  lander: number;
  average: number;
}

export function calculateOneRepMax(weight: number, reps: number): OneRepMaxResult {
  if (reps === 1) return { epley: weight, brzycki: weight, lander: weight, average: weight };
  const epley = weight * (1 + reps / 30);
  const brzycki = weight * (36 / (37 - reps));
  const lander = (100 * weight) / (101.3 - 2.67123 * reps);
  const average = (epley + brzycki + lander) / 3;
  return { epley, brzycki, lander, average };
}

/**
 * Standard percentage-based training loads. Use with the `average` 1RM for
 * training prescriptions.
 */
export const ONE_REP_MAX_PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60] as const;

export function percentageOfMax(oneRepMax: number, pct: number): number {
  return Math.round(oneRepMax * (pct / 100) * 10) / 10;
}

/**
 * Validate inputs for 1RM calculation. Returns null if valid, else an error
 * string suitable for display.
 */
export function validateOneRepMaxInput(weight: number, reps: number): string | null {
  if (isNaN(weight) || weight <= 0) return "Please enter a valid weight.";
  if (isNaN(reps) || reps < 1 || reps > 36) return "Reps must be between 1 and 36.";
  return null;
}
