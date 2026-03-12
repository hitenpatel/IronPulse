import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
  formatVolume,
  getGreeting,
} from "../format";

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(3120)).toBe("52 min");
  });
  it("formats hours and minutes", () => {
    expect(formatDuration(4320)).toBe("1h 12min");
  });
  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0 min");
  });
  it("formats exactly one hour", () => {
    expect(formatDuration(3600)).toBe("1h 0min");
  });
});

describe("formatDistance", () => {
  it("formats meters to km with one decimal", () => {
    expect(formatDistance(5200)).toBe("5.2 km");
  });
  it("formats sub-km distance", () => {
    expect(formatDistance(800)).toBe("0.8 km");
  });
  it("formats zero", () => {
    expect(formatDistance(0)).toBe("0.0 km");
  });
});

describe("formatPace", () => {
  it("calculates pace in min/km", () => {
    expect(formatPace(5200, 1740)).toBe("5:34/km");
  });
  it("handles zero distance", () => {
    expect(formatPace(0, 100)).toBe("--/km");
  });
});

describe("formatRelativeDate", () => {
  it("returns 'Today' for today", () => {
    expect(formatRelativeDate(new Date())).toBe("Today");
  });
  it("returns 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe("Yesterday");
  });
  it("returns day name for this week", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dayName = threeDaysAgo.toLocaleDateString("en-US", { weekday: "short" });
    expect(formatRelativeDate(threeDaysAgo)).toBe(dayName);
  });
  it("returns date for older", () => {
    const old = new Date(2026, 0, 15);
    expect(formatRelativeDate(old)).toBe("Jan 15");
  });
});

describe("formatVolume", () => {
  it("formats with comma separator", () => {
    expect(formatVolume(12400)).toBe("12,400 kg");
  });
  it("formats zero", () => {
    expect(formatVolume(0)).toBe("0 kg");
  });
});

describe("getGreeting", () => {
  it("returns a greeting string", () => {
    const result = getGreeting();
    expect(result).toMatch(/^Good (morning|afternoon|evening)$/);
  });
});
