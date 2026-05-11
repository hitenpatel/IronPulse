const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Hermes' Intl is patchy on Android OEM builds — `toLocaleDateString(undefined, opts)` throws on devices missing the data tables.
export function formatBadgeDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
