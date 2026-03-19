"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ExerciseCard } from "./exercise-card";

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

interface SortableExerciseCardProps {
  workoutExercise: WorkoutExerciseData;
  allExercises: WorkoutExerciseData[];
  previousSets?: PreviousSet[];
  isInSuperset: boolean;
  isSupersetStart: boolean;
  isSupersetEnd: boolean;
  onSetCompleted: () => void;
  onMutationSuccess: () => void;
}

export function SortableExerciseCard({
  workoutExercise,
  allExercises,
  previousSets,
  isInSuperset,
  isSupersetStart,
  isSupersetEnd,
  onSetCompleted,
  onMutationSuccess,
}: SortableExerciseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workoutExercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const supersetBorderClass = isInSuperset
    ? [
        "border-l-4 border-primary/60",
        isSupersetStart ? "rounded-tl" : "",
        isSupersetEnd ? "rounded-bl" : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle positioned absolutely on the left */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${workoutExercise.exercise.name}`}
        className="absolute left-0 top-4 flex h-8 w-6 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Indent the exercise card to make room for the drag handle */}
      <div className={`pl-7 ${supersetBorderClass}`}>
        <ExerciseCard
          workoutExercise={workoutExercise}
          allExercises={allExercises}
          previousSets={previousSets}
          onSetCompleted={onSetCompleted}
          onMutationSuccess={onMutationSuccess}
        />
      </div>
    </div>
  );
}
