/** Pure helpers for the Dashboard — exported for unit tests. */

export interface DatedItem {
  started_at: string | Date;
}

export interface HeatmapCell {
  /** Local midnight of the day represented by the cell. */
  date: Date;
  /** 0 (no activity) → 1 (high). */
  intensity: number;
  /** Session count on that day (all types). */
  count: number;
}

/**
 * Build a N-day activity heatmap, oldest-first so the rendered row reads
 * left = oldest, right = today. Intensity scales so 1 session = 0.5 and
 * 2+ sessions = 1 (clamped).
 */
export function heatmapCells(
  items: ReadonlyArray<DatedItem>,
  days: number,
  now: Date = new Date(),
): HeatmapCell[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  // Bucket items by day index from today (0 = today, 1 = yesterday, …).
  const buckets = new Map<number, number>();
  for (const it of items) {
    const d = new Date(it.started_at);
    d.setHours(0, 0, 0, 0);
    const idx = Math.floor((today.getTime() - d.getTime()) / dayMs);
    if (idx >= 0 && idx < days) {
      buckets.set(idx, (buckets.get(idx) ?? 0) + 1);
    }
  }

  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * dayMs);
    const count = buckets.get(i) ?? 0;
    const intensity = count === 0 ? 0 : Math.min(1, count / 2);
    cells.push({ date, count, intensity });
  }
  return cells;
}

/**
 * Returns the current ISO-ish week (Mon-Sun) as [monday, sunday] with
 * the sunday set to 23:59:59.999.
 */
export function currentWeekRange(now: Date = new Date()): [Date, Date] {
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday, sunday];
}

export function greeting(now: Date = new Date()): "Morning" | "Afternoon" | "Evening" {
  const h = now.getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

/** "Sun · 19 Apr · Week 3" — matches handoff date label format. */
export function dateLabel(now: Date = new Date()): string {
  const wd = now.toLocaleDateString("en-GB", { weekday: "short" });
  const dm = now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${wd} · ${dm} · Week ${week}`;
}

/** "Hh Mm" compact (e.g. "2:48 hr", "48 min", "0:00"). */
export function compactDuration(seconds: number): { value: string; unit: string } {
  if (seconds < 60) return { value: "0:00", unit: "hr" };
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return { value: String(totalMin), unit: "min" };
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { value: `${h}:${String(m).padStart(2, "0")}`, unit: "hr" };
}

/** Tons with one decimal. 14234kg → "14.2". */
export function volumeTons(kg: number): string {
  if (kg <= 0) return "0";
  return (kg / 1000).toFixed(1);
}
