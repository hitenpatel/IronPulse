"use client";

import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { calculateVolume } from "@/lib/workout-utils";

interface CompletedWorkout {
  id: string;
  name: string | null;
  durationSeconds: number | null;
  workoutExercises: {
    exercise: { name: string };
    sets: {
      weightKg: number | null;
      reps: number | null;
      completed: boolean;
    }[];
  }[];
}

interface PR {
  exerciseId: string;
  type: string;
  value: number;
  setId: string;
}

interface CompletionSummaryProps {
  workout: CompletedWorkout;
  newPRs: PR[];
  exerciseNames: Record<string, string>;
  onDone: () => void;
}

export function CompletionSummary({
  workout,
  newPRs,
  exerciseNames,
  onDone,
}: CompletionSummaryProps) {
  const exerciseCount = workout.workoutExercises.length;
  const allSets = workout.workoutExercises.flatMap((we) => we.sets);
  const completedSets = allSets.filter((s) => s.completed);
  const totalVolume = calculateVolume(allSets);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Trophy */}
      <div className="text-5xl">&#127942;</div>
      <h2 className="mt-3 text-2xl font-bold">Workout Complete!</h2>

      {/* Stats */}
      <div className="mt-6 flex gap-6 text-center">
        <div>
          <p className="text-xl font-bold">
            {workout.durationSeconds ? formatDuration(workout.durationSeconds) : "-"}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        <div>
          <p className="text-xl font-bold">{exerciseCount}</p>
          <p className="text-xs text-muted-foreground">Exercises</p>
        </div>
        <div>
          <p className="text-xl font-bold">{completedSets.length}</p>
          <p className="text-xs text-muted-foreground">Sets</p>
        </div>
        <div>
          <p className="text-xl font-bold">
            {totalVolume.toLocaleString("en-US")}
            <span className="text-sm font-normal">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">Volume</p>
        </div>
      </div>

      {/* PR callouts */}
      {newPRs.length > 0 && (
        <Card className="mt-6 w-full max-w-sm border-warning/30 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <span className="text-sm font-semibold text-warning">
              New Personal Records
            </span>
          </div>
          {newPRs.map((pr) => (
            <div
              key={pr.setId}
              className="flex items-center justify-between border-b border-warning/10 py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {exerciseNames[pr.exerciseId] ?? "Exercise"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pr.type === "1rm" ? "Estimated 1RM" : "Volume PR"}
                </p>
              </div>
              <span className="text-lg font-bold text-warning">
                {Math.round(pr.value)} kg
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Exercise breakdown */}
      <div className="mt-6 w-full max-w-sm">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Exercises
        </p>
        <Card className="overflow-hidden">
          {workout.workoutExercises.map((we, i) => {
            const completedWeSets = we.sets.filter((s) => s.completed && s.weightKg && s.reps);
            const bestSet = completedWeSets.reduce(
              (best, s) => {
                const vol = (s.weightKg ?? 0) * (s.reps ?? 0);
                return vol > best.vol ? { vol, weight: s.weightKg!, reps: s.reps! } : best;
              },
              { vol: 0, weight: 0, reps: 0 }
            );

            return (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-0"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{we.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {we.sets.filter((s) => s.completed).length} set
                    {we.sets.filter((s) => s.completed).length !== 1 ? "s" : ""}
                    {bestSet.vol > 0
                      ? ` · Best: ${bestSet.weight}kg × ${bestSet.reps}`
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Done button */}
      <Button
        onClick={onDone}
        className="mt-8 w-full max-w-sm"
        size="lg"
      >
        Done
      </Button>
    </div>
  );
}
