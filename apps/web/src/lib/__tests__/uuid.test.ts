import { describe, it, expect } from "vitest";
import { uuid } from "../uuid";

describe("uuid", () => {
  it("returns a valid UUID v4 format", () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(ids.size).toBe(100);
  });

  it("returns a string of length 36", () => {
    expect(uuid()).toHaveLength(36);
  });
});
