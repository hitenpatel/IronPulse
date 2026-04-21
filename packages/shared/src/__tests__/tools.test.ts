import { describe, it, expect } from "vitest";
import {
  calculateOneRepMax,
  percentageOfMax,
  validateOneRepMaxInput,
  calculatePlates,
  PLATE_SIZES_KG,
  PLATE_SIZES_LB,
  validatePlateCalcInput,
} from "../index";

describe("calculateOneRepMax", () => {
  it("returns the exact weight when reps === 1", () => {
    const r = calculateOneRepMax(100, 1);
    expect(r).toEqual({ epley: 100, brzycki: 100, lander: 100, average: 100 });
  });

  it("epley 100kg × 5 reps → ~116.7", () => {
    const r = calculateOneRepMax(100, 5);
    expect(r.epley).toBeCloseTo(116.67, 1);
  });

  it("brzycki 100kg × 5 reps → ~112.5", () => {
    const r = calculateOneRepMax(100, 5);
    expect(r.brzycki).toBeCloseTo(112.5, 1);
  });

  it("average is the arithmetic mean of the three formulas", () => {
    const r = calculateOneRepMax(100, 5);
    expect(r.average).toBeCloseTo((r.epley + r.brzycki + r.lander) / 3, 5);
  });

  it("all estimators ≥ the lifted weight for reps ≥ 1", () => {
    for (let reps = 1; reps <= 12; reps++) {
      const r = calculateOneRepMax(80, reps);
      expect(r.epley).toBeGreaterThanOrEqual(80);
      expect(r.brzycki).toBeGreaterThanOrEqual(80);
      expect(r.lander).toBeGreaterThanOrEqual(80);
    }
  });
});

describe("percentageOfMax", () => {
  it("rounds to one decimal place", () => {
    expect(percentageOfMax(123.456, 75)).toBe(92.6);
  });

  it("0% returns 0", () => {
    expect(percentageOfMax(100, 0)).toBe(0);
  });
});

describe("validateOneRepMaxInput", () => {
  it("accepts valid inputs", () => {
    expect(validateOneRepMaxInput(100, 5)).toBeNull();
    expect(validateOneRepMaxInput(0.5, 1)).toBeNull();
    expect(validateOneRepMaxInput(400, 36)).toBeNull();
  });

  it("rejects non-positive weight", () => {
    expect(validateOneRepMaxInput(0, 5)).toMatch(/weight/i);
    expect(validateOneRepMaxInput(-10, 5)).toMatch(/weight/i);
  });

  it("rejects reps out of [1, 36]", () => {
    expect(validateOneRepMaxInput(100, 0)).toMatch(/reps/i);
    expect(validateOneRepMaxInput(100, 37)).toMatch(/reps/i);
  });
});

describe("calculatePlates — kg", () => {
  it("100kg on a 20kg bar → 40kg/side, greedy from heaviest (25 + 15)", () => {
    const r = calculatePlates(100, 20);
    expect(r).not.toBeNull();
    expect(r!.platesPerSide).toEqual([
      { size: 25, count: 1 },
      { size: 15, count: 1 },
    ]);
    expect(r!.remainder).toBe(0);
    expect(r!.totalLoaded).toBe(100);
  });

  it("142.5kg on 20kg bar → 25 + 25 + 10 + 1.25 per side", () => {
    const r = calculatePlates(142.5, 20);
    expect(r!.platesPerSide).toEqual([
      { size: 25, count: 2 },
      { size: 10, count: 1 },
      { size: 1.25, count: 1 },
    ]);
    expect(r!.remainder).toBe(0);
    expect(r!.totalLoaded).toBe(142.5);
  });

  it("leaves a remainder when the target isn't reachable with available plates", () => {
    const r = calculatePlates(21, 20);
    // per side = 0.5kg, smallest plate is 1.25 — can't place any
    expect(r!.platesPerSide).toEqual([]);
    expect(r!.remainder).toBe(0.5);
    expect(r!.totalLoaded).toBe(20);
  });

  it("returns null when target < bar", () => {
    expect(calculatePlates(10, 20)).toBeNull();
  });

  it("target equals bar → no plates, no remainder", () => {
    const r = calculatePlates(20, 20);
    expect(r!.platesPerSide).toEqual([]);
    expect(r!.remainder).toBe(0);
    expect(r!.totalLoaded).toBe(20);
  });
});

describe("calculatePlates — imperial (lb)", () => {
  it("225lb on a 45lb bar → 45 + 45 per side", () => {
    const r = calculatePlates(225, 45, PLATE_SIZES_LB);
    expect(r!.platesPerSide).toEqual([{ size: 45, count: 2 }]);
    expect(r!.totalLoaded).toBe(225);
  });

  it("exports both plate-size constants", () => {
    expect(PLATE_SIZES_KG[0]).toBe(25);
    expect(PLATE_SIZES_LB[0]).toBe(45);
  });
});

describe("validatePlateCalcInput", () => {
  it("accepts sensible inputs", () => {
    expect(validatePlateCalcInput(100, 20)).toBeNull();
  });

  it("rejects target below bar", () => {
    expect(validatePlateCalcInput(10, 20)).toMatch(/target/i);
  });

  it("rejects non-positive weights", () => {
    expect(validatePlateCalcInput(0, 20)).toMatch(/target/i);
    expect(validatePlateCalcInput(100, -1)).toMatch(/bar/i);
  });
});
