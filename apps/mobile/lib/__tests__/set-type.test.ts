import { describe, it, expect } from "vitest";
import {
  SET_TYPE_ORDER,
  SET_TYPE_LABEL,
  normalizeSetType,
  type SetType,
} from "../set-type";

describe("SET_TYPE_ORDER", () => {
  it("lists all four set types in canonical order", () => {
    // Order matters: the SetTypeSheet renders these top-to-bottom, and the
    // previous Android Alert.alert path silently dropped entries past the
    // third button. Asserting the full list guards #392.
    expect(SET_TYPE_ORDER).toEqual([
      "working",
      "warmup",
      "dropset",
      "failure",
    ]);
  });

  it("has a label for every type", () => {
    for (const t of SET_TYPE_ORDER) {
      expect(SET_TYPE_LABEL[t]).toBeTruthy();
    }
  });
});

describe("normalizeSetType", () => {
  it("returns the value unchanged for valid non-working types", () => {
    expect(normalizeSetType("warmup")).toBe("warmup");
    expect(normalizeSetType("dropset")).toBe("dropset");
    expect(normalizeSetType("failure")).toBe("failure");
  });

  it("returns working for an explicit working value", () => {
    expect(normalizeSetType("working")).toBe("working");
  });

  it("falls back to working for null, undefined, or unknown strings", () => {
    expect(normalizeSetType(null)).toBe("working");
    expect(normalizeSetType(undefined)).toBe("working");
    expect(normalizeSetType("")).toBe("working");
    expect(normalizeSetType("legacy-value")).toBe("working");
  });

  it("returns a value typed as SetType", () => {
    const result: SetType = normalizeSetType("warmup");
    expect(result).toBe("warmup");
  });
});
