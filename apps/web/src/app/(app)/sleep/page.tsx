"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Trash2, TrendingUp } from "lucide-react";

type SleepQuality = "poor" | "fair" | "good" | "excellent";

const QUALITY_OPTIONS: { value: SleepQuality; label: string; color: string }[] =
  [
    { value: "poor", label: "Poor", color: "bg-red-500" },
    { value: "fair", label: "Fair", color: "bg-yellow-500" },
    { value: "good", label: "Good", color: "bg-blue-500" },
    { value: "excellent", label: "Excellent", color: "bg-green-500" },
  ];

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDurationMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function SleepLogForm() {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(todayDateStr());
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [quality, setQuality] = useState<SleepQuality | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(false);

  const logSleep = trpc.sleep.logSleep.useMutation({
    onSuccess: async () => {
      setBedtime("");
      setWakeTime("");
      setDurationMins("");
      setQuality("");
      setNotes("");
      setError(false);
      await utils.sleep.listSleep.invalidate();
    },
    onError: () => setError(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDate = new Date(date + "T00:00:00");
    if (isNaN(parsedDate.getTime())) return;

    logSleep.mutate({
      date: parsedDate,
      ...(bedtime !== "" && {
        bedtime: new Date(`${date}T${bedtime}`),
      }),
      ...(wakeTime !== "" && {
        wakeTime: new Date(`${date}T${wakeTime}`),
      }),
      ...(durationMins !== "" && {
        durationMins: parseInt(durationMins, 10),
      }),
      ...(quality !== "" && { quality }),
      source: "manual",
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="h-5 w-5" />
          Log Sleep
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bedtime</label>
              <Input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Wake time</label>
              <Input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Duration (minutes)
            </label>
            <Input
              type="number"
              min="1"
              max="1440"
              placeholder="e.g. 480 for 8 hours"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Quality
            </label>
            <div className="flex gap-1 flex-wrap">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() =>
                    setQuality((prev) => (prev === q.value ? "" : q.value))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    quality === q.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={logSleep.isPending}
          >
            {logSleep.isPending ? "Saving..." : "Log Sleep"}
          </Button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-destructive">
            Failed to save. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyTrend() {
  const { data, isLoading } = trpc.sleep.listSleep.useQuery({ days: 7 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Weekly Sleep Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-24 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs ?? [];

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Weekly Sleep Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6">
            No sleep data yet. Log your first night above.
          </p>
        </CardContent>
      </Card>
    );
  }

  const withDuration = logs.filter((l) => l.durationMins != null);
  const avgDuration =
    withDuration.length > 0
      ? withDuration.reduce((s, l) => s + (l.durationMins ?? 0), 0) /
        withDuration.length
      : null;

  const maxDuration = Math.max(...withDuration.map((l) => l.durationMins ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Weekly Sleep Trend
          {avgDuration != null && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              avg {formatDurationMins(Math.round(avgDuration))}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-20">
          {[...logs].reverse().map((log) => {
            const height =
              log.durationMins != null && maxDuration > 0
                ? (log.durationMins / maxDuration) * 100
                : 10;

            const qualityColor =
              log.quality === "excellent"
                ? "bg-green-500"
                : log.quality === "good"
                ? "bg-blue-500"
                : log.quality === "fair"
                ? "bg-yellow-500"
                : log.quality === "poor"
                ? "bg-red-500"
                : "bg-muted-foreground";

            const dateLabel = new Date(log.date).toLocaleDateString(undefined, {
              weekday: "short",
            });

            return (
              <div
                key={log.id}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`w-full rounded-t-sm ${qualityColor} opacity-80`}
                  style={{ height: `${height}%` }}
                  title={
                    log.durationMins != null
                      ? formatDurationMins(log.durationMins)
                      : "No duration"
                  }
                />
                <span className="text-[10px] text-muted-foreground">
                  {dateLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          {QUALITY_OPTIONS.map((q) => (
            <div key={q.value} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-sm ${q.color}`} />
              <span className="text-xs text-muted-foreground">{q.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SleepHistory() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.sleep.listSleep.useQuery({ days: 7 });

  const deleteSleep = trpc.sleep.deleteSleep.useMutation({
    onSuccess: async () => {
      await utils.sleep.listSleep.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse p-4">
            <div className="h-4 w-48 rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const logs = data?.logs ?? [];

  if (logs.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        No sleep logs in the last 7 days.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const dateLabel = new Date(log.date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <Card key={log.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{dateLabel}</span>
                  {log.quality && (
                    <span className="text-xs text-muted-foreground capitalize">
                      · {log.quality}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {log.durationMins != null && (
                    <span>{formatDurationMins(log.durationMins)}</span>
                  )}
                  {log.bedtime && (
                    <span>
                      {new Date(log.bedtime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      &rarr;{" "}
                      {log.wakeTime
                        ? new Date(log.wakeTime).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "?"}
                    </span>
                  )}
                  {log.source && log.source !== "manual" && (
                    <span className="capitalize">{log.source}</span>
                  )}
                </div>
                {log.notes && (
                  <p className="mt-0.5 text-xs text-muted-foreground italic">
                    {log.notes}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteSleep.mutate({ id: log.id })}
                disabled={deleteSleep.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function SleepPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Sleep</h1>

      <WeeklyTrend />

      <SleepLogForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Logs</h2>
        <SleepHistory />
      </section>
    </div>
  );
}
