import { describe, it, expect } from "vitest";
import {
  mapStravaType,
  mapStravaActivity,
  mapStravaStreamsToRoutePoints,
} from "../src/lib/strava";

describe("mapStravaType", () => {
  it("maps Run to run", () => expect(mapStravaType("Run")).toBe("run"));
  it("maps Ride to cycle", () => expect(mapStravaType("Ride")).toBe("cycle"));
  it("maps Swim to swim", () => expect(mapStravaType("Swim")).toBe("swim"));
  it("maps Hike to hike", () => expect(mapStravaType("Hike")).toBe("hike"));
  it("maps Walk to walk", () => expect(mapStravaType("Walk")).toBe("walk"));
  it("maps VirtualRun to run", () =>
    expect(mapStravaType("VirtualRun")).toBe("run"));
  it("maps unknown to other", () =>
    expect(mapStravaType("Yoga")).toBe("other"));
});

describe("mapStravaActivity", () => {
  it("maps a Strava activity to CardioSession fields", () => {
    const result = mapStravaActivity(
      {
        id: 12345,
        type: "Run",
        start_date: "2026-03-15T10:00:00Z",
        elapsed_time: 1800,
        distance: 5000,
        total_elevation_gain: 50,
        average_heartrate: 150,
        max_heartrate: 175,
        calories: 400,
        description: "Morning run",
      },
      "user-123",
    );
    expect(result.externalId).toBe("strava:12345");
    expect(result.type).toBe("run");
    expect(result.source).toBe("strava");
    expect(result.durationSeconds).toBe(1800);
  });

  it("handles missing optional fields", () => {
    const result = mapStravaActivity(
      {
        id: 99,
        type: "Swim",
        start_date: "2026-03-15T10:00:00Z",
        elapsed_time: 600,
        distance: 500,
      },
      "user-123",
    );
    expect(result.avgHeartRate).toBeUndefined();
  });
});

describe("mapStravaStreamsToRoutePoints", () => {
  it("maps streams to route points", () => {
    const points = mapStravaStreamsToRoutePoints(
      {
        latlng: {
          data: [
            [51.5, -0.1],
            [51.501, -0.101],
          ],
        },
        altitude: { data: [10, 15] },
        heartrate: { data: [120, 130] },
        time: { data: [0, 5] },
      },
      "2026-03-15T10:00:00Z",
      "session-1",
    );
    expect(points).toHaveLength(2);
    expect(points[0].latitude).toBe(51.5);
    expect(points[0].elevationM).toBe(10);
  });

  it("handles missing streams", () => {
    const points = mapStravaStreamsToRoutePoints(
      { latlng: { data: [[51.5, -0.1]] } },
      "2026-03-15T10:00:00Z",
      "session-1",
    );
    expect(points[0].elevationM).toBeNull();
    expect(points[0].heartRate).toBeNull();
  });
});
