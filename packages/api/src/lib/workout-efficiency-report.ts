/**
 * Pure aggregation for the workout-logging-efficiency report (TASK-24).
 *
 * No Prisma, no I/O — takes plain rows (already fetched by the caller) and a
 * release cutoff, and returns before/after medians. Cohort split (new vs
 * returning athletes) is included ONLY when at least one row in that period
 * actually carries a non-null `isNewAthlete` flag — otherwise the caller gets
 * `null` for those fields rather than a fabricated split. This mirrors the
 * "only when privacy-safe cohort data is available" requirement in TASK-24
 * AC #4: we never invent a cohort signal that isn't already present on the
 * (anonymous) event rows.
 */

export interface EfficiencyEventRow {
  isFirstCompletedSet: boolean;
  interactionCount: number;
  msSinceSessionStart: number | null;
  isNewAthlete: boolean | null;
  createdAt: Date;
}

export interface CohortStats {
  sampleSize: number;
  medianMsToFirstCompletedSet: number | null;
  medianInteractionsPerCompletedSet: number | null;
}

export interface PeriodReport {
  overall: CohortStats;
  /** null when no row in this period carries a privacy-safe cohort flag. */
  newAthletes: CohortStats | null;
  returningAthletes: CohortStats | null;
}

export interface WorkoutEfficiencyReport {
  releaseAt: string;
  before: PeriodReport;
  after: PeriodReport;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function computeCohortStats(rows: EfficiencyEventRow[]): CohortStats {
  const firstSetDurations = rows
    .filter((r) => r.isFirstCompletedSet && r.msSinceSessionStart != null)
    .map((r) => r.msSinceSessionStart!);
  // Every row represents exactly one completed set, so the interaction
  // count on each row IS the "interactions for that completed set" sample.
  const interactionCounts = rows.map((r) => r.interactionCount);

  return {
    sampleSize: rows.length,
    medianMsToFirstCompletedSet: median(firstSetDurations),
    medianInteractionsPerCompletedSet: median(interactionCounts),
  };
}

function computePeriodReport(rows: EfficiencyEventRow[]): PeriodReport {
  const hasCohortData = rows.some((r) => r.isNewAthlete !== null);
  return {
    overall: computeCohortStats(rows),
    newAthletes: hasCohortData
      ? computeCohortStats(rows.filter((r) => r.isNewAthlete === true))
      : null,
    returningAthletes: hasCohortData
      ? computeCohortStats(rows.filter((r) => r.isNewAthlete === false))
      : null,
  };
}

export function computeWorkoutEfficiencyReport(
  rows: EfficiencyEventRow[],
  releaseAt: Date,
): WorkoutEfficiencyReport {
  const before = rows.filter((r) => r.createdAt < releaseAt);
  const after = rows.filter((r) => r.createdAt >= releaseAt);

  return {
    releaseAt: releaseAt.toISOString(),
    before: computePeriodReport(before),
    after: computePeriodReport(after),
  };
}
