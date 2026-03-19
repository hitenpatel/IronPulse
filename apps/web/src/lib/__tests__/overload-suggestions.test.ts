import { describe, it, expect } from "vitest";
import { calculateOverloadSuggestion } from "@ironpulse/api/src/lib/overload-suggestions";

describe("calculateOverloadSuggestion", () => {
  it("returns null for empty sets", () => {
    expect(calculateOverloadSuggestion([])).toBeNull();
  });

  it("returns null when no completed sets", () => {
    const sets = [{ weightKg: 80, reps: 8, rpe: 7, completed: false }];
    expect(calculateOverloadSuggestion(sets)).toBeNull();
  });

  it("returns null when best set has zero weight", () => {
    const sets = [{ weightKg: 0, reps: 8, rpe: 7, completed: true }];
    expect(calculateOverloadSuggestion(sets)).toBeNull();
  });

  it("suggests weight increase for low RPE (<=7) with sufficient reps (>=8)", () => {
    const sets = [{ weightKg: 100, reps: 10, rpe: 7, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(102.5);
    expect(result!.suggestedReps).toBe(10);
    expect(result!.reason).toMatch(/low/i);
  });

  it("suggests maintaining weight for high RPE (>=9)", () => {
    const sets = [{ weightKg: 100, reps: 8, rpe: 9, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(100);
    expect(result!.suggestedReps).toBe(8);
    expect(result!.reason).toMatch(/high effort/i);
  });

  it("suggests one more rep for normal progression below 12 reps", () => {
    const sets = [{ weightKg: 80, reps: 8, rpe: 8, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(80);
    expect(result!.suggestedReps).toBe(9);
    expect(result!.reason).toMatch(/one more rep/i);
  });

  it("suggests weight increase and rep reset when at 12 reps with normal RPE", () => {
    const sets = [{ weightKg: 80, reps: 12, rpe: 8, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(82.5);
    expect(result!.suggestedReps).toBe(8);
    expect(result!.reason).toMatch(/12 reps/i);
  });

  it("uses default RPE of 8 when rpe is null", () => {
    const sets = [{ weightKg: 80, reps: 10, rpe: null, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    // rpe defaults to 8, reps=10 < 12, so suggest +1 rep
    expect(result).not.toBeNull();
    expect(result!.suggestedReps).toBe(11);
  });

  it("picks the best (heaviest) completed set from multiple", () => {
    const sets = [
      { weightKg: 60, reps: 10, rpe: 7, completed: true },
      { weightKg: 80, reps: 8, rpe: 9, completed: true },
      { weightKg: 70, reps: 10, rpe: 8, completed: false },
    ];
    const result = calculateOverloadSuggestion(sets);
    // Best completed set is 80kg (highest weight), rpe=9 → maintain weight
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(80);
  });

  it("does not suggest weight increase for low RPE with fewer than 8 reps", () => {
    const sets = [{ weightKg: 100, reps: 5, rpe: 6, completed: true }];
    const result = calculateOverloadSuggestion(sets);
    // rpe=6 (<=7) but reps=5 (<8) → falls to normal progression branch
    expect(result).not.toBeNull();
    expect(result!.suggestedWeightKg).toBe(100); // stays same weight
    expect(result!.suggestedReps).toBe(6); // +1 rep
  });
});
