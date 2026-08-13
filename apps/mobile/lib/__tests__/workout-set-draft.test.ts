import { describe, it, expect } from "vitest";
import {
  createDraft,
  emptyDraft,
  touchField,
  acceptSuggestion,
  parseDraftForCommit,
  isDraftTouched,
  computeSuggestion,
} from "../workout-set-draft";

describe("createDraft", () => {
  it("creates draft with given values, all untouched", () => {
    const d = createDraft({ weightKg: 80, reps: 8, rpe: 7 });
    expect(d.weight).toEqual({ value: "80", touched: false });
    expect(d.reps).toEqual({ value: "8", touched: false });
    expect(d.rpe).toEqual({ value: "7", touched: false });
  });

  it("creates draft with null values as empty strings", () => {
    const d = createDraft({});
    expect(d.weight.value).toBe("");
    expect(d.reps.value).toBe("");
    expect(d.rpe.value).toBe("");
  });
});

describe("emptyDraft", () => {
  it("all fields empty and untouched", () => {
    const d = emptyDraft();
    expect(isDraftTouched(d)).toBe(false);
    expect(d.weight.value).toBe("");
  });
});

describe("touchField", () => {
  it("marks field touched and updates value", () => {
    const d = emptyDraft();
    const d2 = touchField(d, "reps", "9");
    expect(d2.reps).toEqual({ value: "9", touched: true });
    expect(d2.weight.touched).toBe(false); // other fields unchanged
  });

  it("does not mutate original draft", () => {
    const d = emptyDraft();
    touchField(d, "weight", "100");
    expect(d.weight.touched).toBe(false);
  });
});

describe("acceptSuggestion", () => {
  it("changes display value but leaves touched = false", () => {
    const d = emptyDraft();
    const d2 = acceptSuggestion(d, "weight", "90");
    expect(d2.weight.value).toBe("90");
    expect(d2.weight.touched).toBe(false);
  });

  it("accepted suggestion emits no persistence patch (parseDraftForCommit needs reps)", () => {
    // An untouched accepted suggestion that has no DB backing → no reps → null
    const d = acceptSuggestion(emptyDraft(), "weight", "90");
    const result = parseDraftForCommit(d, { weightKg: null, reps: null, rpe: null });
    expect(result).toBeNull();
  });
});

describe("parseDraftForCommit", () => {
  it("returns null when reps is not a positive integer", () => {
    const d = touchField(emptyDraft(), "reps", "0");
    expect(parseDraftForCommit(d)).toBeNull();
  });

  it("returns null when reps field is empty and no DB value", () => {
    const d = touchField(emptyDraft(), "weight", "80");
    expect(parseDraftForCommit(d)).toBeNull();
  });

  it("parses touched reps correctly (changing 8 → 9 without blur)", () => {
    let d = emptyDraft();
    d = touchField(d, "reps", "8");
    d = touchField(d, "reps", "9"); // simulates keystroke without blur
    const result = parseDraftForCommit(d);
    expect(result?.reps).toBe(9);
  });

  it("uses DB reps value when reps not touched", () => {
    const d = touchField(emptyDraft(), "weight", "80");
    const result = parseDraftForCommit(d, { weightKg: null, reps: 5, rpe: null });
    expect(result?.reps).toBe(5);
  });

  it("uses touched weight and ignores untouched suggestion", () => {
    let d = createDraft({ weightKg: 80 }); // untouched suggestion
    d = touchField(d, "reps", "8");
    // weight is untouched suggestion — should use DB value or null
    const result = parseDraftForCommit(d, { weightKg: null, reps: null, rpe: null });
    expect(result?.weightKg).toBeNull();
  });

  it("touched weight overrides DB weight", () => {
    let d = createDraft({ weightKg: 80 });
    d = touchField(d, "weight", "85");
    d = touchField(d, "reps", "8");
    const result = parseDraftForCommit(d, { weightKg: 80, reps: 8, rpe: null });
    expect(result?.weightKg).toBe(85);
  });

  it("RPE clamps to [1, 10]", () => {
    let d = touchField(emptyDraft(), "rpe", "11");
    d = touchField(d, "reps", "5");
    const result = parseDraftForCommit(d);
    expect(result?.rpe).toBe(10);
  });

  it("bodyweight exercise: null weight is acceptable", () => {
    const d = touchField(emptyDraft(), "reps", "15");
    const result = parseDraftForCommit(d);
    expect(result).not.toBeNull();
    expect(result?.weightKg).toBeNull();
    expect(result?.reps).toBe(15);
  });
});

describe("isDraftTouched", () => {
  it("returns false for untouched draft", () => {
    expect(isDraftTouched(createDraft({ weightKg: 80, reps: 8 }))).toBe(false);
  });

  it("returns true when any field is touched", () => {
    const d = touchField(createDraft({ weightKg: 80 }), "reps", "8");
    expect(isDraftTouched(d)).toBe(true);
  });
});

describe("computeSuggestion", () => {
  const prev = [
    { set_number: 1, weight_kg: 80, reps: 8, rpe: 7, type: "working" },
    { set_number: 2, weight_kg: 82.5, reps: 6, rpe: 8, type: "working" },
  ];

  it("prefers same-type same-position", () => {
    const s = computeSuggestion({ setNumber: 1, setType: "working", previousSets: prev });
    expect(s.weightKg).toBe(80);
    expect(s.reps).toBe(8);
  });

  it("falls back to same position when no type match", () => {
    const s = computeSuggestion({ setNumber: 1, setType: "drop", previousSets: prev });
    expect(s.weightKg).toBe(80);
  });

  it("falls back to same type when no position match", () => {
    const s = computeSuggestion({ setNumber: 5, setType: "working", previousSets: prev });
    expect(s.weightKg).toBe(80); // first working set
  });

  it("DB value takes precedence over previous performance", () => {
    const s = computeSuggestion({
      setNumber: 1,
      previousSets: prev,
      dbWeightKg: 90,
      dbReps: 10,
    });
    expect(s.weightKg).toBe(90);
    expect(s.reps).toBe(10);
  });

  it("returns null values when no previous data and no DB", () => {
    const s = computeSuggestion({ setNumber: 1, previousSets: [] });
    expect(s.weightKg).toBeNull();
    expect(s.reps).toBeNull();
  });
});
