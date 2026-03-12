# Workout Logging UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the workout logging UI — create workout, add exercises, log sets with inline rows, auto-start rest timer, and completion summary with PR detection.

**Architecture:** tRPC-driven (server state). Every user action fires a tRPC mutation. `workout.getById` is the single source of truth, auto-refetched via React Query invalidation. No local state beyond form inputs and the rest timer.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, shadcn/ui (new-york), lucide-react, tRPC React Query hooks.

**Spec:** `docs/superpowers/specs/2026-03-12-workout-logging-ui-design.md`

---

## File Structure

```
apps/web/src/
├── app/(app)/workouts/
│   └── new/
│       └── page.tsx                    # CREATE — creates workout, renders ActiveWorkout
├── components/workout/
│   ├── active-workout.tsx              # CREATE — main workout screen orchestrator
│   ├── workout-header.tsx              # CREATE — elapsed timer, name, cancel/finish
│   ├── exercise-card.tsx               # CREATE — exercise with inline set table
│   ├── set-row.tsx                     # CREATE — inline set input row (kg/reps/RPE/check)
│   ├── add-exercise-sheet.tsx          # CREATE — bottom sheet exercise search
│   ├── rest-timer.tsx                  # CREATE — floating countdown bar
│   └── completion-summary.tsx          # CREATE — post-workout stats + PR callouts
├── hooks/
│   └── use-debounced-mutation.ts       # CREATE — debounced tRPC mutation hook
└── lib/
    └── workout-utils.ts                # CREATE — workout name generation, volume calc
```

---

## Chunk 1: Utilities and Foundation

### Task 1: Workout Utility Functions

**Files:**
- Create: `apps/web/src/lib/workout-utils.ts`
- Create: `apps/web/src/lib/__tests__/workout-utils.test.ts`

- [ ] **Step 1: Write tests for workout utility functions**

Create `apps/web/src/lib/__tests__/workout-utils.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { getWorkoutName, calculateVolume, formatElapsed } from "../workout-utils";

describe("getWorkoutName", () => {
  it("returns 'Morning Workout' before noon", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 9, 0));
    expect(getWorkoutName()).toBe("Morning Workout");
    vi.useRealTimers();
  });

  it("returns 'Afternoon Workout' between noon and 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 14, 0));
    expect(getWorkoutName()).toBe("Afternoon Workout");
    vi.useRealTimers();
  });

  it("returns 'Evening Workout' after 5pm", () => {
    vi.setSystemTime(new Date(2026, 2, 12, 19, 0));
    expect(getWorkoutName()).toBe("Evening Workout");
    vi.useRealTimers();
  });
});

describe("calculateVolume", () => {
  it("sums weight * reps for completed sets", () => {
    const sets = [
      { weightKg: 80, reps: 8, completed: true },
      { weightKg: 85, reps: 6, completed: true },
      { weightKg: 85, reps: 5, completed: false },
    ];
    // 80*8 + 85*6 = 640 + 510 = 1150
    expect(calculateVolume(sets)).toBe(1150);
  });

  it("returns 0 for empty sets", () => {
    expect(calculateVolume([])).toBe(0);
  });

  it("skips sets with null weight or reps", () => {
    const sets = [
      { weightKg: 80, reps: 8, completed: true },
      { weightKg: null, reps: 8, completed: true },
      { weightKg: 80, reps: null, completed: true },
    ];
    expect(calculateVolume(sets)).toBe(640);
  });
});

describe("formatElapsed", () => {
  it("formats seconds to MM:SS", () => {
    expect(formatElapsed(125)).toBe("2:05");
  });

  it("formats to H:MM:SS when over an hour", () => {
    expect(formatElapsed(3725)).toBe("1:02:05");
  });

  it("formats zero", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/lib/__tests__/workout-utils.test.ts`
Expected: FAIL — module `../workout-utils` not found.

- [ ] **Step 3: Implement workout utility functions**

Create `apps/web/src/lib/workout-utils.ts`:

```typescript
export function getWorkoutName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning Workout";
  if (hour < 17) return "Afternoon Workout";
  return "Evening Workout";
}

export function calculateVolume(
  sets: { weightKg: number | null; reps: number | null; completed: boolean }[]
): number {
  return sets.reduce((sum, set) => {
    if (!set.completed || set.weightKg == null || set.reps == null) return sum;
    return sum + set.weightKg * set.reps;
  }, 0);
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/lib/__tests__/workout-utils.test.ts`
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/workout-utils.ts apps/web/src/lib/__tests__/workout-utils.test.ts
git commit -m "add workout utility functions with tests"
```

---

### Task 2: Debounced Mutation Hook

**Files:**
- Create: `apps/web/src/hooks/use-debounced-mutation.ts`

- [ ] **Step 1: Create debounced mutation hook**

Create `apps/web/src/hooks/use-debounced-mutation.ts`:

```typescript
"use client";

import { useRef, useCallback } from "react";

export function useDebouncedCallback<T>(
  callback: (value: T) => void,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(value);
      }, delay);
    },
    [callback, delay]
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-debounced-mutation.ts
git commit -m "add debounced callback hook for set input mutations"
```

---

### Task 3: Install Additional shadcn/ui Components

The workout UI needs `dialog` (for cancel confirmation) and `dropdown-menu` (for exercise overflow menu). These are not currently installed. Note: `sheet` is already installed from the dashboard UI work (used by `AddExerciseSheet`).

- [ ] **Step 1: Install dialog and dropdown-menu components**

Run from `apps/web/`:
```bash
npx shadcn@latest add dialog dropdown-menu
```

- [ ] **Step 2: Verify components installed**

Run: `ls apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/dropdown-menu.tsx`
Expected: Both files exist.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/ apps/web/package.json pnpm-lock.yaml
git commit -m "add dialog and dropdown-menu shadcn components"
```

---

## Chunk 2: Core Workout Components

### Task 4: Rest Timer Component

**Files:**
- Create: `apps/web/src/components/workout/rest-timer.tsx`

- [ ] **Step 1: Create rest timer component**

Create `apps/web/src/components/workout/rest-timer.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

interface RestTimerProps {
  running: boolean;
  remainingSeconds: number;
  onTick: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
}

export function RestTimer({
  running,
  remainingSeconds,
  onTick,
  onSkip,
  onAdjust,
  onDismiss,
}: RestTimerProps) {
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;

    if (remainingSeconds <= 0) {
      // Vibrate if available
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Auto-dismiss after 3 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        onDismiss();
      }, 3000);

      return () => {
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      };
    }

    const interval = setInterval(() => {
      onTick();
    }, 1000);

    return () => clearInterval(interval);
  }, [running, remainingSeconds, onTick, onDismiss]);

  if (!running) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 lg:bottom-0">
      <div className="mx-auto max-w-screen-sm border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-secondary">
              {display}
            </span>
            <span className="text-sm text-muted-foreground">Rest</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdjust(-15)}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              -15s
            </button>
            <button
              onClick={() => onAdjust(15)}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              +15s
            </button>
            <button
              onClick={onSkip}
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/80"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/rest-timer.tsx
git commit -m "add rest timer component with auto-dismiss"
```

---

### Task 5: Set Row Component

**Files:**
- Create: `apps/web/src/components/workout/set-row.tsx`

- [ ] **Step 1: Create set row component**

Create `apps/web/src/components/workout/set-row.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Check, Circle } from "lucide-react";
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
  const [localWeight, setLocalWeight] = useState(
    weightKg != null ? String(weightKg) : ""
  );
  const [localReps, setLocalReps] = useState(
    reps != null ? String(reps) : ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSet = trpc.workout.updateSet.useMutation({
    onSuccess: () => onMutationSuccess(),
  });

  function debouncedUpdate(data: { weight?: number; reps?: number }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSet.mutate({ setId, ...data });
    }, 500);
  }

  function handleWeightChange(value: string) {
    setLocalWeight(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      debouncedUpdate({ weight: num });
    }
  }

  function handleRepsChange(value: string) {
    setLocalReps(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      debouncedUpdate({ reps: num });
    }
  }

  function handleComplete() {
    if (completed) return;
    updateSet.mutate(
      { setId, completed: true },
      {
        onSuccess: () => {
          onMutationSuccess();
          onCompleted();
        },
      }
    );
  }

  function handleRpeClick() {
    // Cycle through: null → 6 → 7 → 8 → 9 → 10 → null
    const cycle = [null, 6, 7, 8, 9, 10];
    const currentIndex = cycle.indexOf(rpe);
    const nextIndex = (currentIndex + 1) % cycle.length;
    const nextRpe = cycle[nextIndex]!;
    updateSet.mutate(
      { setId, rpe: nextRpe ?? undefined },
      { onSuccess: () => onMutationSuccess() }
    );
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
        className="w-12 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {rpe ?? "-"}
      </button>

      <button
        onClick={handleComplete}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/set-row.tsx
git commit -m "add inline set row component with debounced saves"
```

---

### Task 6: Exercise Card Component

**Files:**
- Create: `apps/web/src/components/workout/exercise-card.tsx`

- [ ] **Step 1: Create exercise card component**

Create `apps/web/src/components/workout/exercise-card.tsx`:

```tsx
"use client";

import { Dumbbell, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/exercise-card.tsx
git commit -m "add exercise card component with set table"
```

---

## Chunk 3: Exercise Search and Workout Header

### Task 7: Add Exercise Sheet

**Files:**
- Create: `apps/web/src/components/workout/add-exercise-sheet.tsx`

- [ ] **Step 1: Create add exercise sheet component**

Create `apps/web/src/components/workout/add-exercise-sheet.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/add-exercise-sheet.tsx
git commit -m "add exercise search bottom sheet component"
```

---

### Task 8: Workout Header Component

**Files:**
- Create: `apps/web/src/components/workout/workout-header.tsx`

- [ ] **Step 1: Create workout header component**

Create `apps/web/src/components/workout/workout-header.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatElapsed } from "@/lib/workout-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WorkoutHeaderProps {
  workoutId: string;
  workoutName: string | null;
  startedAt: Date;
  onFinish: () => void;
}

export function WorkoutHeader({
  workoutId,
  workoutName,
  startedAt,
  onFinish,
}: WorkoutHeaderProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const updateWorkout = trpc.workout.update.useMutation();

  // Elapsed timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleNameSubmit() {
    setIsEditing(false);
    if (editName.trim() && editName !== workoutName) {
      updateWorkout.mutate({ workoutId, name: editName.trim() });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => setShowCancel(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>

        <div className="text-center">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              className="w-40 bg-transparent text-center text-sm font-semibold text-foreground focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-foreground"
            >
              {workoutName || "Workout"}
            </button>
          )}
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>

        <button
          onClick={onFinish}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          Finish
        </button>
      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Workout?</DialogTitle>
            <DialogDescription>
              This workout won&apos;t be saved. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Working
            </Button>
            <Button
              variant="destructive"
              onClick={() => router.push("/dashboard")}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/workout-header.tsx
git commit -m "add workout header with elapsed timer and cancel dialog"
```

---

## Chunk 4: Completion and Page Assembly

### Task 9: Completion Summary Component

**Files:**
- Create: `apps/web/src/components/workout/completion-summary.tsx`

- [ ] **Step 1: Create completion summary component**

Create `apps/web/src/components/workout/completion-summary.tsx`:

```tsx
"use client";

import { Trophy, Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { calculateVolume } from "@/lib/workout-utils";

interface CompletedWorkout {
  id: string;
  name: string | null;
  durationSeconds: number | null;
  workoutExercises: {
    exercise: { name: string };
    sets: {
      weightKg: number | null;
      reps: number | null;
      completed: boolean;
    }[];
  }[];
}

interface PR {
  exerciseId: string;
  type: string;
  value: number;
  setId: string;
}

interface CompletionSummaryProps {
  workout: CompletedWorkout;
  newPRs: PR[];
  exerciseNames: Record<string, string>;
  onDone: () => void;
}

export function CompletionSummary({
  workout,
  newPRs,
  exerciseNames,
  onDone,
}: CompletionSummaryProps) {
  const exerciseCount = workout.workoutExercises.length;
  const allSets = workout.workoutExercises.flatMap((we) => we.sets);
  const completedSets = allSets.filter((s) => s.completed);
  const totalVolume = calculateVolume(allSets);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Trophy */}
      <div className="text-5xl">&#127942;</div>
      <h2 className="mt-3 text-2xl font-bold">Workout Complete!</h2>

      {/* Stats */}
      <div className="mt-6 flex gap-6 text-center">
        <div>
          <p className="text-xl font-bold">
            {workout.durationSeconds ? formatDuration(workout.durationSeconds) : "-"}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        <div>
          <p className="text-xl font-bold">{exerciseCount}</p>
          <p className="text-xs text-muted-foreground">Exercises</p>
        </div>
        <div>
          <p className="text-xl font-bold">{completedSets.length}</p>
          <p className="text-xs text-muted-foreground">Sets</p>
        </div>
        <div>
          <p className="text-xl font-bold">
            {totalVolume.toLocaleString("en-US")}
            <span className="text-sm font-normal">kg</span>
          </p>
          <p className="text-xs text-muted-foreground">Volume</p>
        </div>
      </div>

      {/* PR callouts */}
      {newPRs.length > 0 && (
        <Card className="mt-6 w-full max-w-sm border-warning/30 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <span className="text-sm font-semibold text-warning">
              New Personal Records
            </span>
          </div>
          {newPRs.map((pr) => (
            <div
              key={pr.setId}
              className="flex items-center justify-between border-b border-warning/10 py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {exerciseNames[pr.exerciseId] ?? "Exercise"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pr.type === "1rm" ? "Estimated 1RM" : "Volume PR"}
                </p>
              </div>
              <span className="text-lg font-bold text-warning">
                {Math.round(pr.value)} kg
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Exercise breakdown */}
      <div className="mt-6 w-full max-w-sm">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Exercises
        </p>
        <Card className="overflow-hidden">
          {workout.workoutExercises.map((we, i) => {
            const completedWeSets = we.sets.filter((s) => s.completed && s.weightKg && s.reps);
            const bestSet = completedWeSets.reduce(
              (best, s) => {
                const vol = (s.weightKg ?? 0) * (s.reps ?? 0);
                return vol > best.vol ? { vol, weight: s.weightKg!, reps: s.reps! } : best;
              },
              { vol: 0, weight: 0, reps: 0 }
            );

            return (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-0"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{we.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {we.sets.filter((s) => s.completed).length} set
                    {we.sets.filter((s) => s.completed).length !== 1 ? "s" : ""}
                    {bestSet.vol > 0
                      ? ` · Best: ${bestSet.weight}kg × ${bestSet.reps}`
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Done button */}
      <Button
        onClick={onDone}
        className="mt-8 w-full max-w-sm"
        size="lg"
      >
        Done
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/completion-summary.tsx
git commit -m "add workout completion summary with PR callouts"
```

---

### Task 10: Active Workout Orchestrator

**Files:**
- Create: `apps/web/src/components/workout/active-workout.tsx`

- [ ] **Step 1: Create active workout component**

Create `apps/web/src/components/workout/active-workout.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { WorkoutHeader } from "./workout-header";
import { ExerciseCard } from "./exercise-card";
import { AddExerciseSheet } from "./add-exercise-sheet";
import { RestTimer } from "./rest-timer";
import { CompletionSummary } from "./completion-summary";

const REST_DURATION = 90;

interface ActiveWorkoutProps {
  workoutId: string;
  startedAt: Date;
  initialName: string | null;
}

export function ActiveWorkout({
  workoutId,
  startedAt,
  initialName,
}: ActiveWorkoutProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restRunning, setRestRunning] = useState(false);
  const [restRemaining, setRestRemaining] = useState(REST_DURATION);
  const [completionPRs, setCompletionPRs] = useState<
    { exerciseId: string; type: string; value: number; setId: string }[] | null
  >(null);

  const utils = trpc.useUtils();

  const workout = trpc.workout.getById.useQuery({ workoutId });
  const completeWorkout = trpc.workout.complete.useMutation({
    onSuccess: (data) => {
      // Re-fetch workout to get updated durationSeconds, then show completion
      utils.workout.getById.invalidate({ workoutId });
      setCompletionPRs(data.newPRs);
    },
  });

  const invalidateWorkout = useCallback(() => {
    utils.workout.getById.invalidate({ workoutId });
  }, [utils, workoutId]);

  function handleSetCompleted() {
    setRestRemaining(REST_DURATION);
    setRestRunning(true);
  }

  function handleFinish() {
    completeWorkout.mutate({ workoutId });
  }

  // Show completion screen — use workout.getById data (has full exercise/set nesting)
  if (completionPRs !== null && workout.data) {
    const exerciseNames: Record<string, string> = {};
    for (const we of workout.data.workout.workoutExercises) {
      exerciseNames[we.exercise.id] = we.exercise.name;
    }

    return (
      <CompletionSummary
        workout={workout.data.workout}
        newPRs={completionPRs}
        exerciseNames={exerciseNames}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div className="pb-24">
      <WorkoutHeader
        workoutId={workoutId}
        workoutName={initialName}
        startedAt={startedAt}
        onFinish={handleFinish}
      />

      {/* Exercise cards */}
      {workout.data?.workout.workoutExercises.map((we) => (
        <ExerciseCard
          key={we.id}
          workoutExercise={we}
          onSetCompleted={handleSetCompleted}
          onMutationSuccess={invalidateWorkout}
        />
      ))}

      {/* Empty state */}
      {workout.data?.workout.workoutExercises.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No exercises yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap below to add your first exercise.
          </p>
        </div>
      )}

      {/* Add exercise button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="mt-4 w-full rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        + Add Exercise
      </button>

      {/* Exercise search sheet */}
      <AddExerciseSheet
        workoutId={workoutId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onExerciseAdded={invalidateWorkout}
      />

      {/* Rest timer */}
      <RestTimer
        running={restRunning}
        remainingSeconds={restRemaining}
        onTick={() => setRestRemaining((r) => Math.max(0, r - 1))}
        onSkip={() => setRestRunning(false)}
        onAdjust={(delta) =>
          setRestRemaining((r) => Math.max(0, r + delta))
        }
        onDismiss={() => setRestRunning(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/workout/active-workout.tsx
git commit -m "add active workout orchestrator with rest timer and completion flow"
```

---

### Task 11: Workout Page

**Files:**
- Create: `apps/web/src/app/(app)/workouts/new/page.tsx`

- [ ] **Step 1: Create workout page**

Create `apps/web/src/app/(app)/workouts/new/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { getWorkoutName } from "@/lib/workout-utils";

export default function NewWorkoutPage() {
  const [workoutData, setWorkoutData] = useState<{
    id: string;
    startedAt: Date;
    name: string | null;
  } | null>(null);
  const [error, setError] = useState(false);
  const createdRef = useRef(false);

  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: (data) => {
      setWorkoutData({
        id: data.workout.id,
        startedAt: new Date(data.workout.startedAt),
        name: data.workout.name,
      });
    },
    onError: () => {
      setError(true);
    },
  });

  useEffect(() => {
    // Guard against React Strict Mode double-invocation creating two workouts
    if (createdRef.current) return;
    createdRef.current = true;
    createWorkout.mutate({ name: getWorkoutName() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Could not create workout.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!workoutData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <ActiveWorkout
      workoutId={workoutData.id}
      startedAt={workoutData.startedAt}
      initialName={workoutData.name}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(app)/workouts/new/page.tsx"
git commit -m "add workout session page with auto-create on mount"
```

---

## Chunk 5: Integration and Verification

### Task 12: Full Build Verification

- [ ] **Step 1: Run all tests**

Run: `cd apps/web && npx vitest run`
Expected: All tests PASS (format tests + workout-utils tests + greeting tests).

- [ ] **Step 2: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run full build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds. The `/workouts/new` route should appear in the build output.

- [ ] **Step 4: Verify all files exist**

Run:
```bash
ls apps/web/src/components/workout/
ls apps/web/src/app/\(app\)/workouts/new/
ls apps/web/src/hooks/
ls apps/web/src/lib/workout-utils.ts
```

Expected:
- `workout/`: `active-workout.tsx`, `add-exercise-sheet.tsx`, `completion-summary.tsx`, `exercise-card.tsx`, `rest-timer.tsx`, `set-row.tsx`, `workout-header.tsx`
- `workouts/new/`: `page.tsx`
- `hooks/`: `use-debounced-mutation.ts`
- `workout-utils.ts` exists
