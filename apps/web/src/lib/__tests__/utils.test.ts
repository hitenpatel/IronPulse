import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles falsy inputs", () => {
    const isHidden = false;
    expect(cn("base", isHidden && "hidden", "visible")).toBe("base visible");
  });

  it("handles empty/undefined inputs", () => {
    expect(cn("", undefined, null, "p-4")).toBe("p-4");
  });

  it("merges padding conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});
