import { describe, it, expect } from "vitest";
import { mapHealthKitTypeToIronPulse, mapIronPulseTypeToHealthKit, makeExternalId, shouldSkipImport } from "../healthkit";

describe("mapHealthKitTypeToIronPulse", () => {
  it("maps Running to run", () => expect(mapHealthKitTypeToIronPulse("Running")).toBe("run"));
  it("maps Cycling to cycle", () => expect(mapHealthKitTypeToIronPulse("Cycling")).toBe("cycle"));
  it("maps Swimming to swim", () => expect(mapHealthKitTypeToIronPulse("Swimming")).toBe("swim"));
  it("maps Hiking to hike", () => expect(mapHealthKitTypeToIronPulse("Hiking")).toBe("hike"));
  it("maps Walking to walk", () => expect(mapHealthKitTypeToIronPulse("Walking")).toBe("walk"));
  it("maps unknown to other", () => expect(mapHealthKitTypeToIronPulse("Yoga")).toBe("other"));
});

describe("mapIronPulseTypeToHealthKit", () => {
  it("maps run to Running", () => expect(mapIronPulseTypeToHealthKit("run")).toBe("Running"));
  it("maps cycle to Cycling", () => expect(mapIronPulseTypeToHealthKit("cycle")).toBe("Cycling"));
  it("maps other to Other", () => expect(mapIronPulseTypeToHealthKit("other")).toBe("Other"));
});

describe("makeExternalId", () => {
  it("creates healthkit: prefixed ID", () => expect(makeExternalId("abc-123")).toBe("healthkit:abc-123"));
});

describe("shouldSkipImport", () => {
  it("skips our bundle", () => expect(shouldSkipImport("com.ironpulse.app")).toBe(true));
  it("allows other bundles", () => expect(shouldSkipImport("com.apple.health")).toBe(false));
  it("allows undefined", () => expect(shouldSkipImport(undefined)).toBe(false));
});
