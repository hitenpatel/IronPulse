/**
 * Foreground interaction counter — TASK-24 workout-logging-efficiency
 * instrumentation.
 *
 * Pure, no React, no storage, no network. Counts taps/gestures on workout
 * controls (Complete Set, Undo, Return to Next Set, completed-set review,
 * Add Exercise, ...) since the counter was last reset.
 *
 * Text-entry keystrokes (TextInput onChangeText for weight/reps/RPE) are
 * NEVER counted toward `count()`. Callers route keystrokes through
 * recordKeystroke() instead of recordTap() — that call exists purely to
 * make the exclusion visible at the call site and testable here; it does
 * not feed the tap count in any way.
 */

export interface InteractionCounter {
  /** Record a foreground tap/gesture on a control. Counts toward count(). */
  recordTap(): void;
  /**
   * Record a text-entry keystroke. Deliberately excluded from count() —
   * see module doc comment. Tracked separately only so tests can prove
   * the exclusion actually holds.
   */
  recordKeystroke(): void;
  /** Number of recordTap() calls since the last reset(). */
  count(): number;
  /** Number of recordKeystroke() calls since the last reset() (for tests). */
  keystrokeCount(): number;
  /** Zero both counters, e.g. after a set completion is recorded. */
  reset(): void;
}

export function createInteractionCounter(): InteractionCounter {
  let taps = 0;
  let keystrokes = 0;

  return {
    recordTap() {
      taps += 1;
    },
    recordKeystroke() {
      keystrokes += 1; // excluded from `taps` by construction
    },
    count() {
      return taps;
    },
    keystrokeCount() {
      return keystrokes;
    },
    reset() {
      taps = 0;
      keystrokes = 0;
    },
  };
}
