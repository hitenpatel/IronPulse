export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPace(meters: number, seconds: number): string {
  if (meters === 0) return "--/km";
  const paceSeconds = seconds / (meters / 1000);
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/km`;
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatVolume(kg: number): string {
  return `${kg.toLocaleString("en-US")} kg`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Converts a `<input type="date">` value ("YYYY-MM-DD") to a Date at UTC
 * midnight for that calendar day.
 *
 * `@db.Date` columns (injuredAt, resolvedAt, performedAt, startsAt,
 * expiresAt) truncate to a date in UTC. Submitting `new Date(value +
 * "T00:00:00")` (no offset) parses as *local* midnight, which lands on the
 * wrong calendar day once serialized to UTC for a user east or west of UTC —
 * e.g. "2026-09-01" at UTC-5 becomes 2026-09-01T05:00:00Z, which is fine, but
 * at UTC+10 it becomes 2026-08-31T14:00:00Z, one day early. Always build the
 * Date explicitly in UTC instead.
 */
export function dateInputToUTCMidnight(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formats a `@db.Date` value (already UTC midnight) using its UTC calendar
 * date, so it renders the same day regardless of the viewer's timezone.
 */
export function formatUTCDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
