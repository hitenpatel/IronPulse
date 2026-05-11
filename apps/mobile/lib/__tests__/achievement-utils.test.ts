import { describe, it, expect } from "vitest";
import { formatBadgeDate } from "../achievement-utils";

describe("formatBadgeDate", () => {
  it("formats a January date", () => {
    expect(formatBadgeDate(new Date(2026, 0, 1))).toBe("Jan 1, 2026");
  });

  it("formats a December date", () => {
    expect(formatBadgeDate(new Date(2026, 11, 31))).toBe("Dec 31, 2026");
  });

  it("does not zero-pad the day", () => {
    expect(formatBadgeDate(new Date(2026, 4, 9))).toBe("May 9, 2026");
  });

  it("formats the year-boundary day", () => {
    expect(formatBadgeDate(new Date(2025, 11, 31))).toBe("Dec 31, 2025");
    expect(formatBadgeDate(new Date(2026, 0, 1))).toBe("Jan 1, 2026");
  });

  it("covers every month label", () => {
    const labels = Array.from({ length: 12 }, (_, m) =>
      formatBadgeDate(new Date(2026, m, 15)).split(" ")[0],
    );
    expect(labels).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
  });
});
