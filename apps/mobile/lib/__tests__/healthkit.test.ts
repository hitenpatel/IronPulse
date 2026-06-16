import { describe, it, expect } from "vitest";
import { mapHealthKitTypeToMettleLift, mapMettleLiftTypeToHealthKit, makeExternalId, shouldSkipImport } from "../healthkit";

describe("mapHealthKitTypeToMettleLift", () => {
  it("maps Running to run", () => expect(mapHealthKitTypeToMettleLift("Running")).toBe("run"));
  it("maps Cycling to cycle", () => expect(mapHealthKitTypeToMettleLift("Cycling")).toBe("cycle"));
  it("maps Swimming to swim", () => expect(mapHealthKitTypeToMettleLift("Swimming")).toBe("swim"));
  it("maps Hiking to hike", () => expect(mapHealthKitTypeToMettleLift("Hiking")).toBe("hike"));
  it("maps Walking to walk", () => expect(mapHealthKitTypeToMettleLift("Walking")).toBe("walk"));
  it("maps unknown to other", () => expect(mapHealthKitTypeToMettleLift("Yoga")).toBe("other"));
});

describe("mapMettleLiftTypeToHealthKit", () => {
  it("maps run to Running", () => expect(mapMettleLiftTypeToHealthKit("run")).toBe("Running"));
  it("maps cycle to Cycling", () => expect(mapMettleLiftTypeToHealthKit("cycle")).toBe("Cycling"));
  it("maps other to Other", () => expect(mapMettleLiftTypeToHealthKit("other")).toBe("Other"));
});

describe("makeExternalId", () => {
  it("creates healthkit: prefixed ID", () => expect(makeExternalId("abc-123")).toBe("healthkit:abc-123"));
});

describe("shouldSkipImport", () => {
  it("skips our bundle", () => expect(shouldSkipImport("com.mettlelift.app")).toBe(true));
  it("allows other bundles", () => expect(shouldSkipImport("com.apple.health")).toBe(false));
  it("allows undefined", () => expect(shouldSkipImport(undefined)).toBe(false));
});
