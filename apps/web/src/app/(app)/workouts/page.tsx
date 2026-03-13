"use client";

import Link from "next/link";
import { Dumbbell, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatRelativeDate, formatDuration } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WorkoutsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.workout.list.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    );

  const workouts = data?.pages.flatMap((p) => p.data) ?? [];

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
                    {formatRelativeDate(new Date(workout.startedAt))}
                  </span>
                  <span>
                    {workout._count.workoutExercises}{" "}
                    {workout._count.workoutExercises === 1
                      ? "exercise"
                      : "exercises"}
                  </span>
                  {workout.durationSeconds != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(workout.durationSeconds)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
