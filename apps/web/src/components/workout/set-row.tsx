"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { Check, Circle } from "lucide-react";
import { PowerSyncContext } from "@powersync/react";
import { useDataMode } from "@/hooks/use-data-mode";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface SetRowProps {
  setId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  onCompleted: () => void;
  onMutationSuccess: () => void;
}

export function SetRow({
  setId,
  setNumber,
  weightKg,
  reps,
  rpe,
  completed,
  onCompleted,
  onMutationSuccess,
}: SetRowProps) {
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const updateSet = trpc.workout.updateSet.useMutation({
    onSuccess: () => onMutationSuccess(),
  });
  const [localWeight, setLocalWeight] = useState(
    weightKg != null ? String(weightKg) : ""
  );
  const [localReps, setLocalReps] = useState(
    reps != null ? String(reps) : ""
  );
  // Optimistic local state for completed and RPE (instant UI in tRPC mode)
  const [localCompleted, setLocalCompleted] = useState(completed);
  const [localRpe, setLocalRpe] = useState(rpe);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when server data arrives (props change)
  useEffect(() => { setLocalCompleted(completed); }, [completed]);
  useEffect(() => { setLocalRpe(rpe); }, [rpe]);

  function debouncedUpdate(field: string, value: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (mode === "powersync" && db) {
        await db.execute(
          `UPDATE exercise_sets SET ${field} = ? WHERE id = ?`,
          [value, setId]
        );
        onMutationSuccess();
      } else {
        const payload: { setId: string; weight?: number; reps?: number; rpe?: number } = { setId };
        if (field === "weight_kg") payload.weight = value;
        else if (field === "reps") payload.reps = value;
        else if (field === "rpe") payload.rpe = value;
        updateSet.mutate(payload);
      }
    }, 500);
  }

  function handleWeightChange(value: string) {
    setLocalWeight(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      debouncedUpdate("weight_kg", num);
    }
  }

  function handleRepsChange(value: string) {
    setLocalReps(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      debouncedUpdate("reps", num);
    }
  }

  async function handleComplete() {
    if (localCompleted) return;
    if (mode === "powersync" && db) {
      await db.execute(
        `UPDATE exercise_sets SET completed = 1 WHERE id = ?`,
        [setId]
      );
      onMutationSuccess();
      onCompleted();
    } else {
      // Optimistic: update UI immediately, then fire mutation
      setLocalCompleted(true);
      onCompleted();
      updateSet.mutate(
        { setId, completed: true },
        {
          onError: () => {
            // Revert on failure
            setLocalCompleted(false);
          },
        }
      );
    }
  }

  async function handleRpeClick() {
    // Cycle through: null -> 6 -> 7 -> 8 -> 9 -> 10 -> null
    const cycle = [null, 6, 7, 8, 9, 10];
    const currentIndex = cycle.indexOf(localRpe);
    const nextIndex = (currentIndex + 1) % cycle.length;
    const nextRpe = cycle[nextIndex];
    if (mode === "powersync" && db) {
      await db.execute(
        `UPDATE exercise_sets SET rpe = ? WHERE id = ?`,
        [nextRpe, setId]
      );
      onMutationSuccess();
    } else {
      // Optimistic: update UI immediately
      const previousRpe = localRpe;
      setLocalRpe(nextRpe);
      updateSet.mutate(
        { setId, rpe: nextRpe ?? undefined },
        {
          onError: () => {
            setLocalRpe(previousRpe);
          },
        }
      );
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 py-2 border-b border-border",
        localCompleted && "opacity-60"
      )}
    >
      <div className="w-8 text-center text-sm text-muted-foreground">
        {setNumber}
      </div>

      <div className="flex-1">
        <input
          type="text"
          inputMode="decimal"
          value={localWeight}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="-"
          className="w-full rounded-md bg-muted px-3 py-1.5 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex-1">
        <input
          type="text"
          inputMode="numeric"
          value={localReps}
          onChange={(e) => handleRepsChange(e.target.value)}
          placeholder="-"
          className="w-full rounded-md bg-muted px-3 py-1.5 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        onClick={handleRpeClick}
        aria-label={`RPE for set ${setNumber}: ${localRpe ?? "not set"}. Click to cycle.`}
        className="w-12 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {localRpe ?? "-"}
      </button>

      <button
        onClick={handleComplete}
        aria-label={localCompleted ? `Set ${setNumber} completed` : `Mark set ${setNumber} as complete`}
        className="w-9 flex items-center justify-center"
      >
        {localCompleted ? (
          <Check className="h-5 w-5 text-accent" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
