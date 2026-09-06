const GAPS_MS: readonly number[] = [
  1 * 60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
];

export const MAX_ATTEMPTS = GAPS_MS.length + 1; // 6 total attempts; DLQ on the 6th failure.

export function nextAttemptDelayMs(failedAttempts: number): number | null {
  if (!Number.isInteger(failedAttempts) || failedAttempts < 1) {
    throw new Error(`nextAttemptDelayMs: failedAttempts must be a positive integer, got ${failedAttempts}`);
  }
  if (failedAttempts >= MAX_ATTEMPTS) return null;
  return GAPS_MS[failedAttempts - 1];
}
