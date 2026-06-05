import { describe, expect, it } from "vitest";
import { cardioTypeEnum, createCardioSchema, listCardioSchema } from "../schemas/cardio";
import { CardioType, HYROX_CARDIO_TYPES } from "../enums";

describe("HYROX_CARDIO_TYPES constant", () => {
  it("contains the six expected HYROX exercise keys", () => {
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.SKI_ERG);
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.SLED_PUSH);
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.SLED_PULL);
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.SANDBAG_CARRY);
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.BURPEE_BROAD_JUMP);
    expect(HYROX_CARDIO_TYPES).toContain(CardioType.WALL_BALL);
    expect(HYROX_CARDIO_TYPES.length).toBe(6);
  });
});

describe("cardioTypeEnum — HYROX type validation", () => {
  it("accepts all six HYROX exercise types", () => {
    for (const type of HYROX_CARDIO_TYPES) {
      expect(cardioTypeEnum.parse(type)).toBe(type);
    }
  });

  it("still accepts all original cardio types", () => {
    for (const type of ["run", "cycle", "swim", "hike", "walk", "row", "elliptical", "other"] as const) {
      expect(cardioTypeEnum.parse(type)).toBe(type);
    }
  });

  it("rejects unknown types", () => {
    expect(() => cardioTypeEnum.parse("cross_fit")).toThrow();
    expect(() => cardioTypeEnum.parse("")).toThrow();
  });
});

describe("createCardioSchema — HYROX sessions", () => {
  const base = {
    startedAt: new Date("2026-05-01T09:00:00Z"),
    durationSeconds: 300,
  };

  it("accepts ski_erg with distance in meters", () => {
    const result = createCardioSchema.parse({ ...base, type: "ski_erg", distanceMeters: 1000 });
    expect(result.type).toBe("ski_erg");
    expect(result.distanceMeters).toBe(1000);
  });

  it("accepts wall_ball with rep count stored as distanceMeters", () => {
    const result = createCardioSchema.parse({ ...base, type: "wall_ball", distanceMeters: 100 });
    expect(result.type).toBe("wall_ball");
    expect(result.distanceMeters).toBe(100);
  });

  it("accepts HYROX session without distanceMeters (time-only)", () => {
    expect(() => createCardioSchema.parse({ ...base, type: "sled_push" })).not.toThrow();
  });

  it("rejects durationSeconds of zero", () => {
    expect(() => createCardioSchema.parse({ ...base, type: "ski_erg", durationSeconds: 0 })).toThrow();
  });
});

describe("listCardioSchema — type filter", () => {
  it("accepts a HYROX type as filter", () => {
    const result = listCardioSchema.parse({ type: "ski_erg" });
    expect(result.type).toBe("ski_erg");
  });

  it("accepts undefined type (no filter)", () => {
    const result = listCardioSchema.parse({ limit: 20 });
    expect(result.type).toBeUndefined();
  });

  it("rejects an invalid type value", () => {
    expect(() => listCardioSchema.parse({ type: "not_a_type" })).toThrow();
  });

  it("applies default limit of 50", () => {
    const result = listCardioSchema.parse({});
    expect(result.limit).toBe(50);
  });
});
