"use client";

import { useState, useRef } from "react";
import { Check, Circle } from "lucide-react";
import { usePowerSync } from "@powersync/react";
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
  const db = usePowerSync();
  const [localWeight, setLocalWeight] = useState(
    weightKg != null ? String(weightKg) : ""
  );
  const [localReps, setLocalReps] = useState(
    reps != null ? String(reps) : ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debouncedUpdate(field: string, value: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      db.execute(
        `UPDATE exercise_sets SET ${field} = ? WHERE id = ?`,
        [value, setId]
      ).then(() => onMutationSuccess());
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

  function handleComplete() {
    if (completed) return;
    db.execute(
      `UPDATE exercise_sets SET completed = 1 WHERE id = ?`,
      [setId]
    ).then(() => {
      onMutationSuccess();
      onCompleted();
    });
  }

  function handleRpeClick() {
    // Cycle through: null -> 6 -> 7 -> 8 -> 9 -> 10 -> null
    const cycle = [null, 6, 7, 8, 9, 10];
    const currentIndex = cycle.indexOf(rpe);
    const nextIndex = (currentIndex + 1) % cycle.length;
    const nextRpe = cycle[nextIndex];
    db.execute(
      `UPDATE exercise_sets SET rpe = ? WHERE id = ?`,
      [nextRpe, setId]
    ).then(() => onMutationSuccess());
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 py-2 border-b border-border",
        completed && "opacity-60"
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
        aria-label={`RPE for set ${setNumber}: ${rpe ?? "not set"}. Click to cycle.`}
        className="w-12 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {rpe ?? "-"}
      </button>

      <button
        onClick={handleComplete}
        aria-label={completed ? `Set ${setNumber} completed` : `Mark set ${setNumber} as complete`}
        className="w-9 flex items-center justify-center"
      >
        {completed ? (
          <Check className="h-5 w-5 text-accent" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
