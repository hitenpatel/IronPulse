/**
 * Client-side instrumentation for TASK-24 — measure whether focus mode
 * improved workout-logging efficiency, without collecting exercise
 * identity or health values.
 *
 * Lifecycle (mirrors the app's "one active workout at a time" invariant):
 *   1. startWorkoutEfficiencySession() — called once, at the Start/Continue
 *      tap in NewSessionSheet.
 *   2. recordWorkoutInteraction() — called from onPress handlers on
 *      workout controls (Complete Set, Undo, Return to Next Set, completed-
 *      set review, Add Exercise). NEVER call this from a TextInput
 *      onChangeText handler — use recordWorkoutKeystroke() there instead,
 *      which is a documented no-op for the count.
 *   3. recordWorkoutSetCompleted() — called once a set-completion write has
 *      actually committed. Fires the telemetry event and resets the
 *      interaction counter for the next set.
 *   4. endWorkoutEfficiencySession() — called on Finish or Discard, so a
 *      stale session never bleeds into the next workout.
 *
 * PRIVACY: this module can only ever construct the fixed
 * WorkoutEfficiencyEvent shape (opaque sessionId, booleans, integer
 * counts/ms deltas — see workoutEfficiencyEventSchema in
 * packages/api/src/routers/telemetry.ts). There is no field here a future
 * caller could repurpose to carry a weight, rep, RPE, exercise name, or
 * note.
 *
 * Fire-and-forget, same contract as captureError in ./telemetry.ts: MUST
 * NOT throw, and a failed send is silently dropped rather than retried or
 * surfaced to the user.
 */
import type { PowerSyncDatabase } from "@powersync/react-native";
import { trpc } from "./trpc";
import { randomUUID } from "./uuid";
import { createInteractionCounter, type InteractionCounter } from "./workout-interaction-counter";

interface ActiveTelemetrySession {
  sessionId: string;
  startedAtMs: number;
  /** Coarse cohort flag for the whole session; null when undeterminable. */
  isNewAthlete: boolean | null;
  firstSetRecorded: boolean;
  counter: InteractionCounter;
}

let session: ActiveTelemetrySession | null = null;

/**
 * Begin tracking a new workout session's efficiency telemetry. Call at the
 * moment the user taps Start or Continue — before navigation, so the
 * session-start clock reading is as close to the tap as possible.
 */
export function startWorkoutEfficiencySession(isNewAthlete: boolean | null): void {
  session = {
    sessionId: randomUUID(),
    startedAtMs: Date.now(),
    isNewAthlete,
    firstSetRecorded: false,
    counter: createInteractionCounter(),
  };
}

/** Foreground tap/gesture on a workout control (not a text-entry keystroke). */
export function recordWorkoutInteraction(): void {
  session?.counter.recordTap();
}

/**
 * Text-entry keystroke — deliberately excluded from the interaction count.
 * Exists so the exclusion is visible at TextInput call sites and covered by
 * a test, not because keystrokes accumulate anywhere.
 */
export function recordWorkoutKeystroke(): void {
  session?.counter.recordKeystroke();
}

/**
 * Call once a set-completion write has committed. Sends one telemetry
 * event: the first call in a session reports msSinceSessionStart (AC #1);
 * every call reports the interaction count since the previous completed
 * set, excluding keystrokes (AC #2).
 */
export function recordWorkoutSetCompleted(): void {
  if (!session) return;

  const isFirstCompletedSet = !session.firstSetRecorded;
  const interactionCount = session.counter.count();
  const msSinceSessionStart = isFirstCompletedSet
    ? Date.now() - session.startedAtMs
    : null;
  const isNewAthlete = session.isNewAthlete;

  session.firstSetRecorded = true;
  session.counter.reset();

  trpc.telemetry.recordWorkoutEfficiencyEvent
    .mutate({
      sessionId: session.sessionId,
      isFirstCompletedSet,
      interactionCount,
      msSinceSessionStart,
      isNewAthlete,
    })
    .catch(() => {
      // Last-resort swallow — losing a telemetry event is always better
      // than surfacing an error from a background instrumentation call.
    });
}

/** Call on Finish or Discard so a stale session can't bleed into the next workout. */
export function endWorkoutEfficiencySession(): void {
  session = null;
}

/**
 * Best-effort, privacy-safe "is this the account's first-ever workout"
 * check, computed entirely from the local PowerSync cache. Returns null
 * (rather than guessing) if the count can't be read — the event schema
 * treats null as "cohort undeterminable" and the report simply won't
 * include this session in the new/returning split.
 *
 * Deliberately reads only a COUNT of completed workouts — never an
 * exercise id, weight, rep, or workout name.
 */
export async function computeIsNewAthlete(
  db: PowerSyncDatabase,
): Promise<boolean | null> {
  try {
    const result = await db.execute(
      "SELECT COUNT(*) as c FROM workouts WHERE completed_at IS NOT NULL",
    );
    const row = (result?.rows?._array ?? result?.rows as unknown as { c: number }[] | undefined)?.[0];
    const count = row ? Number(row.c) : null;
    if (count == null || Number.isNaN(count)) return null;
    return count === 0;
  } catch {
    return null;
  }
}

/** Test-only reset so suites don't leak session state between cases. */
export function __resetWorkoutEfficiencySessionForTests(): void {
  session = null;
}
