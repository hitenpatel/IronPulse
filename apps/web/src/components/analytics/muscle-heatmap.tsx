"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MuscleData {
  muscle: string;
  volume: number;
  percentage: number;
}

function getHeatColor(percentage: number): string {
  if (percentage === 0) return "bg-muted text-muted-foreground";
  if (percentage <= 20) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (percentage <= 50) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (percentage <= 80) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getHeatLabel(percentage: number): string {
  if (percentage === 0) return "None";
  if (percentage <= 20) return "Low";
  if (percentage <= 50) return "Moderate";
  if (percentage <= 80) return "High";
  return "Very High";
}

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

export function MuscleHeatmap({ data }: { data: MuscleData[] }) {
  const dataMap = new Map(data.map((d) => [d.muscle.toLowerCase(), d]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Muscle Volume Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No muscle volume data available for this period.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MUSCLE_GROUPS.map((muscle) => {
                const entry = dataMap.get(muscle);
                const percentage = entry?.percentage ?? 0;
                const volume = entry?.volume ?? 0;
                const colorClass = getHeatColor(percentage);

                return (
                  <div
                    key={muscle}
                    className={`rounded-lg border p-3 ${colorClass}`}
                  >
                    <p className="text-xs font-medium capitalize">{muscle}</p>
                    <p className="text-lg font-bold">
                      {volume > 0 ? volume.toLocaleString() : "—"}
                    </p>
                    <p className="text-[10px] opacity-80">
                      {percentage > 0 ? `${percentage}%` : ""} {getHeatLabel(percentage)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
              {[
                { label: "None", cls: "bg-muted" },
                { label: "Low", cls: "bg-blue-500/40" },
                { label: "Moderate", cls: "bg-green-500/40" },
                { label: "High", cls: "bg-orange-500/40" },
                { label: "Very High", cls: "bg-red-500/40" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-sm ${cls}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
