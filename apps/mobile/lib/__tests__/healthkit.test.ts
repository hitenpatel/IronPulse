import { describe, it, expect } from "vitest";
import { mapHealthKitTypeToZor, mapZorTypeToHealthKit, makeExternalId, shouldSkipImport } from "../healthkit";

describe("mapHealthKitTypeToZor", () => {
  it("maps Running to run", () => expect(mapHealthKitTypeToZor("Running")).toBe("run"));
  it("maps Cycling to cycle", () => expect(mapHealthKitTypeToZor("Cycling")).toBe("cycle"));
  it("maps Swimming to swim", () => expect(mapHealthKitTypeToZor("Swimming")).toBe("swim"));
  it("maps Hiking to hike", () => expect(mapHealthKitTypeToZor("Hiking")).toBe("hike"));
  it("maps Walking to walk", () => expect(mapHealthKitTypeToZor("Walking")).toBe("walk"));
  it("maps unknown to other", () => expect(mapHealthKitTypeToZor("Yoga")).toBe("other"));
});

describe("mapZorTypeToHealthKit", () => {
  it("maps run to Running", () => expect(mapZorTypeToHealthKit("run")).toBe("Running"));
  it("maps cycle to Cycling", () => expect(mapZorTypeToHealthKit("cycle")).toBe("Cycling"));
  it("maps other to Other", () => expect(mapZorTypeToHealthKit("other")).toBe("Other"));
});

describe("makeExternalId", () => {
  it("creates healthkit: prefixed ID", () => expect(makeExternalId("abc-123")).toBe("healthkit:abc-123"));
});

describe("shouldSkipImport", () => {
  it("skips our bundle", () => expect(shouldSkipImport("com.zor.app")).toBe(true));
  it("allows other bundles", () => expect(shouldSkipImport("com.apple.health")).toBe(false));
  it("allows undefined", () => expect(shouldSkipImport(undefined)).toBe(false));
});
