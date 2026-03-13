"use client";

import dynamic from "next/dynamic";
import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  PersonStanding,
  Ship,
  Activity,
  CircleDot,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

const TYPE_ICONS: Record<string, React.ElementType> = {
  run: Footprints,
  cycle: Bike,
  swim: Waves,
  hike: Mountain,
  walk: PersonStanding,
  row: Ship,
  elliptical: Activity,
  other: CircleDot,
};

interface CardioSessionData {
  id: string;
  type: string;
  source: string;
  durationSeconds: number;
  distanceMeters: number | { toNumber(): number } | null;
  elevationGainM: number | { toNumber(): number } | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  calories?: number | null;
  notes?: string | null;
}

interface CardioSummaryProps {
  session: CardioSessionData;
  hasRoute: boolean;
  onDone: () => void;
}

export function CardioSummary({ session, hasRoute, onDone }: CardioSummaryProps) {
  const distance = session.distanceMeters != null ? Number(session.distanceMeters) : null;
  const elevation = session.elevationGainM != null ? Number(session.elevationGainM) : null;

  const routePoints = trpc.cardio.getRoutePoints.useQuery(
    { sessionId: session.id },
    { enabled: hasRoute }
  );

  const mapPoints = routePoints.data?.points.map((p) => ({
    lat: Number(p.latitude),
    lng: Number(p.longitude),
  }));

  const Icon = TYPE_ICONS[session.type] ?? Activity;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-3 text-2xl font-bold">Cardio Logged!</h2>

      {/* Stats */}
      <div className="mt-6 flex gap-6 text-center">
        <div>
          <p className="text-xl font-bold">
            {formatDuration(session.durationSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        {distance != null && distance > 0 && (
          <div>
            <p className="text-xl font-bold">{formatDistance(distance)}</p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
        )}
        {distance != null && distance > 0 && (
          <div>
            <p className="text-xl font-bold">
              {formatPace(distance, session.durationSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">Pace</p>
          </div>
        )}
        {elevation != null && elevation > 0 && (
          <div>
            <p className="text-xl font-bold">{Math.round(elevation)} m</p>
            <p className="text-xs text-muted-foreground">Elevation</p>
          </div>
        )}
      </div>

      {/* Route map */}
      {hasRoute && mapPoints && mapPoints.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <RouteMap points={mapPoints} height="250px" />
        </div>
      )}

      {/* Details */}
      {(session.avgHeartRate || session.maxHeartRate || session.calories || session.notes) && (
        <Card className="mt-6 w-full max-w-sm p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Details
          </p>
          <div className="space-y-2 text-sm">
            {session.avgHeartRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Heart Rate</span>
                <span>{session.avgHeartRate} bpm</span>
              </div>
            )}
            {session.maxHeartRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Heart Rate</span>
                <span>{session.maxHeartRate} bpm</span>
              </div>
            )}
            {session.calories && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calories</span>
                <span>{session.calories} kcal</span>
              </div>
            )}
            {session.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{session.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Button onClick={onDone} className="mt-8 w-full max-w-sm" size="lg">
        Done
      </Button>
    </div>
  );
}
