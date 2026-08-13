import { describe, it, expect } from "vitest";
import { buildFinishSummary, type DbSet } from "../workout-finish-summary";
import { touchField, emptyDraft } from "../workout-set-draft";

const NOW_MS = 1_700_000_000_000;
const STARTED_MS = NOW_MS - 3600_000; // 1 hour ago

function dbSet(
  id: string,
  weid: string,
  opts: Partial<DbSet> = {},
): DbSet {
  return {
    id,
    workout_exercise_id: weid,
    set_number: 1,
    type: "working",
    weight_kg: null,
    reps: null,
    rpe: null,
    completed: 0,
    ...opts,
  };
}

describe("buildFinishSummary", () => {
  it("classifies completed sets correctly", () => {
    const sets = [dbSet("s1", "e1", { completed: 1, weight_kg: 80, reps: 8 })];
    const summary = buildFinishSummary(sets, new Map(), STARTED_MS, NOW_MS);
    expect(summary.completedCount).toBe(1);
    expect(summary.incompleteCount).toBe(0);
    expect(summary.entries[0].kind).toBe("completed");
  });

  it("classifies incomplete DB-backed sets (reps in DB)", () => {
    const sets = [dbSet("s1", "e1", { reps: 8, weight_kg: 70 })];
    const summary = buildFinishSummary(sets, new Map(), STARTED_MS, NOW_MS);
    expect(summary.incompleteCount).toBe(1);
    expect(summary.entries[0].kind).toBe("incomplete-db");
    expect(summary.entries[0].toPersist?.reps).toBe(8);
  });

  it("classifies touched draft as touched-draft and prepares persistence", () => {
    const sets = [dbSet("s1", "e1")];
    const draft = touchField(touchField(emptyDraft(), "reps", "10"), "weight", "75");
    const drafts = new Map([["s1", draft]]);
    const summary = buildFinishSummary(sets, drafts, STARTED_MS, NOW_MS);
    expect(summary.entries[0].kind).toBe("touched-draft");
    expect(summary.touchedUnsavedCount).toBe(1);
    expect(summary.entries[0].toPersist?.reps).toBe(10);
    expect(summary.entries[0].toPersist?.weightKg).toBe(75);
  });

  it("untouched suggestion never persists", () => {
    const sets = [dbSet("s1", "e1")]; // no reps in DB, no touched draft
    const summary = buildFinishSummary(sets, new Map(), STARTED_MS, NOW_MS);
    expect(summary.entries[0].kind).toBe("untouched-suggestion");
    expect(summary.entries[0].toPersist).toBeNull();
    expect(summary.incompleteCount).toBe(0); // untouched is neither complete nor incomplete-db
  });

  it("computes duration in seconds", () => {
    const summary = buildFinishSummary([], new Map(), STARTED_MS, NOW_MS);
    expect(summary.durationSeconds).toBe(3600);
  });

  it("computes total volume from completed sets only", () => {
    const sets = [
      dbSet("s1", "e1", { completed: 1, weight_kg: 100, reps: 5 }),
      dbSet("s2", "e1", { completed: 0, weight_kg: 100, reps: 5 }), // incomplete
    ];
    const summary = buildFinishSummary(sets, new Map(), STARTED_MS, NOW_MS);
    expect(summary.totalVolumeKg).toBe(500); // only s1
  });

  it("handles multiple exercise types correctly", () => {
    const sets = [
      dbSet("s1", "e1", { completed: 1, reps: 8 }),
      dbSet("s2", "e1", { reps: 6 }), // incomplete DB
      dbSet("s3", "e2"), // untouched suggestion
    ];
    const draft = touchField(emptyDraft(), "reps", "5");
    const drafts = new Map([["s3", draft]]);
    // s3 now has a touched draft
    const summary = buildFinishSummary(sets, drafts, STARTED_MS, NOW_MS);
    expect(summary.completedCount).toBe(1);
    expect(summary.incompleteCount).toBe(1);
    expect(summary.touchedUnsavedCount).toBe(1);
  });
});
