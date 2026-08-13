import { describe, it, expect } from "vitest";
import {
  restReducer,
  computeRemainingSeconds,
  getRestDuration,
  NORMAL_REST_SECONDS,
  SUPERSET_REST_SECONDS,
  type RestState,
} from "../workout-rest-state";

const NOW = 1_000_000_000_000; // stable reference timestamp

describe("restReducer – START", () => {
  it("transitions from idle to running with default duration", () => {
    const next = restReducer({ status: "idle" }, { type: "START", nowMs: NOW });
    expect(next).toEqual({
      status: "running",
      deadlineMs: NOW + NORMAL_REST_SECONDS * 1000,
    });
  });

  it("respects custom duration", () => {
    const next = restReducer(
      { status: "idle" },
      { type: "START", nowMs: NOW, durationSeconds: 120 },
    );
    expect(next).toEqual({ status: "running", deadlineMs: NOW + 120_000 });
  });
});

describe("restReducer – PAUSE / RESUME", () => {
  const running: RestState = { status: "running", deadlineMs: NOW + 60_000 };

  it("PAUSE captures remaining seconds", () => {
    const next = restReducer(running, { type: "PAUSE", nowMs: NOW });
    expect(next).toEqual({ status: "paused", remainingSeconds: 60 });
  });

  it("RESUME restores deadline from remaining seconds", () => {
    const paused: RestState = { status: "paused", remainingSeconds: 45 };
    const next = restReducer(paused, { type: "RESUME", nowMs: NOW });
    expect(next).toEqual({ status: "running", deadlineMs: NOW + 45_000 });
  });

  it("PAUSE on idle is no-op", () => {
    const s: RestState = { status: "idle" };
    expect(restReducer(s, { type: "PAUSE", nowMs: NOW })).toEqual(s);
  });
});

describe("restReducer – ADJUST", () => {
  it("-15 decreases deadline when running", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 90_000 };
    const next = restReducer(running, { type: "ADJUST", nowMs: NOW, deltaSeconds: -15 });
    expect(next).toEqual({ status: "running", deadlineMs: NOW + 75_000 });
  });

  it("+15 increases deadline when running", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 90_000 };
    const next = restReducer(running, { type: "ADJUST", nowMs: NOW, deltaSeconds: 15 });
    expect(next).toEqual({ status: "running", deadlineMs: NOW + 105_000 });
  });

  it("ADJUST on paused modifies remainingSeconds", () => {
    const paused: RestState = { status: "paused", remainingSeconds: 60 };
    const next = restReducer(paused, { type: "ADJUST", deltaSeconds: -15 });
    expect(next).toEqual({ status: "paused", remainingSeconds: 45 });
  });

  it("ADJUST does not push deadline below now", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 5_000 };
    const next = restReducer(running, { type: "ADJUST", nowMs: NOW, deltaSeconds: -30 });
    // deadlineMs clamped at NOW
    expect((next as { deadlineMs: number }).deadlineMs).toBeGreaterThanOrEqual(NOW);
  });
});

describe("restReducer – SKIP", () => {
  it("goes idle from running", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 60_000 };
    expect(restReducer(running, { type: "SKIP" })).toEqual({ status: "idle" });
  });

  it("goes idle from paused", () => {
    const paused: RestState = { status: "paused", remainingSeconds: 30 };
    expect(restReducer(paused, { type: "SKIP" })).toEqual({ status: "idle" });
  });
});

describe("restReducer – EXPIRE", () => {
  it("goes idle when deadline reached", () => {
    const running: RestState = { status: "running", deadlineMs: NOW - 1 };
    const next = restReducer(running, { type: "EXPIRE", nowMs: NOW });
    expect(next).toEqual({ status: "idle" });
  });

  it("remains running when deadline not yet reached", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 5_000 };
    const next = restReducer(running, { type: "EXPIRE", nowMs: NOW });
    expect(next).toEqual(running);
  });
});

describe("restReducer – RESTORE", () => {
  it("restores running state from deadline in the future", () => {
    const next = restReducer(
      { status: "idle" },
      { type: "RESTORE", nowMs: NOW, deadlineMs: NOW + 30_000 },
    );
    expect(next).toEqual({ status: "running", deadlineMs: NOW + 30_000 });
  });

  it("expired restored timer becomes idle immediately (no delayed haptics)", () => {
    const next = restReducer(
      { status: "idle" },
      { type: "RESTORE", nowMs: NOW, deadlineMs: NOW - 1_000 },
    );
    expect(next).toEqual({ status: "idle" });
  });

  it("restores paused state", () => {
    const next = restReducer(
      { status: "idle" },
      { type: "RESTORE", remainingSeconds: 45 },
    );
    expect(next).toEqual({ status: "paused", remainingSeconds: 45 });
  });

  it("paused restore with 0 seconds becomes idle", () => {
    const next = restReducer(
      { status: "idle" },
      { type: "RESTORE", remainingSeconds: 0 },
    );
    expect(next).toEqual({ status: "idle" });
  });
});

describe("restReducer – SET_COMPLETE", () => {
  it("completing next set clears prior timer", () => {
    const running: RestState = { status: "running", deadlineMs: NOW + 60_000 };
    expect(restReducer(running, { type: "SET_COMPLETE" })).toEqual({ status: "idle" });
  });
});

describe("computeRemainingSeconds", () => {
  it("running: computes from deadline", () => {
    const r: RestState = { status: "running", deadlineMs: NOW + 45_000 };
    expect(computeRemainingSeconds(r, NOW)).toBe(45);
  });

  it("paused: returns remainingSeconds", () => {
    const p: RestState = { status: "paused", remainingSeconds: 30 };
    expect(computeRemainingSeconds(p, NOW)).toBe(30);
  });

  it("idle: returns 0", () => {
    expect(computeRemainingSeconds({ status: "idle" }, NOW)).toBe(0);
  });
});

describe("getRestDuration", () => {
  it("normal exercise ending round → NORMAL_REST_SECONDS", () => {
    expect(getRestDuration(true, false)).toBe(NORMAL_REST_SECONDS);
  });

  it("superset ending round → SUPERSET_REST_SECONDS", () => {
    expect(getRestDuration(true, true)).toBe(SUPERSET_REST_SECONDS);
  });

  it("mid-round (not endsRound) → 0", () => {
    expect(getRestDuration(false, true)).toBe(0);
    expect(getRestDuration(false, false)).toBe(0);
  });
});
