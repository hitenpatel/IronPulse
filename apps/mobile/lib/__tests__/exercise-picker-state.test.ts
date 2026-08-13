import { describe, it, expect } from "vitest";
import { filterExercises, dedupeSelection, activeFilterCount } from "../exercise-picker-state";
import type { ExerciseRow } from "@zor/sync";

function makeEx(overrides: Partial<ExerciseRow> & Pick<ExerciseRow, "id" | "name">): ExerciseRow {
  return {
    category: null,
    primary_muscles: null,
    secondary_muscles: null,
    equipment: null,
    instructions: null,
    image_urls: null,
    video_urls: null,
    is_custom: 0,
    created_by_id: null,
    ...overrides,
  };
}

const exercises: ExerciseRow[] = [
  makeEx({ id: "1", name: "Barbell Squat", primary_muscles: "Quadriceps", equipment: "Barbell" }),
  makeEx({ id: "2", name: "Dumbbell Curl", primary_muscles: "Biceps", equipment: "Dumbbell" }),
  makeEx({ id: "3", name: "Push-up", primary_muscles: "Chest", secondary_muscles: "Triceps", equipment: "Bodyweight" }),
  makeEx({ id: "4", name: "Deadlift", primary_muscles: "Hamstrings", equipment: "Barbell" }),
  makeEx({ id: "5", name: "Lat Pulldown", primary_muscles: "Back", equipment: "Machine" }),
];

// ── filterExercises ─────────────────────────────────────────────────────────

describe("filterExercises — search normalisation", () => {
  it("returns all exercises when no filters are set", () => {
    expect(filterExercises(exercises, {})).toHaveLength(5);
  });

  it("matches case-insensitively", () => {
    const result = filterExercises(exercises, { search: "SQUAT" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("matches partial strings", () => {
    const result = filterExercises(exercises, { search: "bell" });
    expect(result.map((e) => e.id)).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("returns empty array when no exercises match search", () => {
    expect(filterExercises(exercises, { search: "zzznomatch" })).toHaveLength(0);
  });

  it("trims whitespace from search", () => {
    const result = filterExercises(exercises, { search: "  squat  " });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("handles empty search string gracefully", () => {
    expect(filterExercises(exercises, { search: "" })).toHaveLength(5);
  });
});

describe("filterExercises — muscle predicate", () => {
  it("filters by primary muscle", () => {
    const result = filterExercises(exercises, { muscle: "Biceps" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("matches secondary muscles", () => {
    const result = filterExercises(exercises, { muscle: "Triceps" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("returns nothing when muscle matches neither primary nor secondary", () => {
    expect(filterExercises(exercises, { muscle: "Calves" })).toHaveLength(0);
  });
});

describe("filterExercises — equipment predicate", () => {
  it("filters by equipment", () => {
    const result = filterExercises(exercises, { equipment: "Barbell" });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(expect.arrayContaining(["1", "4"]));
  });

  it("returns nothing when equipment does not match", () => {
    expect(filterExercises(exercises, { equipment: "Kettlebell" })).toHaveLength(0);
  });
});

describe("filterExercises — composed filters", () => {
  it("applies search AND muscle AND equipment together", () => {
    const result = filterExercises(exercises, {
      search: "deadlift",
      muscle: "Hamstrings",
      equipment: "Barbell",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("search + muscle that match different exercises returns empty", () => {
    const result = filterExercises(exercises, {
      search: "squat",
      muscle: "Biceps",
    });
    expect(result).toHaveLength(0);
  });

  it("preserves original order", () => {
    const result = filterExercises(exercises, { equipment: "Barbell" });
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("4");
  });
});

describe("filterExercises — null/undefined fields", () => {
  it("skips muscle filter gracefully when exercise has null muscles", () => {
    const ex = [makeEx({ id: "99", name: "Stretch" })];
    expect(filterExercises(ex, { muscle: "Biceps" })).toHaveLength(0);
  });

  it("returns exercise when no filters applied even with null fields", () => {
    const ex = [makeEx({ id: "99", name: "Stretch" })];
    expect(filterExercises(ex, {})).toHaveLength(1);
  });
});

// ── dedupeSelection ─────────────────────────────────────────────────────────

describe("dedupeSelection", () => {
  it("adds a new ID to empty selection", () => {
    expect(dedupeSelection([], "ex-1")).toEqual(["ex-1"]);
  });

  it("adds a new ID to non-empty selection", () => {
    expect(dedupeSelection(["ex-1"], "ex-2")).toEqual(["ex-1", "ex-2"]);
  });

  it("removes an existing ID (deselect)", () => {
    expect(dedupeSelection(["ex-1", "ex-2"], "ex-1")).toEqual(["ex-2"]);
  });

  it("removes from middle of selection", () => {
    expect(dedupeSelection(["ex-1", "ex-2", "ex-3"], "ex-2")).toEqual(["ex-1", "ex-3"]);
  });

  it("removes from end of selection", () => {
    expect(dedupeSelection(["ex-1", "ex-2"], "ex-2")).toEqual(["ex-1"]);
  });

  it("results in empty array when deselecting the only item", () => {
    expect(dedupeSelection(["ex-1"], "ex-1")).toEqual([]);
  });

  it("preserves selection order when adding", () => {
    const result = dedupeSelection(["ex-3", "ex-1"], "ex-2");
    expect(result).toEqual(["ex-3", "ex-1", "ex-2"]);
  });

  it("does not duplicate existing ID on add", () => {
    // If ex-1 is already selected, second tap removes it — not adds again
    const result = dedupeSelection(["ex-1", "ex-2"], "ex-1");
    expect(result.filter((id) => id === "ex-1")).toHaveLength(0);
  });
});

// ── activeFilterCount ───────────────────────────────────────────────────────

describe("activeFilterCount", () => {
  it("returns 0 when no filters", () => {
    expect(activeFilterCount({})).toBe(0);
  });

  it("counts muscle only", () => {
    expect(activeFilterCount({ muscle: "Biceps" })).toBe(1);
  });

  it("counts equipment only", () => {
    expect(activeFilterCount({ equipment: "Barbell" })).toBe(1);
  });

  it("counts both", () => {
    expect(activeFilterCount({ muscle: "Chest", equipment: "Dumbbell" })).toBe(2);
  });

  it("search does not count in filter badge", () => {
    expect(activeFilterCount({ search: "squat" })).toBe(0);
  });
});
