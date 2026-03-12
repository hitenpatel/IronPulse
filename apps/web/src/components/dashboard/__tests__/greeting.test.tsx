import { describe, it, expect } from "vitest";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getFirstName(name: string | null | undefined): string {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

describe("getInitials", () => {
  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });
  it("returns ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });
  it("returns single letter for single name", () => {
    expect(getInitials("Hiten")).toBe("H");
  });
  it("returns first and last initials", () => {
    expect(getInitials("Hiten Patel")).toBe("HP");
  });
  it("handles three names", () => {
    expect(getInitials("John Michael Smith")).toBe("JS");
  });
});

describe("getFirstName", () => {
  it("returns 'there' for null", () => {
    expect(getFirstName(null)).toBe("there");
  });
  it("returns 'there' for undefined", () => {
    expect(getFirstName(undefined)).toBe("there");
  });
  it("returns first name from full name", () => {
    expect(getFirstName("Hiten Patel")).toBe("Hiten");
  });
  it("returns single name", () => {
    expect(getFirstName("Hiten")).toBe("Hiten");
  });
});
