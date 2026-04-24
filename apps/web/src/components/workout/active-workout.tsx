"use client";

import { useState, useMemo, useRef, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";
import { PowerSyncContext } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { useQuery } from "@powersync/react";
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
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const trpcUtils = trpc.useUtils();
  const { data: userData } = trpc.user.me.useQuery();
  const restDuration = userData?.user?.defaultRestSeconds ?? DEFAULT_REST_DURATION;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restRunning, setRestRunning] = useState(false);
  const [restPaused, setRestPaused] = useState(false);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_DURATION);
  const [completionPRs, setCompletionPRs] = useState<
    { exerciseId: string; type: string; value: number; setId: string }[] | null
  >(null);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateWorkout = trpc.workout.update.useMutation({
    onSuccess: () => trpcUtils.workout.getById.invalidate({ workoutId }),
  });

  const updateWorkoutRef = useRef(updateWorkout);
  updateWorkoutRef.current = updateWorkout;

  const saveNotes = useCallback(
    (value: string) => {
      if (mode === "powersync" && db) {
        db.execute(`UPDATE workouts SET notes = ? WHERE id = ?`, [value || null, workoutId]);
      } else {
        updateWorkoutRef.current.mutate({ workoutId, notes: value || undefined });
      }
    },
    [db, workoutId, mode]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => saveNotes(value), 800);
  }

  function handleNotesBlur() {
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = null;
    }
    saveNotes(notes);
  }

  // --- tRPC data source (used when mode === "trpc") ---
  const trpcWorkout = trpc.workout.getById.useQuery(
    { workoutId },
    { enabled: mode === "trpc", refetchInterval: 2000 }
  );

  // --- PowerSync data source (used when mode === "powersync") ---
  const { data: psExercises } = useWorkoutExercises(workoutId);
  const { data: psAllSets } = useWorkoutSets(workoutId);

  // Read exercise details from the exercises table for category/equipment (PowerSync)
  const psExerciseIds = psExercises.map((e) => e.exercise_id);
  const { data: psExerciseDetails } = useQuery<{
    id: string;
    name: string;
    category: string | null;
    equipment: string | null;
  }>(
    psExerciseIds.length > 0
      ? `SELECT id, name, category, equipment FROM exercises WHERE id IN (${psExerciseIds.map(() => "?").join(",")})`
      : `SELECT id, name, category, equipment FROM exercises WHERE 0`,
    psExerciseIds
  );

  // --- Derived data: normalize both sources into a common shape ---

  // PowerSync: exercise details map
  const psExerciseDetailsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string | null; equipment: string | null }>();
    for (const e of psExerciseDetails) {
      map.set(e.id, e);
    }
    return map;
  }, [psExerciseDetails]);

  // PowerSync: group sets by workout_exercise_id
  const psSetsByExercise = useMemo(() => {
    const map = new Map<string, typeof psAllSets>();
    for (const set of psAllSets) {
      const existing = map.get(set.workout_exercise_id) ?? [];
      existing.push(set);
      map.set(set.workout_exercise_id, existing);
    }
    return map;
  }, [psAllSets]);

  // Determine which exercises/sets/exerciseIds to use based on mode
  const exercises = useMemo(() => {
    if (mode === "trpc" && trpcWorkout.data) {
      return trpcWorkout.data.workout.workoutExercises;
    }
    return null; // signals to use PowerSync path
  }, [mode, trpcWorkout.data]);

  // Compute exerciseIds for previous performance query
  const exerciseIds = useMemo(() => {
    if (mode === "trpc" && exercises) {
      return exercises.map((we) => we.exercise.id);
    }
    return psExerciseIds;
  }, [mode, exercises, psExerciseIds]);

  // dnd-kit sensors -- pointer for mouse/trackpad, touch for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  // Keep tRPC for workout.complete (runs PR detection server-side)
  const completeWorkout = trpc.workout.complete.useMutation({
    onSuccess: (data) => {
      setCompletionPRs(data.newPRs);
    },
  });

  // Previous performance query (tRPC)
  const trpcPreviousPerformance = trpc.workout.getPreviousPerformance.useQuery(
    { exerciseIds, excludeWorkoutId: workoutId },
    { enabled: mode === "trpc" && exerciseIds.length > 0 }
  );

  // Previous performance query (PowerSync)
  const previousSetsQuery =
    psExerciseIds.length > 0
      ? `SELECT es.weight_kg, es.reps, es.rpe, es.completed, es.set_number, we.exercise_id
         FROM exercise_sets es
         JOIN workout_exercises we ON we.id = es.workout_exercise_id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.exercise_id IN (${psExerciseIds.map(() => "?").join(",")})
           AND w.completed_at IS NOT NULL
           AND w.id != ?
         ORDER BY w.completed_at DESC, es.set_number ASC`
      : `SELECT es.weight_kg, es.reps, es.rpe, es.completed, es.set_number, we.exercise_id FROM exercise_sets es JOIN workout_exercises we ON we.id = es.workout_exercise_id WHERE 0`;

  const previousSetsParams = psExerciseIds.length > 0 ? [...psExerciseIds, workoutId] : [];

  const { data: psAllPreviousSets } = useQuery<{
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    completed: number;
    set_number: number;
    exercise_id: string;
  }>(previousSetsQuery, previousSetsParams);

  // Group previous sets by exercise_id
  const previousSetsByExercise = useMemo(() => {
    if (mode === "trpc" && trpcPreviousPerformance.data) {
      // Group tRPC previous performance data by exerciseId
      const map = new Map<string, { weight_kg: number | null; reps: number | null; rpe: number | null; completed: boolean; set_number: number }[]>();
      for (const row of trpcPreviousPerformance.data) {
        const exerciseId = row.workoutExercise.exerciseId;
        if (!map.has(exerciseId)) {
          map.set(exerciseId, []);
        }
        const existing = map.get(exerciseId)!;
        if (existing.length < 10) {
          existing.push({
            weight_kg: row.weightKg != null ? Number(row.weightKg) : null,
            reps: row.reps,
            rpe: row.rpe != null ? Number(row.rpe) : null,
            completed: true,
            set_number: existing.length + 1,
          });
        }
      }
      return map;
    }
    // PowerSync path
    const map = new Map<string, { weight_kg: number | null; reps: number | null; rpe: number | null; completed: boolean; set_number: number }[]>();
    for (const row of psAllPreviousSets) {
      if (!map.has(row.exercise_id)) {
        map.set(row.exercise_id, []);
      }
      const existing = map.get(row.exercise_id)!;
      if (existing.length < 10) {
        existing.push({ weight_kg: row.weight_kg, reps: row.reps, rpe: row.rpe, completed: !!row.completed, set_number: row.set_number });
      }
    }
    return map;
  }, [mode, trpcPreviousPerformance.data, psAllPreviousSets]);

  function handleSetCompleted() {
    setRestRemaining(restDuration);
    setRestRunning(true);
    setRestPaused(false);
  }

  function handleFinish() {
    completeWorkout.mutate({ workoutId });
  }

  function handleMutationSuccess() {
    if (mode === "trpc") {
      trpcUtils.workout.getById.invalidate({ workoutId });
    }
    // PowerSync reactive queries auto-update
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (mode === "powersync" && db) {
      const oldIndex = psExercises.findIndex((e) => e.id === active.id);
      const newIndex = psExercises.findIndex((e) => e.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(psExercises, oldIndex, newIndex);
      await Promise.all(
        reordered.map((ex, idx) =>
          db.execute(`UPDATE workout_exercises SET "order" = ? WHERE id = ?`, [idx + 1, ex.id])
        )
      );
    }
    // In tRPC mode, drag-to-reorder is skipped (no reorder endpoint yet)
  }

  // Build workout exercise cards from the appropriate data source
  const workoutExerciseCards = useMemo(() => {
    if (mode === "trpc" && exercises) {
      return exercises.map((we) => ({
        id: we.id,
        exercise: {
          id: we.exercise.id,
          name: we.exercise.name,
          category: we.exercise.category ?? null,
          equipment: we.exercise.equipment ?? null,
        },
        sets: we.sets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          weightKg: s.weightKg != null ? Number(s.weightKg) : null,
          reps: s.reps,
          rpe: s.rpe != null ? Number(s.rpe) : null,
          completed: !!s.completed,
        })),
        notes: (we as unknown as { notes: string | null }).notes ?? null,
        supersetGroup: (we as unknown as { supersetGroup: number | null }).supersetGroup ?? null,
        previousSets: previousSetsByExercise.get(we.exercise.id) ?? [],
      }));
    }

    // PowerSync path
    return psExercises.map((we) => {
      const detail = psExerciseDetailsMap.get(we.exercise_id);
      const weSets = (psSetsByExercise.get(we.id) ?? []).map((s) => ({
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
  }, [mode, exercises, psExercises, psExerciseDetailsMap, psSetsByExercise, previousSetsByExercise]);

  // Show completion screen
  if (completionPRs !== null) {
    // Build exercise names map from whichever data source is active
    const exerciseNames: Record<string, string> = {};
    for (const we of workoutExerciseCards) {
      exerciseNames[we.exercise.id] = we.exercise.name;
    }

    const completedWorkout = {
      id: workoutId,
      name: initialName,
      startedAt: startedAt.toISOString(),
      durationSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
      workoutExercises: workoutExerciseCards.map((we) => ({
        exercise: { name: we.exercise.name },
        sets: we.sets.map((s) => ({
          weightKg: s.weightKg != null ? Number(s.weightKg) : null,
          reps: s.reps,
          completed: !!s.completed,
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
                  onMutationSuccess={handleMutationSuccess}
                />
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {workoutExerciseCards.length === 0 && (
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

      {/* Workout notes */}
      <div className="mt-4">
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          <span>{notes ? "Workout notes" : "Add workout notes"}</span>
          <span className="text-xs">{notesOpen ? "▲" : "▼"}</span>
        </button>
        {notesOpen && (
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="How did this workout feel? Any PRs, injuries, or observations..."
            rows={4}
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        )}
      </div>

      {/* Exercise search sheet */}
      <AddExerciseSheet
        workoutId={workoutId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onExerciseAdded={() => handleMutationSuccess()}
      />

      {/* Rest timer */}
      <RestTimer
        running={restRunning}
        paused={restPaused}
        remainingSeconds={restRemaining}
        onTick={() => setRestRemaining((r) => Math.max(0, r - 1))}
        onPauseToggle={() => setRestPaused((p) => !p)}
        onSkip={() => {
          setRestRunning(false);
          setRestPaused(false);
        }}
        onAdjust={(delta) =>
          setRestRemaining((r) => Math.max(0, r + delta))
        }
        onDismiss={() => {
          setRestRunning(false);
          setRestPaused(false);
        }}
      />
    </div>
  );
}
