import { describe, it, expect } from "vitest";
import { calculateOverloadSuggestion } from "../src/lib/overload-suggestions";

describe("calculateOverloadSuggestion", () => {
  it("returns null for empty array", () => {
    expect(calculateOverloadSuggestion([])).toBeNull();
  });

  it("returns null when no completed sets", () => {
    const sets = [
      { weightKg: 80, reps: 8, rpe: 7, completed: false },
      { weightKg: 0, reps: 10, rpe: 6, completed: true },
    ];
    expect(calculateOverloadSuggestion(sets)).toBeNull();
  });

  it("suggests +2.5kg weight when RPE <= 7 and reps >= 8", () => {
    const sets = [
      { weightKg: 80, reps: 8, rpe: 7, completed: true },
    ];
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggestedWeightKg).toBe(82.5);
    expect(suggestion!.suggestedReps).toBe(8);
    expect(suggestion!.reason).toContain("increasing weight");
  });

  it("suggests same weight when RPE >= 9 (maintain)", () => {
    const sets = [
      { weightKg: 100, reps: 5, rpe: 9, completed: true },
    ];
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggestedWeightKg).toBe(100);
    expect(suggestion!.suggestedReps).toBe(5);
    expect(suggestion!.reason).toContain("maintain");
  });

  it("suggests +1 rep for normal RPE with < 12 reps", () => {
    const sets = [
      { weightKg: 60, reps: 10, rpe: 8, completed: true },
    ];
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggestedWeightKg).toBe(60);
    expect(suggestion!.suggestedReps).toBe(11);
    expect(suggestion!.reason).toContain("one more rep");
  });

  it("suggests +2.5kg weight and reset to 8 reps when normal RPE + 12 reps", () => {
    const sets = [
      { weightKg: 60, reps: 12, rpe: 8, completed: true },
    ];
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggestedWeightKg).toBe(62.5);
    expect(suggestion!.suggestedReps).toBe(8);
    expect(suggestion!.reason).toContain("increase weight");
  });

  it("uses best completed set by weight then reps", () => {
    const sets = [
      { weightKg: 60, reps: 10, rpe: 8, completed: true },
      { weightKg: 80, reps: 6, rpe: 8, completed: true },
      { weightKg: 80, reps: 8, rpe: 8, completed: true },
      { weightKg: 70, reps: 12, rpe: 7, completed: true },
    ];
    // Best set: 80kg x 8 reps (highest weight, then highest reps at that weight)
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    // 80kg, 8 reps, RPE 8 -> normal path, reps < 12 -> +1 rep
    expect(suggestion!.suggestedWeightKg).toBe(80);
    expect(suggestion!.suggestedReps).toBe(9);
  });

  it("defaults RPE to 8 when null", () => {
    const sets = [
      { weightKg: 60, reps: 10, rpe: null, completed: true },
    ];
    // null RPE defaults to 8 -> normal path, reps < 12 -> +1 rep
    const suggestion = calculateOverloadSuggestion(sets);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggestedWeightKg).toBe(60);
    expect(suggestion!.suggestedReps).toBe(11);
  });
});
