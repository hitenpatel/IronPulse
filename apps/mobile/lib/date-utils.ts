/**
 * Date-only helpers for the Recovery section.
 *
 * `InjuryLog.injuredAt` and `RecoveryActivity.performedAt` are `@db.Date`
 * columns, which Postgres/Prisma truncate in UTC. A date picker (or a
 * plain "YYYY-MM-DD" text field, which is what this app uses — there is
 * no native date-picker dependency installed) produces a Date representing
 * *local* midnight for the selected calendar day. Submitting that Date
 * verbatim serialises to an ISO instant that, for users east or west of
 * UTC, can fall on the previous or next UTC day — logging the wrong date.
 *
 * `toUTCDateOnly` re-anchors a local-midnight Date to UTC midnight for the
 * SAME calendar day (reading the local y/m/d components and rebuilding the
 * instant with `Date.UTC`), so the day the user picked is the day that gets
 * stored regardless of the device's timezone.
 */

/** Re-anchors a Date's local calendar day to UTC midnight for that day. */
export function toUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Formats a Date using its LOCAL calendar components as "YYYY-MM-DD". */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a strict "YYYY-MM-DD" string into a local-midnight Date. Returns
 * null for malformed input or dates that don't round-trip (e.g. Feb 30).
 */
export function parseDateOnlyInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
