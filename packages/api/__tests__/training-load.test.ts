import { describe, it, expect } from "vitest";
import {
  calculateCardioLoad,
  calculateStrengthLoad,
  calculateEWMA,
  calculateTrainingStatus,
} from "../src/lib/training-load";

describe("calculateCardioLoad", () => {
  it("calculates load with HR", () => {
    // 30 min at 150bpm: 30 * (150/180) = 25
    expect(calculateCardioLoad(1800, 150)).toBeCloseTo(25, 0);
  });
  it("uses default factor without HR", () => {
    // 30 min default: 30 * 0.8 = 24
    expect(calculateCardioLoad(1800)).toBeCloseTo(24, 0);
  });
  it("returns 0 for zero duration", () => {
    expect(calculateCardioLoad(0, 150)).toBe(0);
  });
});

describe("calculateStrengthLoad", () => {
  it("normalizes volume to load units", () => {
    expect(calculateStrengthLoad(5000)).toBe(5); // 5000/1000
  });
  it("returns 0 for zero volume", () => {
    expect(calculateStrengthLoad(0)).toBe(0);
  });
});

describe("calculateEWMA", () => {
  it("returns 0 for empty data", () => {
    expect(calculateEWMA([], 7)).toBe(0);
  });
  it("calculates weighted average", () => {
    const loads = [
      { date: "2026-03-10", load: 20 },
      { date: "2026-03-11", load: 30 },
      { date: "2026-03-12", load: 25 },
    ];
    const result = calculateEWMA(loads, 7);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(30);
  });
});

describe("calculateTrainingStatus", () => {
  it("returns fresh when TSB is positive", () => {
    expect(calculateTrainingStatus(15, 30).status).toBe("fresh");
  });
  it("returns optimal when TSB is slightly negative", () => {
    expect(calculateTrainingStatus(35, 30).status).toBe("optimal");
  });
  it("returns fatigued when TSB is very negative", () => {
    expect(calculateTrainingStatus(50, 30).status).toBe("fatigued");
  });
});
