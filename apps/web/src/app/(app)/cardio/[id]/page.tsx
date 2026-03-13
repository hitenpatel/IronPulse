"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
} from "@/lib/format";

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

  const { data, isLoading } = trpc.cardio.getById.useQuery({ sessionId: id });
  const session = data?.session;

  const { data: routeData } = trpc.cardio.getRoutePoints.useQuery(
    { sessionId: id },
    { enabled: !!session && session.source !== "manual" }
  );

  const points = routeData?.points;

  const fullDate = session
    ? new Date(session.startedAt).toLocaleDateString("en-US", {
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
                value={formatDuration(session.durationSeconds)}
              />
              {session.distanceMeters != null &&
                Number(session.distanceMeters) > 0 && (
                  <StatItem
                    label="Distance"
                    value={formatDistance(Number(session.distanceMeters))}
                  />
                )}
              {session.distanceMeters != null &&
                Number(session.distanceMeters) > 0 &&
                session.durationSeconds > 0 && (
                  <StatItem
                    label="Pace"
                    value={formatPace(
                      Number(session.distanceMeters),
                      session.durationSeconds
                    )}
                  />
                )}
              {session.elevationGainM != null &&
                Number(session.elevationGainM) > 0 && (
                  <StatItem
                    label="Elevation Gain"
                    value={`${Math.round(Number(session.elevationGainM))} m`}
                  />
                )}
              {session.avgHeartRate != null && (
                <StatItem
                  label="Avg Heart Rate"
                  value={`${session.avgHeartRate} bpm`}
                />
              )}
              {session.maxHeartRate != null && (
                <StatItem
                  label="Max Heart Rate"
                  value={`${session.maxHeartRate} bpm`}
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

          {session.notes && (
            <Card className="p-6">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {session.notes}
              </p>
            </Card>
          )}

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
