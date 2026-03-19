"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePowerSync } from "@powersync/react";
import { trpc } from "@/lib/trpc/client";
import { SetRow } from "./set-row";

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
}

interface PreviousSet {
  weight_kg: number | null;
  reps: number | null;
  set_number: number;
}

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseData;
  previousSets?: PreviousSet[];
  onSetCompleted: () => void;
  onMutationSuccess: () => void;
}

export function ExerciseCard({
  workoutExercise,
  previousSets,
  onSetCompleted,
  onMutationSuccess,
}: ExerciseCardProps) {
  const db = usePowerSync();
  const [adding, setAdding] = useState(false);
  const [showNotes, setShowNotes] = useState(
    workoutExercise.notes != null && workoutExercise.notes !== ""
  );
  const [notes, setNotes] = useState(workoutExercise.notes || "");

  const updateExerciseNotes = trpc.workout.updateExerciseNotes.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  function handleAddSet() {
    setAdding(true);
    const id = crypto.randomUUID();
    const nextSetNumber = workoutExercise.sets.length + 1;
    db.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, ?, ?, 0)`,
      [id, workoutExercise.id, nextSetNumber, "working"]
    )
      .then(() => onMutationSuccess())
      .finally(() => setAdding(false));
  }

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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Previous performance */}
      {previousSets && previousSets.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
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
