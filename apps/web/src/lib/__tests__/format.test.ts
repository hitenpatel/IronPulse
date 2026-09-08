import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
  formatVolume,
  getGreeting,
  dateInputToUTCMidnight,
  formatUTCDate,
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

describe("dateInputToUTCMidnight", () => {
  it("parses a date-only input string to UTC midnight", () => {
    const result = dateInputToUTCMidnight("2026-09-01");
    expect(result.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("is not affected by the runtime's local timezone (non-UTC case)", () => {
    // Regression for the injury/recovery/restriction date bug: appending
    // "T00:00:00" without an offset parses as *local* midnight, which
    // would serialize to a different UTC calendar day for timezones on
    // either side of UTC. Asserting on getUTC* accessors, not local
    // getters, proves the value lands on the intended UTC day regardless
    // of which timezone this test happens to run in.
    const result = dateInputToUTCMidnight("2026-01-15");
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
  });

  it("handles a December 31 date without rolling into the next year", () => {
    const result = dateInputToUTCMidnight("2026-12-31");
    expect(result.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});

describe("formatUTCDate", () => {
  it("renders the UTC calendar day even for a date whose local rendering would differ", () => {
    // 2026-09-01T00:00:00.000Z is Aug 31 evening in US timezones and Sep 1
    // morning east of UTC — formatUTCDate must always say Sep 1.
    expect(formatUTCDate(new Date("2026-09-01T00:00:00.000Z"))).toBe(
      "Sep 1, 2026"
    );
  });

  it("accepts a string date", () => {
    expect(formatUTCDate("2026-01-15T00:00:00.000Z")).toBe("Jan 15, 2026");
  });
});
