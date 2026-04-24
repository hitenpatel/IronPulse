import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG } from "../achievements";

describe("ACHIEVEMENT_CATALOG", () => {
  it("has at least 20 badge types per the expansion spec", () => {
    expect(ACHIEVEMENT_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it("includes the original six plus every expansion-phase type", () => {
    const expected = [
      // Original v1 badges — must never be dropped.
      "first_workout",
      "streak_7",
      "streak_30",
      "pr_count_10",
      "workouts_50",
      "workouts_100",
      // Expansion — referenced by checkAndUnlock in the API.
      "first_cardio",
      "first_follow",
      "first_reaction",
      "workouts_10",
      "workouts_250",
      "workouts_500",
      "streak_90",
      "pr_count_25",
      "pr_count_50",
      "volume_10k_kg",
      "volume_100k_kg",
      "cardio_total_10km",
      "cardio_total_100km",
      "cardio_marathon",
      "nutrition_streak_7",
      "sleep_streak_7",
      "first_goal_complete",
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
