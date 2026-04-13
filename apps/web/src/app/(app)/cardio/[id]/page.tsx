"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";
import { useCardioSession, useCardioLaps, type LapRow } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import {
  formatDuration,
  formatDistance,
  formatPace,
} from "@/lib/format";
import {
  getHRZone,
  getHRZoneName,
  getHRZoneColor,
  getZoneBoundaries,
} from "@ironpulse/shared";

const RouteMap = dynamic(
  () => import("@/components/cardio/route-map"),
  { ssr: false }
);

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function sourceLabel(source: string) {
  switch (source) {
    case "gps":
      return "GPS";
    case "gpx":
      return "GPX";
    default:
      return "Manual";
  }
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function LapSplitsSection({ laps }: { laps: LapRow[] }) {
  if (laps.length === 0) return null;

  // Compute pace (sec/km) for each lap to find fastest/slowest
  const lapPaces = laps.map((lap) =>
    lap.distance_meters > 0 ? lap.duration_seconds / (lap.distance_meters / 1000) : Infinity
  );
  const validPaces = lapPaces.filter((p) => p !== Infinity);
  const fastestPace = validPaces.length > 0 ? Math.min(...validPaces) : null;
  const slowestPace = validPaces.length > 0 ? Math.max(...validPaces) : null;

  const totalDistance = laps.reduce((sum, l) => sum + l.distance_meters, 0);
  const totalDuration = laps.reduce((sum, l) => sum + l.duration_seconds, 0);
  const avgPaceOverall =
    totalDistance > 0 ? formatPace(totalDistance, totalDuration) : "--";

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold">Lap Splits</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Lap</th>
              <th className="pb-2 pr-4 font-medium">Distance</th>
              <th className="pb-2 pr-4 font-medium">Duration</th>
              <th className="pb-2 pr-4 font-medium">Avg Pace</th>
              <th className="pb-2 font-medium">Avg HR</th>
            </tr>
          </thead>
          <tbody>
            {laps.map((lap, i) => {
              const pace = lapPaces[i]!;
              const isFastest = fastestPace !== null && pace === fastestPace;
              const isSlowest = slowestPace !== null && pace === slowestPace && fastestPace !== slowestPace;
              const rowClass = isFastest
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : isSlowest
                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                : "";
              return (
                <tr key={lap.id} className={`border-b last:border-0 ${rowClass}`}>
                  <td className="py-2 pr-4 font-medium">{lap.lap_number}</td>
                  <td className="py-2 pr-4">
                    {lap.distance_meters > 0
                      ? formatDistance(lap.distance_meters)
                      : "--"}
                  </td>
                  <td className="py-2 pr-4">
                    {formatDuration(lap.duration_seconds)}
                  </td>
                  <td className="py-2 pr-4">
                    {lap.distance_meters > 0
                      ? formatPace(lap.distance_meters, lap.duration_seconds)
                      : "--"}
                  </td>
                  <td className="py-2">
                    {lap.avg_heart_rate != null
                      ? `${lap.avg_heart_rate} bpm`
                      : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{laps.length}</span>{" "}
          {laps.length === 1 ? "lap" : "laps"}
        </span>
        <span>
          Avg pace:{" "}
          <span className="font-medium text-foreground">{avgPaceOverall}</span>
        </span>
      </div>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CardioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mode = useDataMode();

  // Read session from PowerSync local SQLite
  const { data: sessionRows, isLoading: psLoading } = useCardioSession(id);
  const psSession = sessionRows?.[0] as {
    id: string;
    type: string;
    source: string;
    started_at: string;
    duration_seconds: number;
    distance_meters: number | null;
    elevation_gain_m: number | null;
    avg_heart_rate: number | null;
    max_heart_rate: number | null;
    calories: number | null;
    notes: string | null;
  } | undefined;

  // Laps from PowerSync local SQLite
  const { data: lapRows } = useCardioLaps(id);
  const psLaps = (lapRows ?? []) as LapRow[];

  // tRPC fallback
  const trpcQuery = trpc.cardio.getById.useQuery(
    { sessionId: id },
    { enabled: mode === "trpc" },
  );

  const session = mode === "trpc"
    ? trpcQuery.data?.session
      ? {
          id: trpcQuery.data.session.id,
          type: trpcQuery.data.session.type,
          source: trpcQuery.data.session.source,
          started_at:
            trpcQuery.data.session.startedAt.toISOString?.() ??
            String(trpcQuery.data.session.startedAt),
          duration_seconds: trpcQuery.data.session.durationSeconds,
          distance_meters: trpcQuery.data.session.distanceMeters != null
            ? Number(trpcQuery.data.session.distanceMeters)
            : null,
          elevation_gain_m: trpcQuery.data.session.elevationGainM != null
            ? Number(trpcQuery.data.session.elevationGainM)
            : null,
          avg_heart_rate: trpcQuery.data.session.avgHeartRate,
          max_heart_rate: trpcQuery.data.session.maxHeartRate,
          calories: trpcQuery.data.session.calories,
          notes: trpcQuery.data.session.notes ?? null,
        }
      : undefined
    : psSession;

  const laps: LapRow[] = mode === "trpc"
    ? (trpcQuery.data?.session?.laps ?? []).map((l) => ({
        id: l.id,
        session_id: id,
        lap_number: l.lapNumber,
        distance_meters: Number(l.distanceMeters),
        duration_seconds: l.durationSeconds,
        avg_heart_rate: l.avgHeartRate,
      }))
    : psLaps;

  const isLoading = mode === "trpc" ? trpcQuery.isLoading : psLoading;

  // Keep tRPC for route points (not synced via PowerSync)
  const { data: routeData } = trpc.cardio.getRoutePoints.useQuery(
    { sessionId: id },
    { enabled: !!session && session.source !== "manual" }
  );

  const points = routeData?.points;

  const fullDate = session
    ? new Date(session.started_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="space-y-6">
      <Link
        href="/cardio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      {isLoading && <DetailSkeleton />}

      {session && (
        <>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {capitalize(session.type)}
              </h1>
              <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary">
                {sourceLabel(session.source)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{fullDate}</p>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <StatItem
                label="Duration"
                value={formatDuration(session.duration_seconds)}
              />
              {session.distance_meters != null &&
                Number(session.distance_meters) > 0 && (
                  <StatItem
                    label="Distance"
                    value={formatDistance(Number(session.distance_meters))}
                  />
                )}
              {session.distance_meters != null &&
                Number(session.distance_meters) > 0 &&
                session.duration_seconds > 0 && (
                  <StatItem
                    label="Pace"
                    value={formatPace(
                      Number(session.distance_meters),
                      session.duration_seconds
                    )}
                  />
                )}
              {session.elevation_gain_m != null &&
                Number(session.elevation_gain_m) > 0 && (
                  <StatItem
                    label="Elevation Gain"
                    value={`${Math.round(Number(session.elevation_gain_m))} m`}
                  />
                )}
              {session.avg_heart_rate != null && (
                <StatItem
                  label="Avg Heart Rate"
                  value={`${session.avg_heart_rate} bpm`}
                />
              )}
              {session.max_heart_rate != null && (
                <StatItem
                  label="Max Heart Rate"
                  value={`${session.max_heart_rate} bpm`}
                />
              )}
              {session.calories != null && session.calories > 0 && (
                <StatItem
                  label="Calories"
                  value={`${session.calories} kcal`}
                />
              )}
            </div>
          </Card>

          {session.avg_heart_rate != null && session.max_heart_rate != null && (() => {
            const zone = getHRZone(Number(session.avg_heart_rate), Number(session.max_heart_rate));
            const zoneName = getHRZoneName(zone);
            const zoneColor = getHRZoneColor(zone);
            const boundaries = getZoneBoundaries(Number(session.max_heart_rate));
            return (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs text-muted-foreground">Heart Rate Zone</p>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: zoneColor }}
                  >
                    Zone {zone} — {zoneName}
                  </span>
                </div>
                <div className="flex gap-1">
                  {boundaries.map((b) => (
                    <div
                      key={b.zone}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: b.zone === zone ? 24 : 12,
                        backgroundColor: b.zone === zone ? b.color : `${b.color}33`,
                        border: b.zone === zone ? `2px solid ${b.color}` : "none",
                        alignSelf: "flex-end",
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {boundaries.map((b) => (
                    <p
                      key={b.zone}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                      style={{ fontWeight: b.zone === zone ? 700 : 400 }}
                    >
                      Z{b.zone}
                    </p>
                  ))}
                </div>
              </Card>
            );
          })()}

          {session.notes && (
            <Card className="p-6">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {session.notes}
              </p>
            </Card>
          )}

          <LapSplitsSection laps={laps} />

          {points && points.length > 0 && (
            <Card className="overflow-hidden">
              <RouteMap
                points={points.map((p) => ({
                  lat: Number(p.latitude),
                  lng: Number(p.longitude),
                }))}
                height="350px"
                interactive
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
