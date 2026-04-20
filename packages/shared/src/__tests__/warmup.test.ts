import { describe, it, expect } from "vitest";
import { generateWarmupSets } from "../warmup";

describe("generateWarmupSets", () => {
  it("strength scheme returns 3 sets at 40/60/80% with descending reps", () => {
    const sets = generateWarmupSets({
      workingWeight: 100,
      workingReps: 5,
      scheme: "strength",
    });
    expect(sets).toHaveLength(3);
    expect(sets[0].pct).toBe(0.4);
    expect(sets[1].pct).toBe(0.6);
    expect(sets[2].pct).toBe(0.8);
    // Reps descend as intensity climbs
    expect(sets[0].reps).toBeGreaterThan(sets[1].reps);
    expect(sets[1].reps).toBeGreaterThan(sets[2].reps);
  });

  it("hypertrophy scheme returns 2 sets at 50/70%", () => {
    const sets = generateWarmupSets({
      workingWeight: 80,
      workingReps: 12,
      scheme: "hypertrophy",
    });
    expect(sets).toHaveLength(2);
    expect(sets.map((s) => s.pct)).toEqual([0.5, 0.7]);
  });

  it("light scheme returns 1 prime set at 60%", () => {
    const sets = generateWarmupSets({
      workingWeight: 60,
      workingReps: 8,
      scheme: "light",
    });
    expect(sets).toHaveLength(1);
    expect(sets[0].pct).toBe(0.6);
  });

  it("'none' scheme returns no sets", () => {
    expect(
      generateWarmupSets({
        workingWeight: 100,
        workingReps: 5,
        scheme: "none",
      }),
    ).toEqual([]);
  });

  it("rounds weights to plate increment (2.5 by default)", () => {
    const sets = generateWarmupSets({
      workingWeight: 127.5,
      workingReps: 5,
      scheme: "strength",
    });
    for (const s of sets) {
      expect(s.weight % 2.5).toBe(0);
    }
  });

  it("respects custom plate increment (imperial 5lb)", () => {
    const sets = generateWarmupSets({
      workingWeight: 225,
      workingReps: 5,
      scheme: "strength",
      increment: 5,
      barWeight: 45,
    });
    for (const s of sets) {
      expect(s.weight % 5).toBe(0);
    }
  });

  it("clamps warm-ups below the bar to the bar weight", () => {
    const sets = generateWarmupSets({
      workingWeight: 30, // just heavier than default 20kg bar
      workingReps: 10,
      scheme: "strength",
    });
    // 40% of 30 = 12kg → below bar, clamped to 20
    expect(sets[0].weight).toBe(20);
  });

  it("returns a single bar-weight prime when working weight is at/below the bar", () => {
    const sets = generateWarmupSets({
      workingWeight: 20,
      workingReps: 10,
      scheme: "strength",
    });
    expect(sets).toHaveLength(1);
    expect(sets[0].weight).toBe(20);
  });

  it("returns [] for invalid input", () => {
    expect(
      generateWarmupSets({ workingWeight: 0, workingReps: 5 }),
    ).toEqual([]);
    expect(
      generateWarmupSets({ workingWeight: 100, workingReps: 0 }),
    ).toEqual([]);
  });

  it("ensures reps are at least 1 even when repFactor rounds low", () => {
    const sets = generateWarmupSets({
      workingWeight: 100,
      workingReps: 1,
      scheme: "strength",
    });
    for (const s of sets) expect(s.reps).toBeGreaterThanOrEqual(1);
  });
});
