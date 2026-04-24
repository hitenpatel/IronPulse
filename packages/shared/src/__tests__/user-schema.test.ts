import { describe, expect, it } from "vitest";
import { updateProfileSchema, warmupSchemeSchema } from "../schemas/user";

describe("updateProfileSchema — warm-up fields", () => {
  it("accepts a valid warm-up scheme + enabled flag", () => {
    const parsed = updateProfileSchema.parse({
      warmupScheme: "hypertrophy",
      warmupEnabled: false,
    });
    expect(parsed.warmupScheme).toBe("hypertrophy");
    expect(parsed.warmupEnabled).toBe(false);
  });

  it("allows omitting warm-up fields entirely", () => {
    expect(() => updateProfileSchema.parse({ name: "Alex" })).not.toThrow();
  });

  it("rejects an unknown scheme", () => {
    expect(() =>
      updateProfileSchema.parse({ warmupScheme: "bogus" as never }),
    ).toThrow();
  });

  it("accepts all four scheme values", () => {
    for (const s of ["strength", "hypertrophy", "light", "none"] as const) {
      expect(warmupSchemeSchema.parse(s)).toBe(s);
    }
  });
});
