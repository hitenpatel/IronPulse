import { describe, it, expect } from "vitest";
import {
  getHRZone,
  getHRZoneName,
  getHRZoneColor,
  estimateMaxHR,
  getZoneBoundaries,
} from "../hr-zones";

describe("getHRZone", () => {
  it("returns zone 1 for 55% of max HR", () => {
    expect(getHRZone(110, 200)).toBe(1);
  });

  it("returns zone 2 for 65% of max HR", () => {
    expect(getHRZone(130, 200)).toBe(2);
  });

  it("returns zone 3 for 75% of max HR", () => {
    expect(getHRZone(150, 200)).toBe(3);
  });

  it("returns zone 4 for 85% of max HR", () => {
    expect(getHRZone(170, 200)).toBe(4);
  });

  it("returns zone 5 for 95% of max HR", () => {
    expect(getHRZone(190, 200)).toBe(5);
  });

  it("returns zone 1 for HR below 50% of max", () => {
    expect(getHRZone(80, 200)).toBe(1);
  });

  it("returns zone 5 for HR above 100% of max", () => {
    expect(getHRZone(210, 200)).toBe(5);
  });

  it("returns zone 2 at exactly 60% boundary", () => {
    expect(getHRZone(120, 200)).toBe(2);
  });
});

describe("getHRZoneName", () => {
  it("returns correct names for each zone", () => {
    expect(getHRZoneName(1)).toBe("Recovery");
    expect(getHRZoneName(2)).toBe("Aerobic");
    expect(getHRZoneName(3)).toBe("Tempo");
    expect(getHRZoneName(4)).toBe("Threshold");
    expect(getHRZoneName(5)).toBe("VO2max");
  });
});

describe("getHRZoneColor", () => {
  it("returns correct colors for each zone", () => {
    expect(getHRZoneColor(1)).toBe("#3B82F6");
    expect(getHRZoneColor(2)).toBe("#22C55E");
    expect(getHRZoneColor(3)).toBe("#EAB308");
    expect(getHRZoneColor(4)).toBe("#F97316");
    expect(getHRZoneColor(5)).toBe("#EF4444");
  });
});

describe("estimateMaxHR", () => {
  it("returns 190 for age 30", () => {
    expect(estimateMaxHR(30)).toBe(190);
  });

  it("returns 195 for age 25", () => {
    expect(estimateMaxHR(25)).toBe(195);
  });
});

describe("getZoneBoundaries", () => {
  it("returns correct boundaries for maxHR=200", () => {
    const boundaries = getZoneBoundaries(200);
    expect(boundaries).toHaveLength(5);

    expect(boundaries[0]).toEqual({
      zone: 1,
      min: 100,
      max: 120,
      name: "Recovery",
      color: "#3B82F6",
    });
    expect(boundaries[1]).toEqual({
      zone: 2,
      min: 120,
      max: 140,
      name: "Aerobic",
      color: "#22C55E",
    });
    expect(boundaries[2]).toEqual({
      zone: 3,
      min: 140,
      max: 160,
      name: "Tempo",
      color: "#EAB308",
    });
    expect(boundaries[3]).toEqual({
      zone: 4,
      min: 160,
      max: 180,
      name: "Threshold",
      color: "#F97316",
    });
    expect(boundaries[4]).toEqual({
      zone: 5,
      min: 180,
      max: 200,
      name: "VO2max",
      color: "#EF4444",
    });
  });
});
