"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TrainingLoadChart() {
  const { data, isLoading } = trpc.analytics.trainingLoad.useQuery({ days: 30 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse rounded-md bg-muted h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Load</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No training load data yet. Complete some workouts to see your load trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxLoad = Math.max(...rows.map((r) => r.totalLoad), 1);
  const chartW = 600;
  const chartH = 180;
  const barGap = 2;
  const barWidth = (chartW - barGap * (rows.length - 1)) / rows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training Load (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 20}`}
          className="w-full h-52"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line
              key={frac}
              x1={0}
              y1={chartH * (1 - frac)}
              x2={chartW}
              y2={chartH * (1 - frac)}
              stroke="currentColor"
              className="text-muted-foreground/20"
              strokeWidth={0.5}
            />
          ))}

          {rows.map((row, i) => {
            const x = i * (barWidth + barGap);
            const heightPct = row.totalLoad / maxLoad;
            const barH = heightPct * chartH;
            const y = chartH - barH;

            // Color by dominant source
            const fill =
              row.cardioLoad > row.strengthLoad
                ? "rgb(59, 130, 246)" // blue for cardio
                : "rgb(34, 197, 94)"; // green for strength

            return (
              <g key={row.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={fill}
                  opacity={0.8}
                  rx={1}
                >
                  <title>
                    {row.date}: {row.totalLoad} (C:{row.cardioLoad} S:{row.strengthLoad})
                  </title>
                </rect>
                {/* Show every 5th date label */}
                {i % 5 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize={8}
                  >
                    {new Date(row.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
            <span className="text-xs text-muted-foreground">Strength</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
            <span className="text-xs text-muted-foreground">Cardio</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
