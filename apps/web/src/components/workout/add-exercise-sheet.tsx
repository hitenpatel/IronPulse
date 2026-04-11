"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Dumbbell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePowerSync, useQuery } from "@powersync/react";
import { uuid } from "@/lib/uuid";
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
  const db = usePowerSync();
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

  // Read exercises from PowerSync local SQLite
  const { data: exercises, isLoading } = useQuery<{
    id: string;
    name: string;
    category: string | null;
    equipment: string | null;
    primary_muscles: string | null;
  }>(
    debouncedSearch
      ? `SELECT id, name, category, equipment, primary_muscles FROM exercises WHERE name LIKE ? ORDER BY name LIMIT 30`
      : `SELECT id, name, category, equipment, primary_muscles FROM exercises ORDER BY name LIMIT 30`,
    debouncedSearch ? [`%${debouncedSearch}%`] : []
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    debouncedSetSearch(value);
  }

  async function handleAdd(exerciseId: string) {
    setAdding(true);
    try {
      // Get current max order for this workout
      const result = await db.execute(
        `SELECT COALESCE(MAX("order"), 0) as max_order FROM workout_exercises WHERE workout_id = ?`,
        [workoutId]
      );
      const maxOrder = (result.rows?._array?.[0]?.max_order as number) ?? 0;

      const id = uuid();
      await db.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)`,
        [id, workoutId, exerciseId, maxOrder + 1]
      );

      // Add first set automatically
      const setId = uuid();
      await db.execute(
        `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, 1, 'working', 0)`,
        [setId, id]
      );

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

          {isLoading ? (
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
          ) : exercises.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No exercises found
            </div>
          ) : (
            <div className="space-y-1">
              {exercises.map((exercise) => {
                // primary_muscles is stored as JSON string or comma-separated
                let firstMuscle = "";
                try {
                  const parsed = JSON.parse(exercise.primary_muscles ?? "[]");
                  firstMuscle = Array.isArray(parsed) ? parsed[0] ?? "" : "";
                } catch {
                  firstMuscle = exercise.primary_muscles?.split(",")[0] ?? "";
                }

                return (
                  <button
                    key={exercise.id}
                    onClick={() => handleAdd(exercise.id)}
                    disabled={adding}
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
                        {firstMuscle}
                        {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
