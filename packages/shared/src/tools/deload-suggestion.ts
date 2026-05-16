export interface WeeklyExerciseVolume {
  weekStart: string; // ISO date "YYYY-MM-DD" (Monday of the week)
  exerciseId: string;
  exerciseName: string;
  volumeKg: number;
}

export interface DeloadSuggestion {
  suggested: boolean;
  stagnantLifts: string[];
  deloadWeightFactor: number;
}

export const DELOAD_WEIGHT_FACTOR = 0.6;
const STAGNANT_WEEKS = 4;
const STAGNANT_TOLERANCE = 0.05; // ±5%

function isStagnant(volumes: number[]): boolean {
  if (volumes.length < STAGNANT_WEEKS) return false;
  const window = volumes.slice(-STAGNANT_WEEKS);
  const ref = window[0]!;
  if (ref === 0) return false;
  return window.every((v) => Math.abs(v - ref) / ref <= STAGNANT_TOLERANCE);
}

/**
 * Identifies whether a deload is warranted based on per-exercise weekly volume.
 * All three of the user's top lifts (by total volume) must show ≤5% week-over-week
 * change for at least 4 consecutive weeks. Requires at least 3 distinct exercises
 * with 4+ weeks of data each.
 */
export function detectStagnantVolume(
  weeklyVolumes: WeeklyExerciseVolume[],
): DeloadSuggestion {
  const byExercise = new Map<
    string,
    { name: string; weeks: Map<string, number> }
  >();

  for (const entry of weeklyVolumes) {
    if (!byExercise.has(entry.exerciseId)) {
      byExercise.set(entry.exerciseId, {
        name: entry.exerciseName,
        weeks: new Map(),
      });
    }
    const ex = byExercise.get(entry.exerciseId)!;
    ex.weeks.set(
      entry.weekStart,
      (ex.weeks.get(entry.weekStart) ?? 0) + entry.volumeKg,
    );
  }

  const ranked = [...byExercise.entries()]
    .map(([id, { name, weeks }]) => ({
      id,
      name,
      totalVolume: [...weeks.values()].reduce((a, b) => a + b, 0),
      sortedVolumes: [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 3);

  if (ranked.length < 3) {
    return {
      suggested: false,
      stagnantLifts: [],
      deloadWeightFactor: DELOAD_WEIGHT_FACTOR,
    };
  }

  const stagnantLifts = ranked
    .filter((ex) => isStagnant(ex.sortedVolumes))
    .map((ex) => ex.name);

  if (stagnantLifts.length === 3) {
    return {
      suggested: true,
      stagnantLifts,
      deloadWeightFactor: DELOAD_WEIGHT_FACTOR,
    };
  }

  return {
    suggested: false,
    stagnantLifts: [],
    deloadWeightFactor: DELOAD_WEIGHT_FACTOR,
  };
}
