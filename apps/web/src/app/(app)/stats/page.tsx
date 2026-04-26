"use client";

import { useState, useContext } from "react";
import { trpc } from "@/lib/trpc/client";
import { PowerSyncContext } from "@powersync/react";
import { useBodyMetrics } from "@ironpulse/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, BarChart3, Scale, Activity, Ruler } from "lucide-react";
import { FitnessChart } from "@/components/analytics/fitness-chart";
import { TrainingLoadChart } from "@/components/analytics/training-load-chart";
import { MuscleHeatmap } from "@/components/analytics/muscle-heatmap";
import { uuid } from "@/lib/uuid";
import { ProgressPhotos } from "@/components/analytics/progress-photos";
import { useDataMode } from "@/hooks/use-data-mode";
import type { BodyMetricRow } from "@ironpulse/sync";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-primary",
  back: "bg-success",
  shoulders: "bg-warning",
  biceps: "bg-[#8B5CF6]",
  triceps: "bg-[#8B5CF6]",
  legs: "bg-destructive",
  core: "bg-streak-orange",
  glutes: "bg-success",
  forearms: "bg-[#8B5CF6]",
  calves: "bg-destructive",
};

function getMuscleColor(group: string): string {
  return MUSCLE_GROUP_COLORS[group.toLowerCase()] ?? "bg-muted";
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
  const mode = useDataMode();
  const { data: psMetrics, isLoading: psLoading } = useBodyMetrics();
  const { data: trpcData, isLoading: trpcLoading } = trpc.analytics.bodyWeightTrend.useQuery(
    { days: 90 },
    { enabled: mode === "trpc" }
  );

  // Map tRPC response to match the PowerSync shape
  const metrics: BodyMetricRow[] | undefined =
    mode === "powersync"
      ? psMetrics
      : trpcData?.data?.map((d) => ({
          id: d.date.toISOString(),
          user_id: "",
          date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date),
          weight_kg: d.weightKg != null ? Number(d.weightKg) : null,
          body_fat_pct: null,
          measurements: null,
          created_at: "",
        })).reverse(); // tRPC returns ASC; match PowerSync DESC so downstream .reverse() works
  const isLoading = mode === "powersync" ? psLoading : trpcLoading;

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
    .map((m) => ({
      date: m.date,
      weightKg: Number(m.weight_kg),
      bodyFatPct: m.body_fat_pct != null ? Number(m.body_fat_pct) : null,
    }))
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

  const latestBodyFat = points[points.length - 1].bodyFatPct;
  const previousBodyFat =
    points.length >= 2 ? points[points.length - 2].bodyFatPct : null;
  const bodyFatDiff =
    latestBodyFat !== null && previousBodyFat !== null
      ? latestBodyFat - previousBodyFat
      : null;

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
          <span className="font-semibold text-xl text-foreground">{latestWeight.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">kg</span>
          {diff !== null && (
            <span
              className={`text-xs font-medium ${
                diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : "text-muted-foreground"
              }`}
            >
              {diff > 0 ? "+" : ""}
              {diff.toFixed(1)} kg
            </span>
          )}
          {latestBodyFat !== null && (
            <span className="text-xs text-muted-foreground ml-2">
              {latestBodyFat.toFixed(1)}% body fat
              {bodyFatDiff !== null && (
                <span
                  className={`ml-1 text-xs font-medium ${
                    bodyFatDiff > 0 ? "text-destructive" : bodyFatDiff < 0 ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  ({bodyFatDiff > 0 ? "+" : ""}
                  {bodyFatDiff.toFixed(1)}%)
                </span>
              )}
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
  const [bodyFat, setBodyFat] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const createBodyMetric = trpc.bodyMetric.create.useMutation();
  const trpcUtils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(weight);
    if (isNaN(weightVal) || weightVal <= 0) return;

    const bodyFatVal = bodyFat !== "" ? parseFloat(bodyFat) : null;
    if (bodyFatVal !== null && (isNaN(bodyFatVal) || bodyFatVal < 0 || bodyFatVal > 100)) return;

    setIsPending(true);
    setError(false);
    setSuccess(false);

    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (mode === "powersync" && db) {
        const id = uuid();
        await db.execute(
          `INSERT INTO body_metrics (id, date, weight_kg, body_fat_pct, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, dateStr, weightVal, bodyFatVal, now.toISOString()]
        );
      } else {
        await createBodyMetric.mutateAsync({
          date: now,
          weightKg: weightVal,
          ...(bodyFatVal != null && { bodyFatPct: bodyFatVal }),
        });
        await trpcUtils.analytics.bodyWeightTrend.invalidate();
      }

      setWeight("");
      setBodyFat("");
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
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
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
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="Body fat % (optional)"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !weight}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="text-xs text-destructive mt-2">
            Failed to save. Please try again.
          </p>
        )}
        {success && (
          <p className="text-xs text-success mt-2">
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
            <p className="font-semibold text-xl text-foreground">{thisWeekGroups}</p>
            <p className="text-xs text-muted-foreground">muscle groups hit</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last week</p>
            <p className="font-semibold text-xl text-foreground">{lastWeekGroups}</p>
            <p className="text-xs text-muted-foreground">muscle groups hit</p>
          </div>
        </div>
        {lastWeekVolume > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Volume change:{" "}
              <span
                className={`font-medium ${
                  volDiff > 0 ? "text-success" : volDiff < 0 ? "text-destructive" : ""
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

// --- Muscle Volume Section ---

function MuscleVolumeSection() {
  const { data, isLoading } = trpc.analytics.muscleVolume.useQuery({ days: 7 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Muscle Volume Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse rounded-md bg-muted h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return <MuscleHeatmap data={data?.data ?? []} />;
}

// --- Body Measurements ---

interface MeasurementValues {
  chest: string;
  waist: string;
  hips: string;
  left_bicep: string;
  right_bicep: string;
  left_thigh: string;
  right_thigh: string;
}

const MEASUREMENT_FIELDS: { key: keyof MeasurementValues; label: string }[] = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "left_bicep", label: "Left Bicep" },
  { key: "right_bicep", label: "Right Bicep" },
  { key: "left_thigh", label: "Left Thigh" },
  { key: "right_thigh", label: "Right Thigh" },
];

const EMPTY_MEASUREMENTS: MeasurementValues = {
  chest: "",
  waist: "",
  hips: "",
  left_bicep: "",
  right_bicep: "",
  left_thigh: "",
  right_thigh: "",
};

type StoredMeasurements = Partial<Record<keyof MeasurementValues, number>>;

function parseMeasurements(raw: string | null): StoredMeasurements | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredMeasurements;
  } catch {
    return null;
  }
}

function BodyMeasurementsTrend() {
  const mode = useDataMode();
  const { data: psMetrics, isLoading: psLoading } = useBodyMetrics();
  const { data: trpcListData, isLoading: trpcLoading } = trpc.bodyMetric.list.useQuery(
    { from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), to: new Date() },
    { enabled: mode === "trpc" }
  );

  const metrics: BodyMetricRow[] | undefined =
    mode === "powersync"
      ? psMetrics
      : trpcListData?.data?.map((d) => ({
          id: d.id,
          user_id: d.userId,
          date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date),
          weight_kg: d.weightKg != null ? Number(d.weightKg) : null,
          body_fat_pct: d.bodyFatPct != null ? Number(d.bodyFatPct) : null,
          measurements: d.measurements != null ? (typeof d.measurements === "string" ? d.measurements : JSON.stringify(d.measurements)) : null,
          created_at: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
        })).reverse(); // tRPC returns ASC, PowerSync hook returns DESC
  const isLoading = mode === "powersync" ? psLoading : trpcLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-5 w-5" />
            Latest Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Find entries with measurements, sorted DESC (useBodyMetrics returns DESC)
  const withMeasurements = (metrics ?? []).filter(
    (m) => m.measurements != null && m.measurements !== ""
  );

  if (withMeasurements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-5 w-5" />
            Latest Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No measurements logged yet. Use the form below to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = parseMeasurements(withMeasurements[0].measurements);
  const previous =
    withMeasurements.length >= 2
      ? parseMeasurements(withMeasurements[1].measurements)
      : null;

  const latestDate = new Date(withMeasurements[0].date).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-5 w-5" />
          Latest Measurements
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {latestDate}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {MEASUREMENT_FIELDS.map(({ key, label }) => {
            const value = latest?.[key];
            const prevValue = previous?.[key];
            const diff =
              value != null && prevValue != null ? value - prevValue : null;

            if (value == null) return null;

            return (
              <div key={key}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-semibold text-xl text-foreground">{value.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">cm</span>
                  {diff !== null && (
                    <span
                      className={`text-xs font-medium ${
                        diff > 0
                          ? "text-destructive"
                          : diff < 0
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BodyMeasurementsLogForm() {
  const [values, setValues] = useState<MeasurementValues>(EMPTY_MEASUREMENTS);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const { data: metrics } = useBodyMetrics();
  const createBodyMetric = trpc.bodyMetric.create.useMutation();
  const trpcUtils = trpc.useUtils();

  const hasAnyValue = Object.values(values).some((v) => v.trim() !== "");

  const handleChange = (key: keyof MeasurementValues, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setError(false);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyValue) return;

    // Validate: parse each non-empty field as a positive number
    const parsed: StoredMeasurements = {};
    for (const { key } of MEASUREMENT_FIELDS) {
      const raw = values[key].trim();
      if (raw === "") continue;
      const num = parseFloat(raw);
      if (isNaN(num) || num <= 0 || num > 500) return;
      parsed[key] = num;
    }

    setIsPending(true);
    setError(false);
    setSuccess(false);

    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const measurementsJson = JSON.stringify(parsed);

      if (mode === "powersync" && db) {
        // Check if there's already an entry for today
        const existing = (metrics ?? []).find((m: BodyMetricRow) => m.date === dateStr);

        if (existing) {
          // Merge with existing measurements for today
          const existingMeasurements = parseMeasurements(existing.measurements) ?? {};
          const merged = { ...existingMeasurements, ...parsed };
          await db.execute(
            `UPDATE body_metrics SET measurements = ? WHERE id = ?`,
            [JSON.stringify(merged), existing.id]
          );
        } else {
          const id = uuid();
          await db.execute(
            `INSERT INTO body_metrics (id, date, weight_kg, body_fat_pct, measurements, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, dateStr, null, null, measurementsJson, now.toISOString()]
          );
        }
      } else {
        // tRPC create uses upsert, so it handles merging automatically
        await createBodyMetric.mutateAsync({
          date: now,
          measurements: parsed as Record<string, number>,
        });
        await trpcUtils.bodyMetric.list.invalidate();
        await trpcUtils.analytics.bodyWeightTrend.invalidate();
      }

      setValues(EMPTY_MEASUREMENTS);
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
          <Ruler className="h-5 w-5" />
          Log Measurements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label} (cm)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="500"
                  placeholder="—"
                  value={values[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !hasAnyValue}
            className="w-full"
          >
            {isPending ? "Saving..." : "Save Measurements"}
          </Button>
        </form>
        {error && (
          <p className="text-xs text-destructive mt-2">
            Failed to save. Please try again.
          </p>
        )}
        {success && (
          <p className="text-xs text-success mt-2">
            Measurements saved successfully.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="font-display font-semibold text-[28px] text-foreground">Stats</h1>

      {/* Training Status */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Training Status</h2>
        <FitnessChart />
      </section>

      {/* Training Load */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Training Load</h2>
        <TrainingLoadChart />
      </section>

      {/* Muscle Volume */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Muscle Volume</h2>
        <MuscleVolumeSection />
      </section>

      {/* Workout Frequency & Weekly Volume */}
      <WorkoutFrequency />
      <WeeklyVolumeChart />

      {/* Body Weight */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Body Weight</h2>
        <div className="space-y-4">
          <BodyWeightTrend />
          <BodyWeightLogForm />
        </div>
      </section>

      {/* Body Measurements */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Body Measurements</h2>
        <div className="space-y-4">
          <BodyMeasurementsTrend />
          <BodyMeasurementsLogForm />
        </div>
      </section>

      {/* Progress Photos */}
      <section>
        <h2 className="font-display font-semibold text-base text-foreground mb-2">Progress Photos</h2>
        <ProgressPhotos />
      </section>
    </div>
  );
}
