import { describe, it, expect } from "vitest";
import {
  mapGoogleFitTypeToZor,
  mapZorTypeToGoogleFit,
  makeGoogleFitExternalId,
  shouldSkipGoogleFitImport,
} from "../googlefit";

describe("mapGoogleFitTypeToZor", () => {
  it("maps running (8) to run", () =>
    expect(mapGoogleFitTypeToZor(8)).toBe("run"));
  it("maps biking (1) to cycle", () =>
    expect(mapGoogleFitTypeToZor(1)).toBe("cycle"));
  it("maps swimming (82) to swim", () =>
    expect(mapGoogleFitTypeToZor(82)).toBe("swim"));
  it("maps hiking (35) to hike", () =>
    expect(mapGoogleFitTypeToZor(35)).toBe("hike"));
  it("maps walking (7) to walk", () =>
    expect(mapGoogleFitTypeToZor(7)).toBe("walk"));
  it("maps unknown to other", () =>
    expect(mapGoogleFitTypeToZor(99)).toBe("other"));
});

describe("mapZorTypeToGoogleFit", () => {
  it("maps run to 8", () => expect(mapZorTypeToGoogleFit("run")).toBe(8));
  it("maps cycle to 1", () =>
    expect(mapZorTypeToGoogleFit("cycle")).toBe(1));
  it("maps swim to 82", () =>
    expect(mapZorTypeToGoogleFit("swim")).toBe(82));
  it("maps hike to 35", () =>
    expect(mapZorTypeToGoogleFit("hike")).toBe(35));
  it("maps walk to 7", () =>
    expect(mapZorTypeToGoogleFit("walk")).toBe(7));
  it("maps unknown to 4 (unknown activity)", () =>
    expect(mapZorTypeToGoogleFit("other")).toBe(4));
});

describe("makeGoogleFitExternalId", () => {
  it("creates googlefit: prefixed ID", () =>
    expect(makeGoogleFitExternalId("source-123")).toBe("googlefit:source-123"));
});

describe("shouldSkipGoogleFitImport", () => {
  it("skips our package", () =>
    expect(shouldSkipGoogleFitImport("com.zor.app")).toBe(true));
  it("allows other packages", () =>
    expect(shouldSkipGoogleFitImport("com.google.android.gms")).toBe(false));
  it("allows undefined", () =>
    expect(shouldSkipGoogleFitImport(undefined)).toBe(false));
});
