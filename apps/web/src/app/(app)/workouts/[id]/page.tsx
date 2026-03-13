"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell, BarChart3, Target, ClipboardList, Check } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDuration, formatVolume } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.workout.getById.useQuery({ workoutId: id });
  const [saved, setSaved] = useState(false);
  const saveTemplate = trpc.template.saveFromWorkout.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!data?.workout) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Workout not found</h2>
          <Link
            href="/workouts"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Workouts
          </Link>
        </div>
      </div>
    );
  }

  const { workout } = data;

  const totalExercises = workout.workoutExercises.length;
  const totalSets = workout.workoutExercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );
  const totalVolume = workout.workoutExercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce(
        (setSum, set) =>
          setSum + (set.completed ? (Number(set.weightKg) || 0) * (set.reps ?? 0) : 0),
        0
      ),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/workouts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Workouts
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{workout.name || "Workout"}</h1>
          <Button
            variant="outline"
            size="sm"
            disabled={saveTemplate.isPending || saved}
            onClick={() =>
              saveTemplate.mutate({
                workoutId: id,
                name: workout.name || "Workout Template",
              })
            }
          >
            {saved ? (
              <><Check className="mr-1.5 h-4 w-4" /> Saved</>
            ) : (
              <><ClipboardList className="mr-1.5 h-4 w-4" /> Save as Template</>
            )}
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatFullDate(new Date(workout.startedAt))}</span>
          {workout.durationSeconds != null && (
            <span>{formatDuration(workout.durationSeconds)}</span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Dumbbell className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">{totalExercises}</p>
          <p className="text-xs text-muted-foreground">Exercises</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">{totalSets}</p>
          <p className="text-xs text-muted-foreground">Sets</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">
            {totalVolume > 0 ? formatVolume(totalVolume) : "--"}
          </p>
          <p className="text-xs text-muted-foreground">Volume</p>
        </Card>
      </div>

      {/* Notes */}
      {workout.notes && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {workout.workoutExercises
          .sort((a, b) => a.order - b.order)
          .map((we) => (
            <Card key={we.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{we.exercise.name}</CardTitle>
                {(we.exercise.category || we.exercise.equipment) && (
                  <p className="text-xs text-muted-foreground">
                    {[we.exercise.category, we.exercise.equipment]
                      .filter(Boolean)
                      .join(" \u00b7 ")}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {/* Table header */}
                  <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span className="w-16 text-right">Info</span>
                  </div>
                  {/* Set rows */}
                  {we.sets
                    .sort((a, b) => a.setNumber - b.setNumber)
                    .map((set) => (
                      <div
                        key={set.id}
                        className={`grid grid-cols-[2rem_1fr_1fr_auto] gap-2 border-b border-border/50 py-2 text-sm last:border-0 ${
                          !set.completed ? "opacity-40" : ""
                        }`}
                      >
                        <span className="text-muted-foreground">
                          {set.setNumber}
                        </span>
                        <span>
                          {set.weightKg != null ? `${set.weightKg} kg` : "--"}
                        </span>
                        <span>{set.reps ?? "--"}</span>
                        <span className="flex w-16 items-center justify-end gap-1">
                          {set.type && set.type !== "working" && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-secondary-foreground">
                              {set.type}
                            </span>
                          )}
                          {set.rpe != null && (
                            <span className="text-xs text-muted-foreground">
                              @{Number(set.rpe)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
