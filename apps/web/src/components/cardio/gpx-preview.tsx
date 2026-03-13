"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

const CARDIO_TYPES = [
  { value: "run", label: "Run" },
  { value: "cycle", label: "Cycle" },
  { value: "swim", label: "Swim" },
  { value: "hike", label: "Hike" },
  { value: "walk", label: "Walk" },
  { value: "row", label: "Row" },
  { value: "elliptical", label: "Elliptical" },
  { value: "other", label: "Other" },
] as const;

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

interface GpxPreviewProps {
  gpxContent: string;
  stats: GpxStats;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfirm: (session: any) => void;
  onCancel: () => void;
}

export function GpxPreview({
  gpxContent,
  stats,
  onConfirm,
  onCancel,
}: GpxPreviewProps) {
  const [selectedType, setSelectedType] = useState("hike");

  const utils = trpc.useUtils();
  const importGpx = trpc.cardio.importGpx.useMutation({
    onSuccess: (data) => {
      utils.cardio.list.invalidate();
      onConfirm(data.session as unknown as Record<string, unknown>);
    },
  });

  const mapPoints = stats.points.map((p) => ({ lat: p.lat, lng: p.lng }));

  function handleConfirm() {
    importGpx.mutate({
      gpxContent,
      type: selectedType as "run" | "cycle" | "swim" | "hike" | "walk" | "row" | "elliptical" | "other",
    });
  }

  return (
    <div>
      {/* Route map */}
      {mapPoints.length > 0 && (
        <div className="mb-4">
          <RouteMap points={mapPoints} height="300px" />
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 flex gap-6 text-center">
        {stats.distanceMeters > 0 && (
          <div>
            <p className="text-lg font-bold">
              {formatDistance(stats.distanceMeters)}
            </p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
        )}
        <div>
          <p className="text-lg font-bold">
            {formatDuration(stats.durationSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        {stats.distanceMeters > 0 && (
          <div>
            <p className="text-lg font-bold">
              {formatPace(stats.distanceMeters, stats.durationSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">Pace</p>
          </div>
        )}
        {stats.elevationGainM > 0 && (
          <div>
            <p className="text-lg font-bold">
              {Math.round(stats.elevationGainM)} m
            </p>
            <p className="text-xs text-muted-foreground">Elevation</p>
          </div>
        )}
      </div>

      {/* Activity type selector */}
      <div className="mb-6">
        <p className="mb-2 text-sm text-muted-foreground">Activity type</p>
        <div className="flex flex-wrap gap-2">
          {CARDIO_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                selectedType === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mutation error */}
      {importGpx.error && (
        <p className="mb-4 text-sm text-destructive">
          {importGpx.error.message}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={importGpx.isPending}
          className="flex-1"
        >
          {importGpx.isPending ? "Importing..." : "Confirm Import"}
        </Button>
      </div>
    </div>
  );
}
