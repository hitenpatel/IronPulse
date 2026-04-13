"use client";

import { useState, useMemo, useContext } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PowerSyncContext } from "@powersync/react";
import { useDataMode } from "@/hooks/use-data-mode";
import { trpc } from "@/lib/trpc/client";
import { SetRow } from "./set-row";
import { uuid } from "@/lib/uuid";
import { calculateOverloadSuggestion } from "@ironpulse/api/src/lib/overload-suggestions";

interface ExerciseSet {
  id: string;
  setNumber: number;
  weightKg: number | { toNumber(): number } | null;
  reps: number | null;
  rpe: number | { toNumber(): number } | null;
  completed: boolean;
}

interface WorkoutExerciseData {
  id: string;
  exercise: {
    id: string;
    name: string;
    category: string | null;
    equipment: string | null;
  };
  sets: ExerciseSet[];
  notes: string | null;
  supersetGroup: number | null;
}

interface PreviousSet {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  set_number: number;
}

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseData;
  allExercises?: WorkoutExerciseData[];
  previousSets?: PreviousSet[];
  onSetCompleted: () => void;
  onMutationSuccess: () => void;
}

export function ExerciseCard({
  workoutExercise,
  allExercises = [],
  previousSets,
  onSetCompleted,
  onMutationSuccess,
}: ExerciseCardProps) {
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const [adding, setAdding] = useState(false);
  const [showNotes, setShowNotes] = useState(
    workoutExercise.notes != null && workoutExercise.notes !== ""
  );
  const [notes, setNotes] = useState(workoutExercise.notes || "");

  const updateExerciseNotes = trpc.workout.updateExerciseNotes.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  const addSetMutation = trpc.workout.addSet.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  const updateSetMutation = trpc.workout.updateSet.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  const suggestion = useMemo(() => {
    if (!previousSets || previousSets.length === 0) return null;
    return calculateOverloadSuggestion(
      previousSets.map((s) => ({
        weightKg: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
        rpe: s.rpe,
        completed: s.completed,
      }))
    );
  }, [previousSets]);

  function handleSmartFill() {
    if (!suggestion) return;
    // Find the first incomplete set
    const firstEmptySet = workoutExercise.sets.find((s) => !s.completed);
    if (!firstEmptySet) return;
    if (mode === "powersync" && db) {
      db.execute(
        `UPDATE exercise_sets SET weight_kg = ?, reps = ? WHERE id = ?`,
        [suggestion.suggestedWeightKg, suggestion.suggestedReps, firstEmptySet.id]
      ).then(() => onMutationSuccess());
    } else {
      updateSetMutation.mutate({
        setId: firstEmptySet.id,
        weight: suggestion.suggestedWeightKg,
        reps: suggestion.suggestedReps,
      });
    }
  }

  const currentIndex = allExercises.findIndex((e) => e.id === workoutExercise.id);
  const nextExercise = currentIndex >= 0 ? allExercises[currentIndex + 1] : undefined;
  const isInSuperset = workoutExercise.supersetGroup != null;
  const canLinkSuperset = !isInSuperset && nextExercise != null && !nextExercise.supersetGroup;

  function handleLinkSuperset() {
    if (!nextExercise) return;
    // Superset linking is only available in PowerSync mode (non-critical feature)
    if (mode === "trpc" || !db) return;
    // Find the lowest unused group number across all exercises
    const usedGroups = new Set(
      allExercises
        .map((e) => e.supersetGroup)
        .filter((g): g is number => g != null)
    );
    let newGroup = 1;
    while (usedGroups.has(newGroup)) newGroup++;

    db.execute(
      `UPDATE workout_exercises SET superset_group = ? WHERE id = ?`,
      [newGroup, workoutExercise.id]
    ).then(() => onMutationSuccess());
    db.execute(
      `UPDATE workout_exercises SET superset_group = ? WHERE id = ?`,
      [newGroup, nextExercise.id]
    ).then(() => onMutationSuccess());
  }

  function handleUnlinkSuperset() {
    // Superset unlinking is only available in PowerSync mode (non-critical feature)
    if (mode === "trpc" || !db) return;
    db.execute(
      `UPDATE workout_exercises SET superset_group = NULL WHERE id = ?`,
      [workoutExercise.id]
    ).then(() => onMutationSuccess());
  }

  function handleAddSet() {
    setAdding(true);
    if (mode === "powersync" && db) {
      const id = uuid();
      const nextSetNumber = workoutExercise.sets.length + 1;
      db.execute(
        `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, ?, ?, 0)`,
        [id, workoutExercise.id, nextSetNumber, "working"]
      )
        .then(() => onMutationSuccess())
        .finally(() => setAdding(false));
    } else {
      addSetMutation.mutate(
        { workoutExerciseId: workoutExercise.id },
        {
          onSettled: () => setAdding(false),
        }
      );
    }
  }

  // In tRPC mode, hide superset options since the feature is not available
  const showSupersetLink = mode === "powersync" && canLinkSuperset;
  const showSupersetUnlink = mode === "powersync" && isInSuperset;

  return (
    <div className="py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-primary">
          {workoutExercise.exercise.name}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`More options for ${workoutExercise.exercise.name}`}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setShowNotes(true)}>
              Add Note
            </DropdownMenuItem>
            {showSupersetLink && (
              <DropdownMenuItem onSelect={handleLinkSuperset}>
                Link as Superset
              </DropdownMenuItem>
            )}
            {showSupersetUnlink && (
              <DropdownMenuItem onSelect={handleUnlinkSuperset}>
                Unlink Superset
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Previous performance */}
      {previousSets && previousSets.length > 0 && (
        <p className="mb-1 text-xs text-muted-foreground">
          <span className="font-medium">Last:</span>{" "}
          {previousSets
            .map((s) => {
              if (s.weight_kg != null && s.reps != null)
                return `${s.weight_kg}kg × ${s.reps}`;
              if (s.reps != null) return `${s.reps} reps`;
              return "—";
            })
            .join(", ")}
        </p>
      )}

      {/* Progressive overload suggestion */}
      {suggestion && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-primary/70">
            <span className="font-medium">Suggested:</span>{" "}
            {suggestion.suggestedWeightKg}kg × {suggestion.suggestedReps} —{" "}
            {suggestion.reason}
          </p>
          <button
            onClick={handleSmartFill}
            className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
          >
            Smart Fill
          </button>
        </div>
      )}

      {/* Notes area */}
      {showNotes && (
        <div className="mb-3 flex flex-col gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note for this exercise..."
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() =>
              updateExerciseNotes.mutate({
                workoutExerciseId: workoutExercise.id,
                notes,
              })
            }
            disabled={updateExerciseNotes.isPending}
            className="self-end rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {updateExerciseNotes.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {/* Set table header */}
      <div className="flex items-center gap-1 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="w-8 text-center">Set</div>
        <div className="flex-1 text-center">KG</div>
        <div className="flex-1 text-center">Reps</div>
        <div className="w-12 text-center">RPE</div>
        <div className="w-9" />
      </div>

      {/* Set rows */}
      {workoutExercise.sets.map((set) => (
        <SetRow
          key={set.id}
          setId={set.id}
          setNumber={set.setNumber}
          weightKg={set.weightKg != null ? Number(set.weightKg) : null}
          reps={set.reps}
          rpe={set.rpe != null ? Number(set.rpe) : null}
          completed={set.completed}
          onCompleted={onSetCompleted}
          onMutationSuccess={onMutationSuccess}
        />
      ))}

      {/* Add set button */}
      <button
        onClick={handleAddSet}
        disabled={adding}
        className="mt-2 w-full py-2 text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        + Add Set
      </button>
    </div>
  );
}
