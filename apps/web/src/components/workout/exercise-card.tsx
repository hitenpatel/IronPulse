"use client";

import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";
import { SetRow } from "./set-row";

interface ExerciseSet {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

interface WorkoutExerciseData {
  id: string;
  exercise: {
    id: string;
    name: string;
    category: string;
    equipment: string | null;
  };
  sets: ExerciseSet[];
  notes: string | null;
}

interface ExerciseCardProps {
  workoutExercise: WorkoutExerciseData;
  onSetCompleted: () => void;
  onMutationSuccess: () => void;
}

export function ExerciseCard({
  workoutExercise,
  onSetCompleted,
  onMutationSuccess,
}: ExerciseCardProps) {
  const addSet = trpc.workout.addSet.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  function handleAddSet() {
    addSet.mutate({ workoutExerciseId: workoutExercise.id });
  }

  return (
    <div className="py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-primary">
          {workoutExercise.exercise.name}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Add Note</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          weightKg={set.weightKg}
          reps={set.reps}
          rpe={set.rpe}
          completed={set.completed}
          onCompleted={onSetCompleted}
          onMutationSuccess={onMutationSuccess}
        />
      ))}

      {/* Add set button */}
      <button
        onClick={handleAddSet}
        disabled={addSet.isPending}
        className="mt-2 w-full py-2 text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        + Add Set
      </button>
    </div>
  );
}
