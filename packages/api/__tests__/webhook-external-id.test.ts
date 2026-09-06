import { describe, expect, it } from "vitest";
import { hashPayload } from "../src/lib/webhook-external-id";

describe("hashPayload", () => {
  it("returns a 64-char hex string", () => {
    expect(hashPayload({ foo: "bar" })).toMatch(/^[0-9a-f]{64}$/);
  });
  it("is deterministic for the same input", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ a: 1, b: 2 }));
  });
  it("is stable under object-key reordering", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });
  it("is NOT stable under array reordering (arrays are ordered)", () => {
    expect(hashPayload({ arr: [1, 2, 3] })).not.toBe(hashPayload({ arr: [3, 2, 1] }));
  });
  it("differs for different payloads", () => {
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
  it("handles nested objects and arrays", () => {
    expect(hashPayload({ arr: [1, 2, { x: "y" }] })).toBe(hashPayload({ arr: [1, 2, { x: "y" }] }));
  });
  it("treats undefined at any depth as key-absent", () => {
    expect(hashPayload({ a: 1, b: undefined })).toBe(hashPayload({ a: 1 }));
  });
});
