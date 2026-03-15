"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { usePowerSync } from "@powersync/react";
import { useBodyMetrics } from "@ironpulse/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, BarChart3, Scale, Activity } from "lucide-react";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-red-500",
  back: "bg-blue-500",
  shoulders: "bg-yellow-500",
  biceps: "bg-green-500",
  triceps: "bg-purple-500",
  legs: "bg-orange-500",
  core: "bg-pink-500",
  glutes: "bg-teal-500",
  forearms: "bg-indigo-500",
  calves: "bg-cyan-500",
};

function getMuscleColor(group: string): string {
  return MUSCLE_GROUP_COLORS[group.toLowerCase()] ?? "bg-gray-500";
}

function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
}

// --- Weekly Volume Chart ---

function WeeklyVolumeChart() {
  const { data, isLoading } = trpc.analytics.weeklyVolume.useQuery({ weeks: 8 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Weekly Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} className="flex-1 h-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const rows = data?.data ?? [];

  // Group by week, then by muscle group
  const weekMap = new Map<string, Map<string, number>>();
  const allMuscleGroups = new Set<string>();

  for (const row of rows) {
    if (!weekMap.has(row.week)) {
      weekMap.set(row.week, new Map());
    }
    weekMap.get(row.week)!.set(row.muscleGroup, row.totalVolume);
    allMuscleGroups.add(row.muscleGroup);
  }

  const weeks = Array.from(weekMap.keys()).sort();
  const muscleGroups = Array.from(allMuscleGroups).sort();

  // Compute max total volume across weeks for scaling
  let maxWeekVolume = 0;
  for (const mgMap of weekMap.values()) {
    let weekTotal = 0;
    for (const vol of mgMap.values()) {
      weekTotal += vol;
    }
    maxWeekVolume = Math.max(maxWeekVolume, weekTotal);
  }

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Weekly Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No workout data yet. Start logging to see your volume trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Weekly Volume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-48">
          {weeks.map((week) => {
            const mgMap = weekMap.get(week)!;
            let weekTotal = 0;
            for (const vol of mgMap.values()) {
              weekTotal += vol;
            }
            const heightPct = maxWeekVolume > 0 ? (weekTotal / maxWeekVolume) * 100 : 0;

            return (
              <div key={week} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                  style={{ height: `${heightPct}%` }}
                  title={`${weekTotal.toLocaleString()} total volume`}
                >
                  {muscleGroups.map((mg) => {
                    const vol = mgMap.get(mg) ?? 0;
                    if (vol === 0) return null;
                    const segmentPct = weekTotal > 0 ? (vol / weekTotal) * 100 : 0;
                    return (
                      <div
                        key={mg}
                        className={`w-full ${getMuscleColor(mg)}`}
                        style={{ height: `${segmentPct}%` }}
                        title={`${mg}: ${vol.toLocaleString()}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {formatWeekLabel(week)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {muscleGroups.map((mg) => (
            <div key={mg} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-sm ${getMuscleColor(mg)}`} />
              <span className="text-xs text-muted-foreground capitalize">{mg}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatWeekLabel(weekStr: string): string {
  const d = new Date(weekStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// --- Body Weight Trend (uses local PowerSync data) ---

function BodyWeightTrend() {
  const { data: metrics, isLoading } = useBodyMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Body Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter to entries with weight, sort ascending by date for chart
  const points = (metrics ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.date, weightKg: Number(m.weight_kg) }))
    .reverse(); // useBodyMetrics returns DESC, we need ASC for chart

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Body Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No body weight data yet. Log your weight below to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const weights = points.map((p) => p.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const padding = range * 0.1;

  const chartW = 300;
  const chartH = 140;

  const polylinePoints = points
    .map((p, i) => {
      const x = points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW;
      const y = chartH - ((p.weightKg - (minW - padding)) / (range + 2 * padding)) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const latestWeight = weights[weights.length - 1];
  const previousWeight = weights.length >= 2 ? weights[weights.length - 2] : null;
  const diff = previousWeight !== null ? latestWeight - previousWeight : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Body Weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold">{latestWeight.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">kg</span>
          {diff !== null && (
            <span
              className={`text-xs font-medium ${
                diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              {diff > 0 ? "+" : ""}
              {diff.toFixed(1)} kg
            </span>
          )}
        </div>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-40"
          preserveAspectRatio="none"
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
              className="text-muted-foreground/20"
              strokeWidth={0.5}
            />
          ))}

          {/* Area fill */}
          <polygon
            points={`0,${chartH} ${polylinePoints} ${chartW},${chartH}`}
            className="fill-primary/10"
          />

          {/* Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(points[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(points[points.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Body Weight Log Form (PowerSync local write) ---

function BodyWeightLogForm() {
  const [weight, setWeight] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const db = usePowerSync();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;

    setIsPending(true);
    setError(false);
    setSuccess(false);

    try {
      const id = crypto.randomUUID();
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      await db.execute(
        `INSERT INTO body_metrics (id, date, weight_kg, created_at) VALUES (?, ?, ?, ?)`,
        [id, dateStr, val, now.toISOString()]
      );

      setWeight("");
      setSuccess(true);
    } catch {
      setError(true);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5" />
          Log Weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="number"
            step="0.1"
            min="20"
            max="300"
            placeholder="Weight (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !weight}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
        {error && (
          <p className="text-xs text-destructive mt-2">
            Failed to save. Please try again.
          </p>
        )}
        {success && (
          <p className="text-xs text-green-600 mt-2">
            Weight logged successfully.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Workout Frequency ---

function WorkoutFrequency() {
  const { data, isLoading } = trpc.analytics.weeklyVolume.useQuery({ weeks: 2 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Workout Frequency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const rows = data?.data ?? [];

  // Count unique weeks that have any data
  const weekVolumes = new Map<string, number>();
  for (const row of rows) {
    weekVolumes.set(row.week, (weekVolumes.get(row.week) ?? 0) + row.totalVolume);
  }

  const weeks = Array.from(weekVolumes.keys()).sort();

  // Derive workout counts from the number of muscle groups hit per week
  // (each week with data = at least 1 workout)
  const weekMuscleGroups = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!weekMuscleGroups.has(row.week)) {
      weekMuscleGroups.set(row.week, new Set());
    }
    weekMuscleGroups.get(row.week)!.add(row.muscleGroup);
  }

  const thisWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const lastWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  const thisWeekGroups = thisWeek ? weekMuscleGroups.get(thisWeek)?.size ?? 0 : 0;
  const lastWeekGroups = lastWeek ? weekMuscleGroups.get(lastWeek)?.size ?? 0 : 0;

  const thisWeekVolume = thisWeek ? weekVolumes.get(thisWeek) ?? 0 : 0;
  const lastWeekVolume = lastWeek ? weekVolumes.get(lastWeek) ?? 0 : 0;

  const volDiff = lastWeekVolume > 0
    ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Workout Frequency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-2xl font-bold">{thisWeekGroups}</p>
            <p className="text-xs text-muted-foreground">muscle groups hit</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last week</p>
            <p className="text-2xl font-bold">{lastWeekGroups}</p>
            <p className="text-xs text-muted-foreground">muscle groups hit</p>
          </div>
        </div>
        {lastWeekVolume > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Volume change:{" "}
              <span
                className={`font-medium ${
                  volDiff > 0 ? "text-green-600" : volDiff < 0 ? "text-red-500" : ""
                }`}
              >
                {volDiff > 0 ? "+" : ""}
                {volDiff.toFixed(0)}%
              </span>{" "}
              vs last week
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Stats</h1>

      <WorkoutFrequency />
      <WeeklyVolumeChart />
      <BodyWeightTrend />
      <BodyWeightLogForm />
    </div>
  );
}
