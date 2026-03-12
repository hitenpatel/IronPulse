"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Dumbbell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { useDebouncedCallback } from "@/hooks/use-debounced-mutation";

interface AddExerciseSheetProps {
  workoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseAdded: () => void;
}

export function AddExerciseSheet({
  workoutId,
  open,
  onOpenChange,
  onExerciseAdded,
}: AddExerciseSheetProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setDebouncedSearch(value),
    300
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const exercises = trpc.exercise.list.useQuery(
    {
      limit: 30,
      ...(debouncedSearch && { search: debouncedSearch }),
    },
    { enabled: open }
  );

  const addExercise = trpc.workout.addExercise.useMutation({
    onSuccess: () => {
      onExerciseAdded();
      onOpenChange(false);
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    debouncedSetSearch(value);
  }

  function handleAdd(exerciseId: string) {
    addExercise.mutate({ workoutId, exerciseId });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search exercises..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Exercise list */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            {debouncedSearch ? "Results" : "All Exercises"}
          </div>

          {exercises.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : exercises.data?.data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No exercises found
            </div>
          ) : (
            <div className="space-y-1">
              {exercises.data?.data.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAdd(exercise.id)}
                  disabled={addExercise.isPending}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {exercise.primaryMuscles[0] ?? ""}
                      {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
