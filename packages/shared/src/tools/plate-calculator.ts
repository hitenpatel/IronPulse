/**
 * Plate loader. Given a target total weight and a bar weight, returns the
 * plates to hang on each side to reach the target, greedy from heaviest.
 *
 * Returns null if the bar alone exceeds the target (user has entered an
 * impossible load).
 *
 * Default plate sizes (kg): 25, 20, 15, 10, 5, 2.5, 1.25. Imperial gyms
 * should pass `platesKg: PLATE_SIZES_LB` and convert target + bar to lb.
 */

export const PLATE_SIZES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const PLATE_SIZES_LB = [45, 35, 25, 10, 5, 2.5] as const;

export interface PlateCalcResult {
  /** Plates loaded on one side of the bar, ordered heaviest first. */
  platesPerSide: Array<{ size: number; count: number }>;
  /** Weight per side that couldn't be matched to available plates. */
  remainder: number;
  /** Actual total (bar + 2 × plates placed), rounded. */
  totalLoaded: number;
}

export function calculatePlates(
  targetTotal: number,
  barWeight: number,
  plates: readonly number[] = PLATE_SIZES_KG,
): PlateCalcResult | null {
  const weightPerSide = (targetTotal - barWeight) / 2;
  if (weightPerSide < 0) return null;

  let remaining = weightPerSide;
  const platesPerSide: Array<{ size: number; count: number }> = [];

  for (const plate of plates) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      platesPerSide.push({ size: plate, count });
      remaining -= count * plate;
    }
  }

  // Round off floating-point noise from the subtraction chain.
  remaining = Math.round(remaining * 1000) / 1000;
  const totalLoaded = barWeight + (weightPerSide - remaining) * 2;

  return {
    platesPerSide,
    remainder: remaining,
    totalLoaded: Math.round(totalLoaded * 100) / 100,
  };
}

export function validatePlateCalcInput(target: number, bar: number): string | null {
  if (isNaN(target) || target <= 0) return "Please enter a valid target weight.";
  if (isNaN(bar) || bar < 0) return "Please enter a valid bar weight.";
  if (target < bar) return "Target is less than the bar itself.";
  return null;
}
