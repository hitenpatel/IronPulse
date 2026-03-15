import { describe, it, expect } from "vitest";
import { haversineDistance, totalDistance, calculatePace, formatPace, metersToKm, metersToMiles } from "../geo-utils";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });
  it("calculates London to Paris (~340km)", () => {
    const d = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(340000);
    expect(d).toBeLessThan(345000);
  });
  it("calculates short distance", () => {
    const d = haversineDistance(0, 0, 0.001, 0);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe("totalDistance", () => {
  it("returns 0 for empty array", () => { expect(totalDistance([])).toBe(0); });
  it("returns 0 for single point", () => { expect(totalDistance([{latitude:0,longitude:0}])).toBe(0); });
  it("sums distances", () => {
    const d = totalDistance([{latitude:0,longitude:0},{latitude:0.001,longitude:0},{latitude:0.002,longitude:0}]);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(240);
  });
});

describe("calculatePace", () => {
  it("returns pace in seconds per km", () => { expect(calculatePace(5000, 1500)).toBe(300); });
  it("returns 0 for zero distance", () => { expect(calculatePace(0, 100)).toBe(0); });
});

describe("formatPace", () => {
  it("formats 300 as 5:00", () => { expect(formatPace(300)).toBe("5:00"); });
  it("formats 330 as 5:30", () => { expect(formatPace(330)).toBe("5:30"); });
});

describe("unit conversion", () => {
  it("meters to km", () => { expect(metersToKm(5000)).toBe(5); });
  it("meters to miles", () => { expect(metersToMiles(1609.34)).toBeCloseTo(1, 1); });
});
