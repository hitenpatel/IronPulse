"use client";

import Link from "next/link";
import { Dumbbell, Clock, Star, Plus } from "lucide-react";
import { useWorkouts, type WorkoutRow } from "@ironpulse/sync";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";
import { formatRelativeDate, formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function WorkoutsPage() {
  const mode = useDataMode();

  const { data: psWorkouts, isLoading: psLoading } = useWorkouts();
  const trpcQuery = trpc.workout.list.useQuery(
    { limit: 100 },
    { enabled: mode === "trpc" },
  );

  const workouts: WorkoutRow[] =
    mode === "trpc"
      ? (trpcQuery.data?.data ?? []).map((w) => ({
          id: w.id,
          user_id: "",
          name: w.name,
          started_at: w.startedAt.toISOString?.() ?? String(w.startedAt),
          completed_at: w.completedAt
            ? w.completedAt.toISOString?.() ?? String(w.completedAt)
            : null,
          duration_seconds: w.durationSeconds,
          notes: null,
          template_id: null,
          created_at: "",
          exercise_count: w._count.workoutExercises,
        }))
      : psWorkouts ?? [];
  const isLoading = mode === "trpc" ? trpcQuery.isLoading : psLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-semibold text-[28px] text-foreground">Workouts</h1>
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 h-12 border-b border-border last:border-0">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-semibold text-[28px] text-foreground">Workouts</h1>
          <Button asChild>
            <Link href="/workouts/new">
              <Plus className="h-4 w-4" />
              New Workout
            </Link>
          </Button>
        </div>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium text-foreground">No workouts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your first workout to see it here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/workouts/new">Start Workout</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] text-foreground">Workouts</h1>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4" />
            New Workout
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workout</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exercises</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-8 text-right">PR</span>
        </div>

        {/* Rows */}
        {workouts.map((workout) => (
          <Link key={workout.id} href={`/workouts/${workout.id}`}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 h-12 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {workout.name || "Workout"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(new Date(workout.started_at))}
                </p>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">
                {workout.exercise_count ?? 0}{" "}
                {workout.exercise_count === 1 ? "ex" : "ex"}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums flex items-center gap-1">
                {workout.duration_seconds != null ? (
                  <>
                    <Clock className="h-3 w-3" />
                    {formatDuration(workout.duration_seconds)}
                  </>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </span>
              <span className="w-8 text-right">
                {(workout as { has_pr?: boolean }).has_pr && (
                  <Star className="h-3.5 w-3.5 text-pr-gold fill-pr-gold ml-auto" />
                )}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
