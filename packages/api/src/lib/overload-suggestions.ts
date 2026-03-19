export interface OverloadSuggestion {
  suggestedWeightKg: number;
  suggestedReps: number;
  reason: string;
}

export function calculateOverloadSuggestion(
  previousSets: { weightKg: number; reps: number; rpe: number | null; completed: boolean }[],
): OverloadSuggestion | null {
  if (previousSets.length === 0) return null;

  // Use the best completed set from the last session
  const bestSet = previousSets
    .filter(s => s.completed && s.weightKg > 0)
    .sort((a, b) => b.weightKg - a.weightKg || b.reps - a.reps)[0];

  if (!bestSet) return null;

  const rpe = bestSet.rpe ?? 8; // Default RPE assumption

  if (rpe <= 7 && bestSet.reps >= 8) {
    // Low RPE + hit reps → increase weight by 2.5kg
    return {
      suggestedWeightKg: bestSet.weightKg + 2.5,
      suggestedReps: bestSet.reps,
      reason: "RPE was low — try increasing weight",
    };
  } else if (rpe >= 9) {
    // High RPE → keep same weight, focus on form
    return {
      suggestedWeightKg: bestSet.weightKg,
      suggestedReps: bestSet.reps,
      reason: "High effort last time — maintain and focus on form",
    };
  } else {
    // Normal progression: same weight, try +1 rep or +2.5kg
    if (bestSet.reps < 12) {
      return {
        suggestedWeightKg: bestSet.weightKg,
        suggestedReps: bestSet.reps + 1,
        reason: "Try one more rep at the same weight",
      };
    } else {
      return {
        suggestedWeightKg: bestSet.weightKg + 2.5,
        suggestedReps: 8,
        reason: "Hit 12 reps — increase weight and reset reps",
      };
    }
  }
}
