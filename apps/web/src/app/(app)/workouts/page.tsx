"use client";

import Link from "next/link";
import { Dumbbell, Clock } from "lucide-react";
import { useWorkouts } from "@ironpulse/sync";
import { formatRelativeDate, formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/card";

export default function WorkoutsPage() {
  const { data: workouts, isLoading } = useWorkouts();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium">No workouts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your first workout to see it here.
            </p>
            <Link
              href="/workouts/new"
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Start Workout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workouts</h1>

      <div className="space-y-3">
        {workouts.map((workout) => (
          <Link key={workout.id} href={`/workouts/${workout.id}`}>
            <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {workout.name || "Workout"}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {formatRelativeDate(new Date(workout.started_at))}
                  </span>
                  <span>
                    {workout.exercise_count ?? 0}{" "}
                    {workout.exercise_count === 1
                      ? "exercise"
                      : "exercises"}
                  </span>
                  {workout.duration_seconds != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(workout.duration_seconds)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
