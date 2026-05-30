"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Bike, Mountain, Footprints, Dumbbell } from "lucide-react";
import { useCardioSessions, type CardioSessionRow } from "@ironpulse/sync";
import { HYROX_CARDIO_TYPES, type CardioType } from "@ironpulse/shared";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
} from "@/lib/format";

const HYROX_TYPE_SET = new Set<string>(HYROX_CARDIO_TYPES);
const HYROX_REP_TYPES = new Set<string>(["burpee_broad_jump", "wall_ball"]);

function formatTypeLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "run":
      return { Icon: Footprints, className: "text-success" };
    case "cycle":
      return { Icon: Bike, className: "text-primary" };
    case "hike":
      return { Icon: Mountain, className: "text-warning" };
    default:
      if (HYROX_TYPE_SET.has(type)) {
        return { Icon: Dumbbell, className: "text-orange-500" };
      }
      return { Icon: Activity, className: "text-muted-foreground" };
  }
}

const TYPE_FILTERS = [
  { value: undefined, label: "All" },
  { value: "run" as CardioType, label: "Run" },
  { value: "cycle" as CardioType, label: "Cycle" },
  { value: "swim" as CardioType, label: "Swim" },
  { value: "hike" as CardioType, label: "Hike" },
  { value: "row" as CardioType, label: "Row" },
  ...HYROX_CARDIO_TYPES.map((t) => ({ value: t as CardioType, label: formatTypeLabel(t) })),
] as const;

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["DATE", "TYPE", "DISTANCE / REPS", "DURATION", "AVG PACE"].map((col) => (
              <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 rounded bg-muted" style={{ width: j === 0 ? 80 : j === 1 ? 60 : 48 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CardioHistoryPage() {
  const mode = useDataMode();
  const [activeType, setActiveType] = useState<CardioType | undefined>(undefined);

  const { data: psSessions, isLoading: psLoading } = useCardioSessions();
  const trpcQuery = trpc.cardio.list.useQuery(
    { limit: 100, ...(activeType && { type: activeType }) },
    { enabled: mode === "trpc" },
  );

  const allSessions: CardioSessionRow[] =
    mode === "trpc"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (trpcQuery.data?.data ?? []).map((s: any) => ({
          id: s.id,
          user_id: "",
          type: s.type,
          source: s.source,
          started_at: s.startedAt.toISOString?.() ?? String(s.startedAt),
          duration_seconds: s.durationSeconds,
          distance_meters: s.distanceMeters != null ? Number(s.distanceMeters) : null,
          elevation_gain_m: null,
          avg_heart_rate: null,
          max_heart_rate: null,
          calories: s.calories,
          notes: null,
          created_at: "",
        }))
      : psSessions ?? [];

  // PowerSync doesn't support server-side type filtering; filter client-side
  const sessions =
    mode === "trpc" || !activeType
      ? allSessions
      : allSessions.filter((s) => s.type === activeType);

  const isLoading = mode === "trpc" ? trpcQuery.isLoading : psLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] text-foreground">Cardio</h1>
        <Link href="/cardio/new">
          <Button>New Session</Button>
        </Link>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => setActiveType(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeType === value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && sessions.length === 0 && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">
            {activeType ? `No ${formatTypeLabel(activeType)} sessions yet` : "No cardio sessions yet"}
          </p>
          <Link href="/cardio/new">
            <Button variant="link" className="mt-2">
              Log your first session
            </Button>
          </Link>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["DATE", "TYPE", "DISTANCE / REPS", "DURATION", "AVG PACE"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const { Icon, className: iconClass } = getTypeIcon(session.type);
                const isHyroxRep = HYROX_REP_TYPES.has(session.type);
                const distanceRaw =
                  session.distance_meters != null && Number(session.distance_meters) > 0
                    ? Number(session.distance_meters)
                    : null;
                const distanceCell = isHyroxRep && distanceRaw != null
                  ? `${Math.round(distanceRaw)} reps`
                  : distanceRaw != null
                    ? formatDistance(distanceRaw)
                    : null;
                const pace =
                  !isHyroxRep && distanceRaw != null && session.duration_seconds > 0
                    ? formatPace(distanceRaw, session.duration_seconds)
                    : null;
                return (
                  <tr
                    key={session.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={`/cardio/${session.id}`} className="hover:text-foreground transition-colors">
                        {formatRelativeDate(new Date(session.started_at))}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cardio/${session.id}`} className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                        <Icon className={`h-4 w-4 ${iconClass}`} />
                        {formatTypeLabel(session.type)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {distanceCell ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {pace ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
