import { describe, it, expect, vi } from "vitest";
import { getWorkoutName, calculateVolume, formatElapsed } from "../workout-utils";

describe("getWorkoutName", () => {
  it("returns 'Morning Workout' before noon", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 9, 0));
    expect(getWorkoutName()).toBe("Morning Workout");
    vi.useRealTimers();
  });

  it("returns 'Afternoon Workout' between noon and 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 14, 0));
    expect(getWorkoutName()).toBe("Afternoon Workout");
    vi.useRealTimers();
  });

  it("returns 'Evening Workout' after 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 19, 0));
    expect(getWorkoutName()).toBe("Evening Workout");
    vi.useRealTimers();
  });
});

describe("calculateVolume", () => {
  it("sums weight * reps for completed sets", () => {
    const sets = [
      { weightKg: 80, reps: 8, completed: true },
      { weightKg: 85, reps: 6, completed: true },
      { weightKg: 85, reps: 5, completed: false },
    ];
    // 80*8 + 85*6 = 640 + 510 = 1150
    expect(calculateVolume(sets)).toBe(1150);
  });

  it("returns 0 for empty sets", () => {
    expect(calculateVolume([])).toBe(0);
  });

  it("skips sets with null weight or reps", () => {
    const sets = [
      { weightKg: 80, reps: 8, completed: true },
      { weightKg: null, reps: 8, completed: true },
      { weightKg: 80, reps: null, completed: true },
    ];
    expect(calculateVolume(sets)).toBe(640);
  });
});

describe("formatElapsed", () => {
  it("formats seconds to MM:SS", () => {
    expect(formatElapsed(125)).toBe("2:05");
  });

  it("formats to H:MM:SS when over an hour", () => {
    expect(formatElapsed(3725)).toBe("1:02:05");
  });

  it("formats zero", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });
});
