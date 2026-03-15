"use client";

import Link from "next/link";
import { Dumbbell, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
} from "@/lib/format";

type FeedItem =
  | { kind: "workout"; id: string; startedAt: Date; name: string | null; exerciseCount: number; durationSeconds: number | null }
  | { kind: "cardio"; id: string; startedAt: Date; type: string; durationSeconds: number | null; distanceMeters: number | null };

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">No activity yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Start your first workout!
      </p>
      <Link
        href="/workouts/new"
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
      >
        Start Workout
      </Link>
    </div>
  );
}

export function ActivityFeed() {
  const workouts = useWorkouts();
  const cardio = useCardioSessions();

  const isLoading = workouts.isLoading || cardio.isLoading;

  const items: FeedItem[] = [];

  if (workouts.data) {
    for (const w of workouts.data) {
      items.push({
        kind: "workout",
        id: w.id,
        startedAt: new Date(w.started_at),
        name: w.name,
        exerciseCount: w.exercise_count ?? 0,
        durationSeconds: w.duration_seconds,
      });
    }
  }

  if (cardio.data) {
    for (const c of cardio.data) {
      items.push({
        kind: "cardio",
        id: c.id,
        startedAt: new Date(c.started_at),
        type: c.type,
        durationSeconds: c.duration_seconds,
        distanceMeters: c.distance_meters ? Number(c.distance_meters) : null,
      });
    }
  }

  items.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const feed = items.slice(0, 10);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
      {isLoading ? (
        <SkeletonRows />
      ) : feed.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {feed.map((item) => (
            <Link
              key={item.id}
              href={item.kind === "workout" ? `/workouts/${item.id}` : `/cardio/${item.id}`}
            >
            <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
              {item.kind === "workout" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.name || "Workout"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.exerciseCount} exercise{item.exerciseCount !== 1 ? "s" : ""}
                      {item.durationSeconds
                        ? ` · ${formatDuration(item.durationSeconds)}`
                        : ""}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                    <Activity className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize truncate">
                      {item.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.distanceMeters
                        ? formatDistance(item.distanceMeters)
                        : ""}
                      {item.durationSeconds
                        ? `${item.distanceMeters ? " · " : ""}${formatDuration(item.durationSeconds)}`
                        : ""}
                      {item.distanceMeters && item.durationSeconds
                        ? ` · ${formatPace(item.distanceMeters, item.durationSeconds)}`
                        : ""}
                    </p>
                  </div>
                </>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeDate(item.startedAt)}
              </span>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
