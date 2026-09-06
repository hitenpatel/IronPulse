import { describe, it, expect } from "vitest";
import { timingSafeStringEq } from "../timing-safe-string-eq";

describe("timingSafeStringEq", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeStringEq("supersecret123", "supersecret123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeStringEq("supersecret123", "supersecret456")).toBe(
      false,
    );
  });

  it("returns false for strings of different lengths", () => {
    expect(timingSafeStringEq("short", "muchlongersecret")).toBe(false);
  });

  it("returns false (fail-closed) for empty strings", () => {
    expect(timingSafeStringEq("", "")).toBe(false);
    expect(timingSafeStringEq("", "nonempty")).toBe(false);
  });

  it("returns false (crash-safe) when one argument is undefined at the type boundary", () => {
    expect(
      timingSafeStringEq(undefined as unknown as string, "secret"),
    ).toBe(false);
  });
});
