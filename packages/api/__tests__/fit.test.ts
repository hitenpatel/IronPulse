import { describe, it, expect } from "vitest";
import { mapFitActivityType, extractFitData } from "../src/lib/fit";

describe("mapFitActivityType", () => {
  it("maps running to run", () =>
    expect(mapFitActivityType("running")).toBe("run"));
  it("maps cycling to cycle", () =>
    expect(mapFitActivityType("cycling")).toBe("cycle"));
  it("maps swimming to swim", () =>
    expect(mapFitActivityType("swimming")).toBe("swim"));
  it("maps hiking to hike", () =>
    expect(mapFitActivityType("hiking")).toBe("hike"));
  it("maps walking to walk", () =>
    expect(mapFitActivityType("walking")).toBe("walk"));
  it("maps trail_running to run", () =>
    expect(mapFitActivityType("trail_running")).toBe("run"));
  it("maps unknown to other", () =>
    expect(mapFitActivityType("yoga")).toBe("other"));
});

describe("extractFitData", () => {
  it("extracts session data from parsed FIT", () => {
    const mockParsed = {
      sessions: [
        {
          sport: "running",
          start_time: new Date("2026-03-16T10:00:00Z"),
          total_elapsed_time: 1800,
          total_distance: 5000,
          total_ascent: 50,
          avg_heart_rate: 150,
          max_heart_rate: 175,
          total_calories: 400,
        },
      ],
      records: [
        {
          position_lat: 51.5,
          position_long: -0.1,
          altitude: 10,
          heart_rate: 120,
          timestamp: new Date("2026-03-16T10:00:00Z"),
        },
        {
          position_lat: 51.501,
          position_long: -0.101,
          altitude: 15,
          heart_rate: 130,
          timestamp: new Date("2026-03-16T10:00:03Z"),
        },
      ],
    };
    const result = extractFitData(mockParsed);
    expect(result.type).toBe("run");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.points).toHaveLength(2);
    expect(result.points[0].latitude).toBe(51.5);
  });

  it("handles missing records", () => {
    const result = extractFitData({
      sessions: [
        {
          sport: "cycling",
          start_time: new Date(),
          total_elapsed_time: 600,
        },
      ],
      records: [],
    });
    expect(result.type).toBe("cycle");
    expect(result.points).toHaveLength(0);
  });
});
