import { describe, it, expect } from "vitest";
import {
  median,
  computeWorkoutEfficiencyReport,
  type EfficiencyEventRow,
} from "../src/lib/workout-efficiency-report";

function row(overrides: Partial<EfficiencyEventRow> = {}): EfficiencyEventRow {
  return {
    isFirstCompletedSet: false,
    interactionCount: 3,
    msSinceSessionStart: null,
    isNewAthlete: null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for an odd-length array", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for an even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("computeWorkoutEfficiencyReport — before/after split", () => {
  const releaseAt = new Date("2026-08-15T00:00:00Z");

  it("buckets rows strictly before releaseAt into 'before' and the rest into 'after'", () => {
    const rows = [
      row({ createdAt: new Date("2026-08-14T23:59:59Z") }),
      row({ createdAt: releaseAt }),
      row({ createdAt: new Date("2026-08-16T00:00:00Z") }),
    ];
    const report = computeWorkoutEfficiencyReport(rows, releaseAt);
    expect(report.before.overall.sampleSize).toBe(1);
    expect(report.after.overall.sampleSize).toBe(2);
  });

  it("computes median time-to-first-set only from isFirstCompletedSet rows", () => {
    const rows = [
      row({
        isFirstCompletedSet: true,
        msSinceSessionStart: 10_000,
        createdAt: new Date("2026-08-16T00:00:00Z"),
      }),
      row({
        isFirstCompletedSet: true,
        msSinceSessionStart: 20_000,
        createdAt: new Date("2026-08-16T00:00:01Z"),
      }),
      // Later-set row in the same sessions — must NOT pollute the
      // time-to-first-set median even though msSinceSessionStart is null.
      row({
        isFirstCompletedSet: false,
        msSinceSessionStart: null,
        createdAt: new Date("2026-08-16T00:00:02Z"),
      }),
    ];
    const report = computeWorkoutEfficiencyReport(rows, releaseAt);
    expect(report.after.overall.medianMsToFirstCompletedSet).toBe(15_000);
  });

  it("computes median interactions per completed set across ALL rows in the period", () => {
    const rows = [
      row({ interactionCount: 2, createdAt: new Date("2026-08-16T00:00:00Z") }),
      row({ interactionCount: 4, createdAt: new Date("2026-08-16T00:00:01Z") }),
      row({ interactionCount: 6, createdAt: new Date("2026-08-16T00:00:02Z") }),
    ];
    const report = computeWorkoutEfficiencyReport(rows, releaseAt);
    expect(report.after.overall.medianInteractionsPerCompletedSet).toBe(4);
  });

  it("returns null medians (not zero, not a crash) for an empty period", () => {
    const report = computeWorkoutEfficiencyReport([], releaseAt);
    expect(report.before.overall.sampleSize).toBe(0);
    expect(report.before.overall.medianMsToFirstCompletedSet).toBeNull();
    expect(report.before.overall.medianInteractionsPerCompletedSet).toBeNull();
  });
});

describe("computeWorkoutEfficiencyReport — cohort split availability (AC #4)", () => {
  const releaseAt = new Date("2026-08-15T00:00:00Z");

  it("omits the new/returning split entirely when no row carries isNewAthlete", () => {
    const rows = [
      row({ isNewAthlete: null, createdAt: new Date("2026-08-16T00:00:00Z") }),
      row({ isNewAthlete: null, createdAt: new Date("2026-08-16T00:00:01Z") }),
    ];
    const report = computeWorkoutEfficiencyReport(rows, releaseAt);
    expect(report.after.newAthletes).toBeNull();
    expect(report.after.returningAthletes).toBeNull();
    // Overall stats are still reported even without a cohort split.
    expect(report.after.overall.sampleSize).toBe(2);
  });

  it("splits new vs returning once at least one row in the period has a cohort flag", () => {
    const rows = [
      row({
        isNewAthlete: true,
        isFirstCompletedSet: true,
        msSinceSessionStart: 10_000,
        createdAt: new Date("2026-08-16T00:00:00Z"),
      }),
      row({
        isNewAthlete: false,
        isFirstCompletedSet: true,
        msSinceSessionStart: 30_000,
        createdAt: new Date("2026-08-16T00:00:01Z"),
      }),
    ];
    const report = computeWorkoutEfficiencyReport(rows, releaseAt);
    expect(report.after.newAthletes).not.toBeNull();
    expect(report.after.returningAthletes).not.toBeNull();
    expect(report.after.newAthletes!.medianMsToFirstCompletedSet).toBe(10_000);
    expect(report.after.returningAthletes!.medianMsToFirstCompletedSet).toBe(30_000);
  });

  it("does not let a null-cohort row in one period suppress the split in a period where data exists", () => {
    const beforeRows = [row({ isNewAthlete: null, createdAt: new Date("2026-08-01T00:00:00Z") })];
    const afterRows = [row({ isNewAthlete: true, createdAt: new Date("2026-08-16T00:00:00Z") })];
    const report = computeWorkoutEfficiencyReport([...beforeRows, ...afterRows], releaseAt);
    expect(report.before.newAthletes).toBeNull();
    expect(report.after.newAthletes).not.toBeNull();
  });
});
