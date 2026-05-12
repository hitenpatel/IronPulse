import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("react-native-get-random-values", () => ({}));

import { randomUUID } from "../uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomUUID — native path", () => {
  it("delegates to crypto.randomUUID when available", () => {
    const fake = "12345678-1234-4abc-8def-000000000000";
    const spy = vi.spyOn(crypto, "randomUUID").mockReturnValue(fake as ReturnType<typeof crypto.randomUUID>);
    expect(randomUUID()).toBe(fake);
    spy.mockRestore();
  });

  it("returns a string that matches the UUID v4 pattern via the native path", () => {
    const id = randomUUID();
    expect(id).toMatch(UUID_RE);
  });
});

describe("randomUUID — fallback path (no crypto.randomUUID)", () => {
  let originalRandomUUID: typeof crypto.randomUUID | undefined;

  beforeEach(() => {
    originalRandomUUID = crypto.randomUUID;
    (crypto as unknown as Record<string, unknown>).randomUUID = undefined;
  });

  afterEach(() => {
    (crypto as unknown as Record<string, unknown>).randomUUID = originalRandomUUID;
  });

  it("falls back to getRandomValues and returns a valid UUID v4", () => {
    const id = randomUUID();
    expect(id).toMatch(UUID_RE);
  });

  it("sets the version nibble to 4", () => {
    const id = randomUUID();
    expect(id[14]).toBe("4");
  });

  it("sets the variant bits to 8, 9, a, or b", () => {
    const id = randomUUID();
    expect(["8", "9", "a", "b"]).toContain(id[19]);
  });

  it("returns different values on successive calls", () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(a).not.toBe(b);
  });

  it("formats the output as 8-4-4-4-12 hex groups", () => {
    const id = randomUUID();
    const parts = id.split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toHaveLength(8);
    expect(parts[1]).toHaveLength(4);
    expect(parts[2]).toHaveLength(4);
    expect(parts[3]).toHaveLength(4);
    expect(parts[4]).toHaveLength(12);
  });
});
