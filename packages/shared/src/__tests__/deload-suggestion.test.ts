import { describe, it, expect } from "vitest";
import {
  detectStagnantVolume,
  DELOAD_WEIGHT_FACTOR,
  type WeeklyExerciseVolume,
} from "../tools/deload-suggestion";

function makeVolumes(
  exercises: Array<{ id: string; name: string; weeks: number[] }>,
  baseWeek = "2026-01-05", // a Monday
): WeeklyExerciseVolume[] {
  const entries: WeeklyExerciseVolume[] = [];
  for (const ex of exercises) {
    ex.weeks.forEach((vol, i) => {
      const d = new Date(baseWeek);
      d.setDate(d.getDate() + i * 7);
      const weekStart = d.toISOString().slice(0, 10);
      entries.push({ weekStart, exerciseId: ex.id, exerciseName: ex.name, volumeKg: vol });
    });
  }
  return entries;
}

describe("detectStagnantVolume", () => {
  it("returns suggested=false for empty input", () => {
    const result = detectStagnantVolume([]);
    expect(result.suggested).toBe(false);
    expect(result.stagnantLifts).toEqual([]);
  });

  it("returns suggested=false when fewer than 3 exercises have data", () => {
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [8000, 8000, 8000, 8000] },
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(false);
  });

  it("returns suggested=false when top 3 lifts have fewer than 4 weeks of data", () => {
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [8000, 8000, 8000] },
      { id: "e3", name: "Deadlift", weeks: [9000, 9000, 9000] },
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(false);
  });

  it("detects stagnation when all top 3 lifts are flat for 4 weeks", () => {
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [8000, 8000, 8000, 8000] },
      { id: "e3", name: "Deadlift", weeks: [9000, 9000, 9000, 9000] },
    ]);
    const result = detectStagnantVolume(vols);
    expect(result.suggested).toBe(true);
    expect(result.stagnantLifts).toHaveLength(3);
    expect(result.deloadWeightFactor).toBe(DELOAD_WEIGHT_FACTOR);
  });

  it("does not flag stagnation when one lift has >5% change", () => {
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [8000, 8000, 8000, 8000] },
      { id: "e3", name: "Deadlift", weeks: [9000, 9000, 9000, 9700] }, // +7.8%
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(false);
  });

  it("allows variation within ±5% tolerance", () => {
    // 5% above base of 10000 = 10500; 5% below = 9500
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10200, 9900, 10100] },
      { id: "e2", name: "Bench", weeks: [8000, 8100, 7900, 8050] },
      { id: "e3", name: "Deadlift", weeks: [9000, 9200, 8900, 9100] },
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(true);
  });

  it("uses only the last 4 weeks when more data is present", () => {
    // first 4 weeks have big growth, last 4 are flat → stagnant in final window
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [5000, 7000, 9000, 10000, 10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [4000, 5500, 7000, 8000, 8000, 8000, 8000] },
      { id: "e3", name: "Deadlift", weeks: [4500, 6000, 7500, 9000, 9000, 9000, 9000] },
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(true);
  });

  it("returns the top 3 lifts by total volume as stagnant lifts", () => {
    // e1 highest total, then e3, then e2 (e4 is low volume, excluded from top 3)
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [12000, 12000, 12000, 12000] },
      { id: "e2", name: "Bench", weeks: [8000, 8000, 8000, 8000] },
      { id: "e3", name: "Deadlift", weeks: [10000, 10000, 10000, 10000] },
      { id: "e4", name: "Curls", weeks: [1000, 1000, 1000, 1000] },
    ]);
    const result = detectStagnantVolume(vols);
    expect(result.suggested).toBe(true);
    expect(result.stagnantLifts).toEqual(["Squat", "Deadlift", "Bench"]);
  });

  it("returns suggested=false when stagnant lifts list excludes a non-stagnant top-3 lift", () => {
    const vols = makeVolumes([
      { id: "e1", name: "Squat", weeks: [10000, 10000, 10000, 10000] },
      { id: "e2", name: "Bench", weeks: [9000, 9000, 9000, 9000] },
      // Deadlift growing — not stagnant
      { id: "e3", name: "Deadlift", weeks: [8000, 8500, 9000, 9600] },
    ]);
    expect(detectStagnantVolume(vols).suggested).toBe(false);
  });
});
