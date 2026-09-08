import { describe, it, expect } from "vitest";
import { isExerciseRestricted } from "../restrictions";

const squat = { primaryMuscles: ["quadriceps"], secondaryMuscles: ["glutes", "hamstrings"] };

describe("isExerciseRestricted", () => {
  it("flags an exercise whose primary muscle is restricted", () => {
    const result = isExerciseRestricted(squat, [{ muscleGroups: ["quadriceps"], note: "no squats" }]);
    expect(result.restricted).toBe(true);
    expect(result.reasons).toEqual(["no squats"]);
  });

  it("flags an exercise whose secondary muscle is restricted", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["hamstrings"], note: null }]).restricted).toBe(true);
  });

  it("does not flag an unrelated exercise", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["deltoids"], note: null }]).restricted).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["Quadriceps"], note: null }]).restricted).toBe(true);
  });

  it("returns one reason per matching restriction and skips noteless ones", () => {
    const result = isExerciseRestricted(squat, [
      { muscleGroups: ["quadriceps"], note: "no squats" },
      { muscleGroups: ["glutes"], note: null },
      { muscleGroups: ["deltoids"], note: "no press" },
    ]);
    expect(result.restricted).toBe(true);
    expect(result.reasons).toEqual(["no squats"]);
  });

  it("is not restricted when there are no restrictions", () => {
    expect(isExerciseRestricted(squat, []).restricted).toBe(false);
  });

  it("trims and lower-cases both sides of the match (vocabulary amendment)", () => {
    const padded = {
      primaryMuscles: [" Quadriceps "],
      secondaryMuscles: [],
    };
    expect(
      isExerciseRestricted(padded, [{ muscleGroups: ["  quadriceps  "], note: "no squats" }]).restricted
    ).toBe(true);
  });
});
