"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Dumbbell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDebouncedCallback } from "@/hooks/use-debounced-mutation";
import { trpc } from "@/lib/trpc/client";

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
  const [adding, setAdding] = useState(false);

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

  const exerciseQuery = trpc.exercise.list.useQuery(
    { search: debouncedSearch || undefined, limit: 30 },
    { enabled: open }
  );

  const addExerciseMutation = trpc.workout.addExercise.useMutation();

  const exercises = exerciseQuery.data?.data ?? [];
  const isLoading = exerciseQuery.isLoading;

  function handleSearchChange(value: string) {
    setSearch(value);
    debouncedSetSearch(value);
  }

  async function handleAdd(exerciseId: string) {
    setAdding(true);
    try {
      await addExerciseMutation.mutateAsync({ workoutId, exerciseId });
      onExerciseAdded();
      onOpenChange(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>

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

        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            {debouncedSearch ? "Results" : "All Exercises"}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {debouncedSearch ? "No exercises found" : "No exercises available"}
            </p>
          ) : (
            <div className="space-y-1">
              {exercises.map((ex: any) => (
                <button
                  key={ex.id}
                  onClick={() => handleAdd(ex.id)}
                  disabled={adding}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ex.category ?? ex.equipment ?? ""}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
