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
}

interface SortableExerciseCardProps {
  workoutExercise: WorkoutExerciseData;
  onSetCompleted: () => void;
  onMutationSuccess: () => void;
}

export function SortableExerciseCard({
  workoutExercise,
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
      <div className="pl-7">
        <ExerciseCard
          workoutExercise={workoutExercise}
          onSetCompleted={onSetCompleted}
          onMutationSuccess={onMutationSuccess}
        />
      </div>
    </div>
  );
}
