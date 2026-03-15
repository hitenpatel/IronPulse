"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useWorkoutExercises, useWorkoutSets } from "@/hooks/use-workout-detail";
import { useQuery } from "@powersync/react";
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

  // Read exercises and sets from PowerSync (reactive local reads)
  const { data: exercises } = useWorkoutExercises(workoutId);
  const { data: allSets } = useWorkoutSets(workoutId);

  // Read exercise details from the exercises table for category/equipment
  const exerciseIds = exercises.map((e) => e.exercise_id);
  const { data: exerciseDetails } = useQuery<{
    id: string;
    name: string;
    category: string | null;
    equipment: string | null;
  }>(
    exerciseIds.length > 0
      ? `SELECT id, name, category, equipment FROM exercises WHERE id IN (${exerciseIds.map(() => "?").join(",")})`
      : `SELECT id, name, category, equipment FROM exercises WHERE 0`,
    exerciseIds
  );

  const exerciseDetailsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string | null; equipment: string | null }>();
    for (const e of exerciseDetails) {
      map.set(e.id, e);
    }
    return map;
  }, [exerciseDetails]);

  // Group sets by workout_exercise_id
  const setsByExercise = useMemo(() => {
    const map = new Map<string, typeof allSets>();
    for (const set of allSets) {
      const existing = map.get(set.workout_exercise_id) ?? [];
      existing.push(set);
      map.set(set.workout_exercise_id, existing);
    }
    return map;
  }, [allSets]);

  // Keep tRPC for workout.complete (runs PR detection server-side)
  const completeWorkout = trpc.workout.complete.useMutation({
    onSuccess: (data) => {
      setCompletionPRs(data.newPRs);
    },
  });

  function handleSetCompleted() {
    setRestRemaining(REST_DURATION);
    setRestRunning(true);
  }

  function handleFinish() {
    completeWorkout.mutate({ workoutId });
  }

  // Show completion screen
  if (completionPRs !== null) {
    const exerciseNames: Record<string, string> = {};
    for (const we of exercises) {
      const detail = exerciseDetailsMap.get(we.exercise_id);
      if (detail) {
        exerciseNames[we.exercise_id] = detail.name;
      }
    }

    const completedWorkout = {
      id: workoutId,
      name: initialName,
      startedAt: startedAt.toISOString(),
      durationSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      workoutExercises: exercises.map((we) => {
        const weSets = setsByExercise.get(we.id) ?? [];
        return {
          exercise: { name: exerciseDetailsMap.get(we.exercise_id)?.name ?? we.exercise_name },
          sets: weSets.map((s) => ({
            weightKg: s.weight_kg != null ? Number(s.weight_kg) : null,
            reps: s.reps,
            completed: !!s.completed,
          })),
        };
      }),
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

  // Build workout exercise data in the shape ExerciseCard expects
  const workoutExerciseCards = exercises.map((we) => {
    const detail = exerciseDetailsMap.get(we.exercise_id);
    const weSets = (setsByExercise.get(we.id) ?? []).map((s) => ({
      id: s.id,
      setNumber: s.set_number,
      weightKg: s.weight_kg,
      reps: s.reps,
      rpe: s.rpe,
      completed: !!s.completed,
    }));

    return {
      id: we.id,
      exercise: {
        id: we.exercise_id,
        name: detail?.name ?? we.exercise_name,
        category: detail?.category ?? null,
        equipment: detail?.equipment ?? null,
      },
      sets: weSets,
      notes: we.notes,
    };
  });

  return (
    <div className="pb-24">
      <WorkoutHeader
        workoutId={workoutId}
        workoutName={initialName}
        startedAt={startedAt}
        onFinish={handleFinish}
      />

      {/* Exercise cards */}
      {workoutExerciseCards.map((we) => (
        <ExerciseCard
          key={we.id}
          workoutExercise={we}
          onSetCompleted={handleSetCompleted}
          onMutationSuccess={() => {
            // PowerSync reactive queries auto-update, no invalidation needed
          }}
        />
      ))}

      {/* Empty state */}
      {exercises.length === 0 && (
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
        onExerciseAdded={() => {
          // PowerSync reactive queries auto-update
        }}
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
