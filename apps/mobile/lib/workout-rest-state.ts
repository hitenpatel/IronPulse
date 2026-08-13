/**
 * Pure rest-state reducer — no React, no storage, no timers.
 *
 * States:
 *   idle    → no rest timer active
 *   running → deadline (monotonic ms timestamp) is set; countdown = deadline - now
 *   paused  → remainingSeconds snapshot from when paused
 *
 * Default durations (seconds):
 *   NORMAL_REST_SECONDS   = 90   (single exercise, each set)
 *   SUPERSET_REST_SECONDS = 120  (superset, at end of each round)
 */

export const NORMAL_REST_SECONDS = 90;
export const SUPERSET_REST_SECONDS = 120;

export type RestState =
  | { status: "idle" }
  | { status: "running"; deadlineMs: number }
  | { status: "paused"; remainingSeconds: number };

export interface RestAction {
  type:
    | "START"
    | "PAUSE"
    | "RESUME"
    | "SKIP"
    | "ADJUST"
    | "EXPIRE"
    | "RESTORE"
    | "SET_COMPLETE";
  nowMs?: number;
  deltaSeconds?: number;       // for ADJUST
  deadlineMs?: number;         // for RESTORE running
  remainingSeconds?: number;   // for RESTORE paused
  durationSeconds?: number;    // for START
}

export function restReducer(state: RestState, action: RestAction): RestState {
  const now = action.nowMs ?? Date.now();

  switch (action.type) {
    case "START": {
      const duration = action.durationSeconds ?? NORMAL_REST_SECONDS;
      return { status: "running", deadlineMs: now + duration * 1000 };
    }

    case "PAUSE": {
      if (state.status !== "running") return state;
      const remainingMs = Math.max(0, state.deadlineMs - now);
      return { status: "paused", remainingSeconds: Math.round(remainingMs / 1000) };
    }

    case "RESUME": {
      if (state.status !== "paused") return state;
      return {
        status: "running",
        deadlineMs: now + state.remainingSeconds * 1000,
      };
    }

    case "SKIP":
      return { status: "idle" };

    case "ADJUST": {
      const delta = (action.deltaSeconds ?? 0) * 1000;
      if (state.status === "running") {
        const newDeadline = Math.max(now, state.deadlineMs + delta);
        return { status: "running", deadlineMs: newDeadline };
      }
      if (state.status === "paused") {
        const newRemaining = Math.max(0, state.remainingSeconds + (action.deltaSeconds ?? 0));
        return { status: "paused", remainingSeconds: newRemaining };
      }
      return state;
    }

    case "EXPIRE": {
      if (state.status !== "running") return state;
      if (now >= state.deadlineMs) return { status: "idle" };
      return state; // deadline not yet reached
    }

    case "RESTORE": {
      if (action.deadlineMs != null) {
        // Restore a running timer — if already expired, go idle immediately
        if (now >= action.deadlineMs) return { status: "idle" };
        return { status: "running", deadlineMs: action.deadlineMs };
      }
      if (action.remainingSeconds != null) {
        if (action.remainingSeconds <= 0) return { status: "idle" };
        return { status: "paused", remainingSeconds: action.remainingSeconds };
      }
      return { status: "idle" };
    }

    case "SET_COMPLETE":
      // Completing the next set deliberately replaces or clears the prior timer
      return { status: "idle" };

    default:
      return state;
  }
}

/**
 * Compute remaining seconds for display from a running rest state.
 * Returns 0 if state is idle or paused (use remainingSeconds for paused).
 */
export function computeRemainingSeconds(state: RestState, nowMs: number): number {
  if (state.status === "running") {
    return Math.max(0, Math.round((state.deadlineMs - nowMs) / 1000));
  }
  if (state.status === "paused") {
    return state.remainingSeconds;
  }
  return 0;
}

/**
 * Get the appropriate rest duration based on whether this set ends a round
 * of a superset or a normal exercise.
 */
export function getRestDuration(endsRound: boolean, isSupersetRound: boolean): number {
  if (endsRound && isSupersetRound) return SUPERSET_REST_SECONDS;
  if (endsRound) return NORMAL_REST_SECONDS;
  return 0; // No rest mid-round (e.g., warmup sets or within a superset before end)
}
