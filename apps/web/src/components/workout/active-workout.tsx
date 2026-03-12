"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { WorkoutHeader } from "./workout-header";
import { ExerciseCard } from "./exercise-card";
import { AddExerciseSheet } from "./add-exercise-sheet";
import { RestTimer } from "./rest-timer";
import { CompletionSummary } from "./completion-summary";

const REST_DURATION = 90;

interface ActiveWorkoutProps {
  workoutId: string;
  startedAt: Date;
  initialName: string | null;
}

export function ActiveWorkout({
  workoutId,
  startedAt,
  initialName,
}: ActiveWorkoutProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restRunning, setRestRunning] = useState(false);
  const [restRemaining, setRestRemaining] = useState(REST_DURATION);
  const [completionPRs, setCompletionPRs] = useState<
    { exerciseId: string; type: string; value: number; setId: string }[] | null
  >(null);

  const utils = trpc.useUtils();

  const workout = trpc.workout.getById.useQuery({ workoutId });
  const completeWorkout = trpc.workout.complete.useMutation({
    onSuccess: (data) => {
      // Re-fetch workout to get updated durationSeconds, then show completion
      utils.workout.getById.invalidate({ workoutId });
      setCompletionPRs(data.newPRs);
    },
  });

  const invalidateWorkout = useCallback(() => {
    utils.workout.getById.invalidate({ workoutId });
  }, [utils, workoutId]);

  function handleSetCompleted() {
    setRestRemaining(REST_DURATION);
    setRestRunning(true);
  }

  function handleFinish() {
    completeWorkout.mutate({ workoutId });
  }

  // Show completion screen — use workout.getById data (has full exercise/set nesting)
  if (completionPRs !== null && workout.data) {
    const exerciseNames: Record<string, string> = {};
    for (const we of workout.data.workout.workoutExercises) {
      exerciseNames[we.exercise.id] = we.exercise.name;
    }

    const completedWorkout = {
      ...workout.data.workout,
      workoutExercises: workout.data.workout.workoutExercises.map((we) => ({
        exercise: { name: we.exercise.name },
        sets: we.sets.map((s) => ({
          weightKg: s.weightKg != null ? Number(s.weightKg) : null,
          reps: s.reps,
          completed: s.completed,
        })),
      })),
    };

    return (
      <CompletionSummary
        workout={completedWorkout}
        newPRs={completionPRs}
        exerciseNames={exerciseNames}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div className="pb-24">
      <WorkoutHeader
        workoutId={workoutId}
        workoutName={initialName}
        startedAt={startedAt}
        onFinish={handleFinish}
      />

      {/* Exercise cards */}
      {workout.data?.workout.workoutExercises.map((we) => (
        <ExerciseCard
          key={we.id}
          workoutExercise={we}
          onSetCompleted={handleSetCompleted}
          onMutationSuccess={invalidateWorkout}
        />
      ))}

      {/* Empty state */}
      {workout.data?.workout.workoutExercises.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No exercises yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap below to add your first exercise.
          </p>
        </div>
      )}

      {/* Add exercise button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="mt-4 w-full rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        + Add Exercise
      </button>

      {/* Exercise search sheet */}
      <AddExerciseSheet
        workoutId={workoutId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onExerciseAdded={invalidateWorkout}
      />

      {/* Rest timer */}
      <RestTimer
        running={restRunning}
        remainingSeconds={restRemaining}
        onTick={() => setRestRemaining((r) => Math.max(0, r - 1))}
        onSkip={() => setRestRunning(false)}
        onAdjust={(delta) =>
          setRestRemaining((r) => Math.max(0, r + delta))
        }
        onDismiss={() => setRestRunning(false)}
      />
    </div>
  );
}
