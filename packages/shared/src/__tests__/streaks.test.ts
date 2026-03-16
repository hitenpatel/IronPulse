import { describe, it, expect } from "vitest";
import { calculateStreak } from "../streaks";

describe("calculateStreak", () => {
  it("returns 0 for empty", () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("single day today", () => {
    const today = new Date().toISOString().split("T")[0]!;
    expect(calculateStreak([today])).toEqual({ current: 1, longest: 1 });
  });

  it("3 consecutive days ending today", () => {
    const d = (offset: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - offset);
      return dt.toISOString().split("T")[0]!;
    };
    expect(calculateStreak([d(2), d(1), d(0)]).current).toBe(3);
  });

  it("gap breaks current streak", () => {
    const d = (offset: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - offset);
      return dt.toISOString().split("T")[0]!;
    };
    // gap at d(1), activity at d(0) and d(2)
    const result = calculateStreak([d(2), d(0)]);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });
});
