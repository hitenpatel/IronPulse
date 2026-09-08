import type { InjuryStatus, InjuryType, RecoveryModality } from "@zor/shared";

/**
 * Plain data shapes for the Recovery presentational components. Kept
 * decoupled from `trpc`'s inferred router types so these components stay
 * trpc-free and testable by passing plain props — the imperative
 * `trpc.injury.*` calls live only in the `app/recovery/*` screens.
 */
export interface InjurySummary {
  id: string;
  injuredAt: string | Date;
  injuryType: InjuryType | string;
  severity: number;
  bodyParts: string[];
  status: InjuryStatus | string;
  resolvedAt?: string | Date | null;
  notes?: string | null;
}

export interface RecoveryActivitySummary {
  id: string;
  injuryId: string;
  performedAt: string | Date;
  modality: RecoveryModality | string;
  durationMins?: number | null;
  notes?: string | null;
}
