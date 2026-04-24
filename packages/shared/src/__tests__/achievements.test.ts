import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG } from "../achievements";

describe("ACHIEVEMENT_CATALOG", () => {
  it("covers every achievement type the unlock helper supports", () => {
    const expected = [
      "first_workout",
      "streak_7",
      "streak_30",
      "pr_count_10",
      "workouts_50",
      "workouts_100",
    ];
    const actual = ACHIEVEMENT_CATALOG.map((b) => b.type);
    for (const t of expected) expect(actual).toContain(t);
  });

  it("has no duplicate badge types", () => {
    const seen = new Set<string>();
    for (const b of ACHIEVEMENT_CATALOG) {
      expect(seen.has(b.type)).toBe(false);
      seen.add(b.type);
    }
  });

  it("every badge has label, description, and emoji", () => {
    for (const b of ACHIEVEMENT_CATALOG) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
      expect(b.emoji.length).toBeGreaterThan(0);
    }
  });
});
