import { describe, it, expect, vi, afterEach } from "vitest";
import { getWorkoutName, calculateVolume, formatElapsed } from "../workout-utils";

afterEach(() => {
  vi.useRealTimers();
});

describe("getWorkoutName", () => {
  it("returns Morning Workout before noon", () => {
    vi.setSystemTime(new Date("2026-05-02T07:30:00"));
    expect(getWorkoutName()).toBe("Morning Workout");
  });

  it("returns Morning Workout at midnight", () => {
    vi.setSystemTime(new Date("2026-05-02T00:00:00"));
    expect(getWorkoutName()).toBe("Morning Workout");
  });

  it("returns Afternoon Workout from noon to 16:59", () => {
    vi.setSystemTime(new Date("2026-05-02T12:00:00"));
    expect(getWorkoutName()).toBe("Afternoon Workout");

    vi.setSystemTime(new Date("2026-05-02T16:59:00"));
    expect(getWorkoutName()).toBe("Afternoon Workout");
  });

  it("returns Evening Workout at 17:00 and beyond", () => {
    vi.setSystemTime(new Date("2026-05-02T17:00:00"));
    expect(getWorkoutName()).toBe("Evening Workout");

    vi.setSystemTime(new Date("2026-05-02T23:59:00"));
    expect(getWorkoutName()).toBe("Evening Workout");
  });
});

describe("calculateVolume", () => {
  it("sums weight × reps for completed sets", () => {
    const sets = [
      { weight_kg: 100, reps: 5, completed: 1 },
      { weight_kg: 80, reps: 8, completed: 1 },
    ];
    expect(calculateVolume(sets)).toBe(1140);
  });

  it("excludes sets where completed is 0", () => {
    const sets = [
      { weight_kg: 100, reps: 5, completed: 0 },
      { weight_kg: 80, reps: 8, completed: 1 },
    ];
    expect(calculateVolume(sets)).toBe(640);
  });

  it("excludes sets with null weight_kg", () => {
    const sets = [
      { weight_kg: null, reps: 5, completed: 1 },
      { weight_kg: 60, reps: 10, completed: 1 },
    ];
    expect(calculateVolume(sets)).toBe(600);
  });

  it("excludes sets with null reps", () => {
    const sets = [
      { weight_kg: 100, reps: null, completed: 1 },
      { weight_kg: 60, reps: 10, completed: 1 },
    ];
    expect(calculateVolume(sets)).toBe(600);
  });

  it("returns 0 for an empty set list", () => {
    expect(calculateVolume([])).toBe(0);
  });

  it("returns 0 when all sets are incomplete", () => {
    const sets = [
      { weight_kg: 100, reps: 5, completed: 0 },
      { weight_kg: 80, reps: 8, completed: 0 },
    ];
    expect(calculateVolume(sets)).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("formats seconds-only duration (< 1 minute)", () => {
    expect(formatElapsed(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsed(90)).toBe("1:30");
    expect(formatElapsed(599)).toBe("9:59");
    expect(formatElapsed(3599)).toBe("59:59");
  });

  it("zero-pads seconds to two digits", () => {
    expect(formatElapsed(61)).toBe("1:01");
    expect(formatElapsed(600)).toBe("10:00");
  });

  it("formats hours with padded minutes and seconds when >= 1 hour", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3661)).toBe("1:01:01");
    expect(formatElapsed(7384)).toBe("2:03:04");
  });

  it("returns 0:00 for zero seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });
});
