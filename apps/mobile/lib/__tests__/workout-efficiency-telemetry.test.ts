import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../trpc", () => ({
  trpc: {
    telemetry: {
      recordWorkoutEfficiencyEvent: {
        mutate: vi.fn().mockResolvedValue({ ok: true }),
      },
    },
  },
}));

import { trpc } from "../trpc";
import {
  startWorkoutEfficiencySession,
  recordWorkoutInteraction,
  recordWorkoutKeystroke,
  recordWorkoutSetCompleted,
  endWorkoutEfficiencySession,
  computeIsNewAthlete,
  __resetWorkoutEfficiencySessionForTests,
} from "../workout-efficiency-telemetry";

const mockMutate = vi.mocked(trpc.telemetry.recordWorkoutEfficiencyEvent.mutate);

beforeEach(() => {
  vi.clearAllMocks();
  __resetWorkoutEfficiencySessionForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recordWorkoutSetCompleted — before any session is started", () => {
  it("is a safe no-op (no mutation call, no throw)", () => {
    expect(() => recordWorkoutSetCompleted()).not.toThrow();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

describe("recordWorkoutSetCompleted — first completed set in a session", () => {
  it("reports isFirstCompletedSet=true and a msSinceSessionStart delta", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    startWorkoutEfficiencySession(null);

    vi.setSystemTime(1_012_345);
    recordWorkoutSetCompleted();

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const payload = mockMutate.mock.calls[0]![0];
    expect(payload.isFirstCompletedSet).toBe(true);
    expect(payload.msSinceSessionStart).toBe(12_345);
  });

  it("uses a fresh opaque sessionId per session, distinct from any workout id", () => {
    startWorkoutEfficiencySession(null);
    recordWorkoutSetCompleted();
    const sessionId = mockMutate.mock.calls[0]![0].sessionId;
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);
  });
});

describe("recordWorkoutSetCompleted — interaction counting", () => {
  it("counts taps but excludes keystrokes from interactionCount", () => {
    startWorkoutEfficiencySession(null);

    recordWorkoutInteraction();
    recordWorkoutInteraction();
    recordWorkoutKeystroke();
    recordWorkoutKeystroke();
    recordWorkoutKeystroke();

    recordWorkoutSetCompleted();

    const payload = mockMutate.mock.calls[0]![0];
    expect(payload.interactionCount).toBe(2);
  });

  it("resets the interaction count after each completed set", () => {
    startWorkoutEfficiencySession(null);

    recordWorkoutInteraction();
    recordWorkoutInteraction();
    recordWorkoutInteraction();
    recordWorkoutSetCompleted(); // set 1: 3 taps

    recordWorkoutInteraction();
    recordWorkoutSetCompleted(); // set 2: 1 tap

    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate.mock.calls[0]![0].interactionCount).toBe(3);
    expect(mockMutate.mock.calls[1]![0].interactionCount).toBe(1);
  });

  it("marks only the first completed set of the session; later sets get isFirstCompletedSet=false and null timing", () => {
    startWorkoutEfficiencySession(null);
    recordWorkoutSetCompleted();
    recordWorkoutSetCompleted();

    expect(mockMutate.mock.calls[0]![0].isFirstCompletedSet).toBe(true);
    expect(mockMutate.mock.calls[0]![0].msSinceSessionStart).not.toBeNull();

    expect(mockMutate.mock.calls[1]![0].isFirstCompletedSet).toBe(false);
    expect(mockMutate.mock.calls[1]![0].msSinceSessionStart).toBeNull();
  });
});

describe("recordWorkoutSetCompleted — cohort flag", () => {
  it("attaches the session's isNewAthlete flag to every event in the session", () => {
    startWorkoutEfficiencySession(true);
    recordWorkoutSetCompleted();
    recordWorkoutSetCompleted();

    expect(mockMutate.mock.calls[0]![0].isNewAthlete).toBe(true);
    expect(mockMutate.mock.calls[1]![0].isNewAthlete).toBe(true);
  });

  it("sends null when the cohort could not be determined", () => {
    startWorkoutEfficiencySession(null);
    recordWorkoutSetCompleted();
    expect(mockMutate.mock.calls[0]![0].isNewAthlete).toBeNull();
  });
});

describe("endWorkoutEfficiencySession", () => {
  it("clears session state so a subsequent set-completion is a no-op until a new session starts", () => {
    startWorkoutEfficiencySession(null);
    endWorkoutEfficiencySession();
    recordWorkoutSetCompleted();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("a new session after ending the old one starts its own fresh sessionId and counters", () => {
    startWorkoutEfficiencySession(null);
    recordWorkoutInteraction();
    recordWorkoutSetCompleted();
    const firstSessionId = mockMutate.mock.calls[0]![0].sessionId;
    endWorkoutEfficiencySession();

    startWorkoutEfficiencySession(null);
    recordWorkoutSetCompleted();
    const secondSessionId = mockMutate.mock.calls[1]![0].sessionId;

    expect(secondSessionId).not.toBe(firstSessionId);
    // No leftover taps from the previous session.
    expect(mockMutate.mock.calls[1]![0].interactionCount).toBe(0);
  });
});

describe("recordWorkoutSetCompleted — swallows mutation failures", () => {
  it("never throws even when the network call rejects", async () => {
    mockMutate.mockRejectedValueOnce(new Error("network down"));
    startWorkoutEfficiencySession(null);
    expect(() => recordWorkoutSetCompleted()).not.toThrow();
    // Let the rejected promise's .catch() run.
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe("computeIsNewAthlete", () => {
  function makeDb(rows: Array<{ c: number }>) {
    return {
      execute: vi.fn().mockResolvedValue({ rows: { _array: rows } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it("returns true when there are zero completed workouts", async () => {
    const db = makeDb([{ c: 0 }]);
    await expect(computeIsNewAthlete(db)).resolves.toBe(true);
  });

  it("returns false when there is at least one completed workout", async () => {
    const db = makeDb([{ c: 5 }]);
    await expect(computeIsNewAthlete(db)).resolves.toBe(false);
  });

  it("returns null (not a guess) when the query throws", async () => {
    const db = {
      execute: vi.fn().mockRejectedValue(new Error("db closed")),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(computeIsNewAthlete(db)).resolves.toBeNull();
  });

  it("only ever selects a COUNT — never exercise, weight, or workout identity columns", async () => {
    const db = makeDb([{ c: 0 }]);
    await computeIsNewAthlete(db);
    const sql = db.execute.mock.calls[0][0] as string;
    expect(sql).toMatch(/COUNT\(\*\)/i);
    expect(sql).not.toMatch(/exercise|weight|reps|rpe|notes/i);
  });
});
