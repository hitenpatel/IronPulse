"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  Fresh: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Optimal: "bg-green-500/20 text-green-400 border-green-500/40",
  Fatigued: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Overreaching: "bg-red-500/20 text-red-400 border-red-500/40",
};

export function FitnessChart() {
  const { data, isLoading } = trpc.analytics.fitnessStatus.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse rounded-md bg-muted h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough data to calculate training status. Keep training!
          </p>
        </CardContent>
      </Card>
    );
  }

  const { atl, ctl, tsb, status, history } = data;
  const statusColor = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";

  const chartW = 600;
  const chartH = 180;

  // Calculate Y scale from history
  const allValues = history.flatMap((h) => [h.atl, h.ctl, h.tsb]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  function toY(val: number): number {
    return chartH - ((val - yMin) / (yMax - yMin)) * chartH;
  }

  function toX(i: number): number {
    return history.length === 1
      ? chartW / 2
      : (i / (history.length - 1)) * chartW;
  }

  function buildPolyline(key: "atl" | "ctl" | "tsb"): string {
    return history
      .map((h, i) => `${toX(i)},${toY(h[key])}`)
      .join(" ");
  }

  // Zero line y position
  const zeroY = toY(0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Training Status</CardTitle>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}
          >
            {status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Fatigue (ATL)</p>
            <p className="text-lg font-bold text-red-400">{atl.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fitness (CTL)</p>
            <p className="text-lg font-bold text-blue-400">{ctl.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Form (TSB)</p>
            <p className="text-lg font-bold text-green-400">{tsb.toFixed(0)}</p>
          </div>
        </div>

        {history.length > 1 && (
          <>
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-44"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((frac) => (
                <line
                  key={frac}
                  x1={0}
                  y1={chartH * frac}
                  x2={chartW}
                  y2={chartH * frac}
                  stroke="currentColor"
                  className="text-muted-foreground/10"
                  strokeWidth={0.5}
                />
              ))}

              {/* Zero line */}
              {zeroY > 0 && zeroY < chartH && (
                <line
                  x1={0}
                  y1={zeroY}
                  x2={chartW}
                  y2={zeroY}
                  stroke="currentColor"
                  className="text-muted-foreground/30"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              )}

              {/* ATL line (red) */}
              <polyline
                points={buildPolyline("atl")}
                fill="none"
                stroke="rgb(248, 113, 113)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* CTL line (blue) */}
              <polyline
                points={buildPolyline("ctl")}
                fill="none"
                stroke="rgb(96, 165, 250)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* TSB line (green dashed) */}
              <polyline
                points={buildPolyline("tsb")}
                fill="none"
                stroke="rgb(74, 222, 128)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="6,3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Date labels */}
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {new Date(history[0].date + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(
                  history[history.length - 1].date + "T00:00:00"
                ).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-red-400 rounded" />
            <span className="text-xs text-muted-foreground">Fatigue (ATL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-blue-400 rounded" />
            <span className="text-xs text-muted-foreground">Fitness (CTL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-4 rounded"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, rgb(74,222,128) 0, rgb(74,222,128) 3px, transparent 3px, transparent 5px)",
              }}
            />
            <span className="text-xs text-muted-foreground">Form (TSB)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
