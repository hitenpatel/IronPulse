import { afterEach, describe, expect, it } from "vitest";
import { formatDateOnly, parseDateOnlyInput, toUTCDateOnly } from "../date-utils";

const originalTZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTZ;
});

describe("toUTCDateOnly", () => {
  it("anchors a UTC-midnight-literal local date to the same UTC instant", () => {
    process.env.TZ = "UTC";
    const local = new Date(2026, 8, 7); // Sep 7, local midnight
    expect(toUTCDateOnly(local).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("keeps the picked calendar day for a timezone east of UTC (UTC+14)", () => {
    // Without normalisation, local midnight on Sep 7 in Kiritimati serialises
    // to 2026-09-06T10:00:00.000Z — the WRONG (previous) UTC day.
    process.env.TZ = "Pacific/Kiritimati";
    const local = new Date(2026, 8, 7);
    expect(local.toISOString()).not.toBe("2026-09-07T00:00:00.000Z");
    expect(toUTCDateOnly(local).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("keeps the picked calendar day for a timezone west of UTC (UTC-11)", () => {
    // Without normalisation, local midnight on Sep 7 in Midway serialises to
    // 2026-09-07T11:00:00.000Z, which happens to still read as day 7 — so
    // this case instead proves toUTCDateOnly is a no-op idempotent
    // renormalisation rather than an accidental shift.
    process.env.TZ = "Pacific/Midway";
    const local = new Date(2026, 8, 7);
    expect(toUTCDateOnly(local).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
});

describe("parseDateOnlyInput", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    const parsed = parseDateOnlyInput("2026-09-07");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(7);
  });

  it("rejects malformed input", () => {
    expect(parseDateOnlyInput("not-a-date")).toBeNull();
    expect(parseDateOnlyInput("2026/09/07")).toBeNull();
    expect(parseDateOnlyInput("")).toBeNull();
  });

  it("rejects a calendar date that doesn't exist", () => {
    expect(parseDateOnlyInput("2026-02-30")).toBeNull();
  });
});

describe("formatDateOnly", () => {
  it("formats using local calendar components, zero-padded", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDateOnly(new Date(2026, 8, 7))).toBe("2026-09-07");
  });
});
