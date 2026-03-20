"use client";

import Link from "next/link";
import { Activity, Bike, Mountain, Footprints } from "lucide-react";
import { useCardioSessions } from "@ironpulse/sync";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
} from "@/lib/format";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
      return { Icon: Activity, className: "text-muted-foreground" };
  }
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["DATE", "TYPE", "DISTANCE", "DURATION", "AVG PACE", "ELEVATION"].map((col) => (
              <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {Array.from({ length: 6 }).map((_, j) => (
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
  const { data: sessions, isLoading } = useCardioSessions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] text-foreground">Cardio</h1>
        <Link href="/cardio/new">
          <Button>New Session</Button>
        </Link>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && sessions.length === 0 && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">No cardio sessions yet</p>
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
                {["DATE", "TYPE", "DISTANCE", "DURATION", "AVG PACE", "ELEVATION"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const { Icon, className: iconClass } = getTypeIcon(session.type);
                const distance =
                  session.distance_meters != null && Number(session.distance_meters) > 0
                    ? Number(session.distance_meters)
                    : null;
                const pace =
                  distance != null && session.duration_seconds > 0
                    ? formatPace(distance, session.duration_seconds)
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
                        {capitalize(session.type)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {distance != null ? formatDistance(distance) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDuration(session.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {pace ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {session.elevation_gain_m != null && Number(session.elevation_gain_m) > 0
                        ? `${Math.round(Number(session.elevation_gain_m))} m`
                        : <span className="text-muted-foreground">—</span>}
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
