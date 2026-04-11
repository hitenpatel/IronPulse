"use client";

import { useState, useEffect, useContext } from "react";
import { Search, Plus, Dumbbell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PowerSyncContext } from "@powersync/react";
import { uuid } from "@/lib/uuid";
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
  const db = useContext(PowerSyncContext);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [psExercises, setPsExercises] = useState<any[]>([]);
  const [psLoading, setPsLoading] = useState(false);

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

  // PowerSync local query — run manually instead of as a hook
  useEffect(() => {
    if (!db || !open) return;
    setPsLoading(true);
    const sql = debouncedSearch
      ? `SELECT id, name, category, equipment, primary_muscles FROM exercises WHERE name LIKE ? ORDER BY name LIMIT 30`
      : `SELECT id, name, category, equipment, primary_muscles FROM exercises ORDER BY name LIMIT 30`;
    const params = debouncedSearch ? [`%${debouncedSearch}%`] : [];
    db.getAll(sql, params)
      .then((rows: any[]) => setPsExercises(rows))
      .catch(() => setPsExercises([]))
      .finally(() => setPsLoading(false));
  }, [db, debouncedSearch, open]);

  // tRPC fallback (when PowerSync unavailable)
  const trpcQuery = trpc.exercise.list.useQuery(
    { search: debouncedSearch || undefined, limit: 30 },
    { enabled: !db && open }
  );

  const exercises = db ? psExercises : (trpcQuery.data?.data ?? []);
  const isLoading = db ? psLoading : trpcQuery.isLoading;

  const addExerciseMutation = trpc.workout.addExercise.useMutation();

  function handleSearchChange(value: string) {
    setSearch(value);
    debouncedSetSearch(value);
  }

  async function handleAdd(exerciseId: string) {
    setAdding(true);
    try {
      if (db) {
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

        const setId = uuid();
        await db.execute(
          `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, 1, 'working', 0)`,
          [setId, id]
        );
      } else {
        await addExerciseMutation.mutateAsync({
          workoutId,
          exerciseId,
        });
      }

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
