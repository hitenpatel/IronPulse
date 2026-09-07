import { describe, it, expect } from "vitest";
import {
  logInjurySchema,
  logRecoveryActivitySchema,
  createRestrictionSchema,
  listInjuriesSchema,
} from "../schemas/injury";

describe("logInjurySchema", () => {
  it("accepts a minimal valid injury", () => {
    const parsed = logInjurySchema.parse({
      injuredAt: new Date("2026-09-01"),
      injuryType: "strain",
      severity: 4,
      bodyParts: ["hamstrings"],
    });
    expect(parsed.bodyParts).toEqual(["hamstrings"]);
  });

  it("rejects severity outside 1-10", () => {
    const base = { injuredAt: new Date(), injuryType: "strain", bodyParts: ["knee"] };
    expect(logInjurySchema.safeParse({ ...base, severity: 0 }).success).toBe(false);
    expect(logInjurySchema.safeParse({ ...base, severity: 11 }).success).toBe(false);
    expect(logInjurySchema.safeParse({ ...base, severity: 5.5 }).success).toBe(false);
  });

  it("rejects an unknown injury type", () => {
    const result = logInjurySchema.safeParse({
      injuredAt: new Date(),
      injuryType: "banana",
      severity: 3,
      bodyParts: ["knee"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one body part and caps the list", () => {
    const base = { injuredAt: new Date(), injuryType: "soreness", severity: 2 };
    expect(logInjurySchema.safeParse({ ...base, bodyParts: [] }).success).toBe(false);
    expect(
      logInjurySchema.safeParse({ ...base, bodyParts: Array(21).fill("knee") }).success
    ).toBe(false);
  });
});

describe("logRecoveryActivitySchema", () => {
  it("accepts a physio session logged against an injury", () => {
    const parsed = logRecoveryActivitySchema.parse({
      injuryId: "3f1c2b7e-1c9a-4f5e-9a1b-2c3d4e5f6a7b",
      performedAt: new Date("2026-09-03"),
      modality: "physical_therapy",
      durationMins: 45,
    });
    expect(parsed.modality).toBe("physical_therapy");
  });

  it("rejects a non-uuid injuryId", () => {
    expect(
      logRecoveryActivitySchema.safeParse({
        injuryId: "not-a-uuid",
        performedAt: new Date(),
        modality: "rest_day",
      }).success
    ).toBe(false);
  });
});

describe("createRestrictionSchema", () => {
  it("requires expiresAt to be in the future relative to startsAt", () => {
    const result = createRestrictionSchema.safeParse({
      injuryId: "3f1c2b7e-1c9a-4f5e-9a1b-2c3d4e5f6a7b",
      muscleGroups: ["quadriceps"],
      startsAt: new Date("2026-09-10"),
      expiresAt: new Date("2026-09-01"),
    });
    expect(result.success).toBe(false);
  });
});

describe("listInjuriesSchema", () => {
  it("defaults to an unfiltered query", () => {
    const parsed = listInjuriesSchema.parse({});
    expect(parsed.bodyPart).toBeUndefined();
    expect(parsed.from).toBeUndefined();
  });
});
