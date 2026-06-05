import { describe, it, expect } from "vitest";
import { cursorPaginationSchema } from "../schemas/pagination";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("cursorPaginationSchema", () => {
  it("parses a fully specified valid input", () => {
    const result = cursorPaginationSchema.parse({ cursor: VALID_UUID, limit: 10 });
    expect(result.cursor).toBe(VALID_UUID);
    expect(result.limit).toBe(10);
  });

  it("defaults limit to 20 when omitted", () => {
    const result = cursorPaginationSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("accepts input with no cursor (first page)", () => {
    const result = cursorPaginationSchema.parse({ limit: 5 });
    expect(result.cursor).toBeUndefined();
    expect(result.limit).toBe(5);
  });

  it("accepts cursor: undefined explicitly", () => {
    const result = cursorPaginationSchema.parse({ cursor: undefined, limit: 20 });
    expect(result.cursor).toBeUndefined();
  });

  it("rejects a non-UUID cursor string", () => {
    expect(() => cursorPaginationSchema.parse({ cursor: "not-a-uuid" })).toThrow();
  });

  it("rejects an empty-string cursor", () => {
    expect(() => cursorPaginationSchema.parse({ cursor: "" })).toThrow();
  });

  it("accepts limit at the minimum boundary (1)", () => {
    const result = cursorPaginationSchema.parse({ limit: 1 });
    expect(result.limit).toBe(1);
  });

  it("accepts limit at the maximum boundary (100)", () => {
    const result = cursorPaginationSchema.parse({ limit: 100 });
    expect(result.limit).toBe(100);
  });

  it("rejects limit below minimum (0)", () => {
    expect(() => cursorPaginationSchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit above maximum (101)", () => {
    expect(() => cursorPaginationSchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects a non-integer limit", () => {
    expect(() => cursorPaginationSchema.parse({ limit: 10.5 })).toThrow();
  });

  it("rejects a string limit", () => {
    expect(() => cursorPaginationSchema.parse({ limit: "20" })).toThrow();
  });
});
