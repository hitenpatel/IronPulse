import { describe, expect, it } from "vitest";
import { nextAttemptDelayMs, MAX_ATTEMPTS } from "../src/lib/webhook-backoff";

describe("nextAttemptDelayMs", () => {
  it("MAX_ATTEMPTS is 6", () => {
    expect(MAX_ATTEMPTS).toBe(6);
  });
  it("returns 1 min after the 1st failed attempt", () => {
    expect(nextAttemptDelayMs(1)).toBe(60_000);
  });
  it("returns 5 min after the 2nd failed attempt", () => {
    expect(nextAttemptDelayMs(2)).toBe(5 * 60_000);
  });
  it("returns 30 min after the 3rd failed attempt", () => {
    expect(nextAttemptDelayMs(3)).toBe(30 * 60_000);
  });
  it("returns 2 h after the 4th failed attempt", () => {
    expect(nextAttemptDelayMs(4)).toBe(2 * 60 * 60_000);
  });
  it("returns 6 h after the 5th failed attempt", () => {
    expect(nextAttemptDelayMs(5)).toBe(6 * 60 * 60_000);
  });
  it("returns null (DLQ) after the 6th failed attempt", () => {
    expect(nextAttemptDelayMs(6)).toBeNull();
  });
  it("returns null for any attempts count above 6", () => {
    expect(nextAttemptDelayMs(7)).toBeNull();
    expect(nextAttemptDelayMs(100)).toBeNull();
  });
  it("throws for non-positive attempts", () => {
    expect(() => nextAttemptDelayMs(0)).toThrow();
    expect(() => nextAttemptDelayMs(-1)).toThrow();
  });
});
