import { describe, it, expect } from "vitest";
import {
  heatmapCells,
  currentWeekRange,
  greeting,
  dateLabel,
  compactDuration,
  volumeTons,
} from "../dashboard-utils";

const at = (iso: string) => ({ started_at: iso });

describe("heatmapCells", () => {
  const now = new Date("2026-04-19T10:00:00"); // Sunday

  it("returns N cells, oldest-first", () => {
    const cells = heatmapCells([], 21, now);
    expect(cells).toHaveLength(21);
    // Last cell is today
    expect(cells[20].date.getDate()).toBe(19);
    // First cell is 20 days ago → Mar 30
    expect(cells[0].date.getDate()).toBe(30);
    expect(cells[0].date.getMonth()).toBe(2); // March
  });

  it("marks the correct day when activity happens", () => {
    const cells = heatmapCells([at("2026-04-19T08:00:00")], 21, now);
    expect(cells[20].count).toBe(1);
    expect(cells[20].intensity).toBe(0.5);
  });

  it("clamps intensity to 1 for 2+ sessions in one day", () => {
    const cells = heatmapCells(
      [at("2026-04-19T08:00:00"), at("2026-04-19T17:00:00"), at("2026-04-19T19:00:00")],
      21,
      now,
    );
    expect(cells[20].count).toBe(3);
    expect(cells[20].intensity).toBe(1);
  });

  it("ignores activity outside the window", () => {
    const cells = heatmapCells([at("2020-01-01T00:00:00")], 21, now);
    expect(cells.every((c) => c.count === 0)).toBe(true);
  });
});

describe("currentWeekRange", () => {
  it("returns Mon→Sun for a mid-week day", () => {
    const wed = new Date("2026-04-15T10:00:00");
    const [mon, sun] = currentWeekRange(wed);
    expect(mon.getDay()).toBe(1);
    expect(sun.getDay()).toBe(0);
    expect(mon.getDate()).toBe(13);
    expect(sun.getDate()).toBe(19);
  });

  it("handles Sunday correctly (last day of the week)", () => {
    const sun = new Date("2026-04-19T10:00:00");
    const [mon, end] = currentWeekRange(sun);
    expect(mon.getDate()).toBe(13);
    expect(end.getDate()).toBe(19);
  });
});

describe("greeting", () => {
  it("returns Morning before noon", () => {
    expect(greeting(new Date("2026-04-19T08:00:00"))).toBe("Morning");
  });
  it("returns Afternoon 12:00–16:59", () => {
    expect(greeting(new Date("2026-04-19T13:00:00"))).toBe("Afternoon");
  });
  it("returns Evening 17:00 onwards", () => {
    expect(greeting(new Date("2026-04-19T20:00:00"))).toBe("Evening");
  });
});

describe("dateLabel", () => {
  it("formats the full label string", () => {
    const label = dateLabel(new Date("2026-04-19T10:00:00"));
    expect(label).toMatch(/Sun · 19 Apr · Week \d+/);
  });
});

describe("compactDuration", () => {
  it("< 1 min → 0:00 hr", () => {
    expect(compactDuration(30)).toEqual({ value: "0:00", unit: "hr" });
  });
  it("< 60 min → min unit", () => {
    expect(compactDuration(600)).toEqual({ value: "10", unit: "min" });
  });
  it(">= 60 min → h:mm hr", () => {
    expect(compactDuration(10080)).toEqual({ value: "2:48", unit: "hr" });
  });
});

describe("volumeTons", () => {
  it("divides by 1000 and rounds to one decimal", () => {
    expect(volumeTons(14234)).toBe("14.2");
    expect(volumeTons(500)).toBe("0.5");
    expect(volumeTons(0)).toBe("0");
    expect(volumeTons(-10)).toBe("0");
  });
});
