import { describe, it, expect } from "vitest";
import {
  mapGoogleFitTypeToIronPulse,
  mapIronPulseTypeToGoogleFit,
  makeGoogleFitExternalId,
  shouldSkipGoogleFitImport,
} from "../googlefit";

describe("mapGoogleFitTypeToIronPulse", () => {
  it("maps running (8) to run", () =>
    expect(mapGoogleFitTypeToIronPulse(8)).toBe("run"));
  it("maps biking (1) to cycle", () =>
    expect(mapGoogleFitTypeToIronPulse(1)).toBe("cycle"));
  it("maps swimming (82) to swim", () =>
    expect(mapGoogleFitTypeToIronPulse(82)).toBe("swim"));
  it("maps hiking (35) to hike", () =>
    expect(mapGoogleFitTypeToIronPulse(35)).toBe("hike"));
  it("maps walking (7) to walk", () =>
    expect(mapGoogleFitTypeToIronPulse(7)).toBe("walk"));
  it("maps unknown to other", () =>
    expect(mapGoogleFitTypeToIronPulse(99)).toBe("other"));
});

describe("mapIronPulseTypeToGoogleFit", () => {
  it("maps run to 8", () => expect(mapIronPulseTypeToGoogleFit("run")).toBe(8));
  it("maps cycle to 1", () =>
    expect(mapIronPulseTypeToGoogleFit("cycle")).toBe(1));
  it("maps swim to 82", () =>
    expect(mapIronPulseTypeToGoogleFit("swim")).toBe(82));
  it("maps hike to 35", () =>
    expect(mapIronPulseTypeToGoogleFit("hike")).toBe(35));
  it("maps walk to 7", () =>
    expect(mapIronPulseTypeToGoogleFit("walk")).toBe(7));
  it("maps unknown to 4 (unknown activity)", () =>
    expect(mapIronPulseTypeToGoogleFit("other")).toBe(4));
});

describe("makeGoogleFitExternalId", () => {
  it("creates googlefit: prefixed ID", () =>
    expect(makeGoogleFitExternalId("source-123")).toBe("googlefit:source-123"));
});

describe("shouldSkipGoogleFitImport", () => {
  it("skips our package", () =>
    expect(shouldSkipGoogleFitImport("com.ironpulse.app")).toBe(true));
  it("allows other packages", () =>
    expect(shouldSkipGoogleFitImport("com.google.android.gms")).toBe(false));
  it("allows undefined", () =>
    expect(shouldSkipGoogleFitImport(undefined)).toBe(false));
});
