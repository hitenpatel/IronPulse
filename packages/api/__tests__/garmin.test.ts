import { describe, it, expect } from "vitest";
import { mapGarminType, mapGarminActivity } from "../src/lib/garmin";

describe("mapGarminType", () => {
  it("maps running to run", () => expect(mapGarminType("running")).toBe("run"));
  it("maps cycling to cycle", () =>
    expect(mapGarminType("cycling")).toBe("cycle"));
  it("maps swimming to swim", () =>
    expect(mapGarminType("swimming")).toBe("swim"));
  it("maps hiking to hike", () =>
    expect(mapGarminType("hiking")).toBe("hike"));
  it("maps walking to walk", () =>
    expect(mapGarminType("walking")).toBe("walk"));
  it("maps trail_running to run", () =>
    expect(mapGarminType("trail_running")).toBe("run"));
  it("maps mountain_biking to cycle", () =>
    expect(mapGarminType("mountain_biking")).toBe("cycle"));
  it("maps unknown to other", () =>
    expect(mapGarminType("yoga")).toBe("other"));
});

describe("mapGarminActivity", () => {
  it("maps Garmin activity to CardioSession fields", () => {
    const result = mapGarminActivity(
      {
        activityId: 12345,
        activityType: "running",
        startTimeInSeconds: 1710500000,
        durationInSeconds: 1800,
        distanceInMeters: 5000,
        elevationGainInMeters: 50,
        averageHeartRateInBeatsPerMinute: 150,
        maxHeartRateInBeatsPerMinute: 175,
        activeKilocalories: 400,
      },
      "user-123",
    );
    expect(result.externalId).toBe("garmin:12345");
    expect(result.type).toBe("run");
    expect(result.source).toBe("garmin");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
  });

  it("handles missing optional fields", () => {
    const result = mapGarminActivity(
      {
        activityId: 99,
        activityType: "swimming",
        startTimeInSeconds: 1710500000,
        durationInSeconds: 600,
      },
      "user-123",
    );
    expect(result.distanceMeters).toBeUndefined();
    expect(result.avgHeartRate).toBeUndefined();
  });
});
