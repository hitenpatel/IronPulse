"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { useQuery, usePowerSync } from "@powersync/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { WorkoutHeader } from "./workout-header";
import { SortableExerciseCard } from "./sortable-exercise-card";
import { AddExerciseSheet } from "./add-exercise-sheet";
import { RestTimer } from "./rest-timer";
import { CompletionSummary } from "./completion-summary";

const DEFAULT_REST_DURATION = 90;

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
  const db = usePowerSync();
  const { data: userData } = trpc.user.me.useQuery();
  const restDuration = userData?.user?.defaultRestSeconds ?? DEFAULT_REST_DURATION;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restRunning, setRestRunning] = useState(false);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_DURATION);
  const [completionPRs, setCompletionPRs] = useState<
    { exerciseId: string; type: string; value: number; setId: string }[] | null
  >(null);

  // Read exercises and sets from PowerSync (reactive local reads)
  const { data: exercises } = useWorkoutExercises(workoutId);
  const { data: allSets } = useWorkoutSets(workoutId);

  // dnd-kit sensors — pointer for mouse/trackpad, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

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
    setRestRemaining(restDuration);
    setRestRunning(true);
  }

  function handleFinish() {
    completeWorkout.mutate({ workoutId });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Compute the new order using arrayMove logic
    const reordered = arrayMove(exercises, oldIndex, newIndex);

    // Update all exercises' order in a batch
    await Promise.all(
      reordered.map((ex, idx) =>
        db.execute(`UPDATE workout_exercises SET "order" = ? WHERE id = ?`, [idx + 1, ex.id])
      )
    );
  }

  // Show completion screen

  // Query previous performance for all exercises in this workout
  const previousSetsQuery =
    exerciseIds.length > 0
      ? `SELECT es.weight_kg, es.reps, es.set_number, we.exercise_id
         FROM exercise_sets es
         JOIN workout_exercises we ON we.id = es.workout_exercise_id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.exercise_id IN (${exerciseIds.map(() => "?").join(",")})
           AND w.completed_at IS NOT NULL
           AND w.id != ?
         ORDER BY w.completed_at DESC, es.set_number ASC`
      : `SELECT es.weight_kg, es.reps, es.set_number, we.exercise_id FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id WHERE 0`;

  const previousSetsParams = exerciseIds.length > 0 ? [...exerciseIds, workoutId] : [];

  const { data: allPreviousSets } = useQuery<{
    weight_kg: number | null;
    reps: number | null;
    set_number: number;
    exercise_id: string;
  }>(previousSetsQuery, previousSetsParams);

  // Group previous sets by exercise_id (rows ordered by completed_at DESC, first rows per exercise = most recent workout)
  const previousSetsByExercise = useMemo(() => {
    const map = new Map<string, { weight_kg: number | null; reps: number | null; set_number: number }[]>();
    for (const row of allPreviousSets) {
      if (!map.has(row.exercise_id)) {
        map.set(row.exercise_id, []);
      }
      const existing = map.get(row.exercise_id)!;
      if (existing.length < 10) {
        existing.push({ weight_kg: row.weight_kg, reps: row.reps, set_number: row.set_number });
      }
    }
    return map;
  }, [allPreviousSets]);

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
      supersetGroup: we.superset_group ?? null,
      previousSets: previousSetsByExercise.get(we.exercise_id) ?? [],
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

      {/* Sortable exercise list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={workoutExerciseCards.map((we) => we.id)}
          strategy={verticalListSortingStrategy}
        >
          {workoutExerciseCards.map((we, index) => {
            const prev = workoutExerciseCards[index - 1];
            const next = workoutExerciseCards[index + 1];
            const isInSuperset = we.supersetGroup != null;
            const isSupersetStart =
              isInSuperset &&
              (prev == null || prev.supersetGroup !== we.supersetGroup);
            const isSupersetEnd =
              isInSuperset &&
              (next == null || next.supersetGroup !== we.supersetGroup);
            const showSupersetBadge = isInSuperset && !isSupersetStart;

            return (
              <div key={we.id}>
                {showSupersetBadge && (
                  <div className="flex items-center gap-2 px-7 py-0.5">
                    <div className="h-px flex-1 bg-primary/30" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                      Superset
                    </span>
                    <div className="h-px flex-1 bg-primary/30" />
                  </div>
                )}
                <SortableExerciseCard
                  workoutExercise={we}
                  allExercises={workoutExerciseCards}
                  previousSets={we.previousSets}
                  isInSuperset={isInSuperset}
                  isSupersetStart={isSupersetStart}
                  isSupersetEnd={isSupersetEnd}
                  onSetCompleted={handleSetCompleted}
                  onMutationSuccess={() => {
                    // PowerSync reactive queries auto-update, no invalidation needed
                  }}
                />
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

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
