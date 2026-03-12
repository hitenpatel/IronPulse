# Workout Logging UI — Design Specification

## Goal

Implement the workout logging UI — the core strength training flow where users create a workout, add exercises, log sets (weight/reps/RPE), and complete the session with PR detection.

## Architecture

**tRPC-driven (server state).** Every user action fires a tRPC mutation. `workout.getById` is the single source of truth, auto-refetched via React Query invalidation after each mutation. No local state management beyond form inputs and the rest timer countdown.

This approach has zero state management boilerplate and aligns with the future PowerSync migration — when local-first sync arrives, tRPC mutations are replaced with local writes while UI components stay the same.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, shadcn/ui (new-york), lucide-react, tRPC React Query hooks.

## Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/workouts/new` | Client page | Active workout session — create, log, complete |

Note: `/workouts/[id]` (read-only detail view) is out of scope for this spec.

## Component Structure

```
apps/web/src/
├── app/(app)/workouts/
│   └── new/
│       └── page.tsx                    # CREATE — creates workout, renders ActiveWorkout
├── components/workout/
│   ├── active-workout.tsx              # CREATE — main workout screen orchestrator
│   ├── workout-header.tsx              # CREATE — elapsed timer, name, cancel/finish
│   ├── exercise-card.tsx               # CREATE — exercise with set table
│   ├── set-row.tsx                     # CREATE — inline set input row
│   ├── add-exercise-sheet.tsx          # CREATE — bottom sheet exercise search
│   ├── rest-timer.tsx                  # CREATE — floating countdown bar
│   └── completion-summary.tsx          # CREATE — post-workout stats + PRs
```

## Screen Flow

1. **Dashboard** → User taps "Start Workout" (quick-start card or FAB "+")
2. **Active Workout** → Empty workout created on mount → add exercises → log sets
3. **Exercise Search** → Bottom sheet with search + recents → tap to add
4. **Set Logging** → Inline rows (kg/reps/RPE/checkmark) → complete set → rest timer
5. **Rest Timer** → Floating bar auto-starts on set completion → countdown → auto-dismiss
6. **Completion** → Tap "Finish" → stats summary + PR callouts → "Done" → dashboard

## Component Specifications

### `page.tsx` — Workout Session Page

**Behavior:**
- On mount, call `workout.create({})` mutation to create a blank workout
- Store the returned `workoutId` in component state
- Render `ActiveWorkout` with the `workoutId`
- If creation fails, show error and link back to dashboard

**Route:** `/workouts/new` inside `(app)` route group (requires auth).

### `workout-header.tsx` — Header Bar

**Props:** `workoutId: string`, `startedAt: Date`, `onFinish: () => void`, `onCancel: () => void`

**Layout (mobile-first):**
```
[← Cancel]   [Morning Workout ✎]   [Finish]
              12:34 elapsed
```

**Behavior:**
- **Elapsed timer:** Counts up from `startedAt` using `setInterval`. Display as `MM:SS` or `H:MM:SS`.
- **Workout name:** Defaults to auto-generated name (e.g., "Morning Workout" based on time of day). Tap to edit inline → `workout.update({ workoutId, name })`.
- **Cancel:** Shows confirmation dialog ("Discard this workout?"). On confirm, navigates to `/dashboard`. The incomplete workout remains in DB (no delete endpoint in MVP — acceptable, can be cleaned up later or by a cron).
- **Finish:** Calls `onFinish` prop (parent handles `workout.complete`).

### `active-workout.tsx` — Main Workout Screen

**Props:** `workoutId: string`

**Data:** `workout.getById({ workoutId })` query — returns full workout with nested `workoutExercises` → `exercise` + `sets` (ordered).

**Layout:**
```
[WorkoutHeader]

[ExerciseCard — Bench Press]
  Set table rows...
  + Add Set

[ExerciseCard — Squat]
  Set table rows...
  + Add Set

[--- Add Exercise (dashed border button) ---]

[RestTimer — floating at bottom]
```

**Behavior:**
- Renders `ExerciseCard` for each `workoutExercise` from the query data
- "Add Exercise" button opens `AddExerciseSheet`
- After adding an exercise, invalidates `workout.getById` query → new exercise card appears
- Manages rest timer state (running, remaining seconds, default duration)
- On "Finish": calls `workout.complete({ workoutId })` → receives `{ workout, newPRs }` → shows `CompletionSummary`
- Passes `pb-20 lg:pb-0` padding to account for bottom nav / rest timer bar

### `exercise-card.tsx` — Exercise with Set Table

**Props:** `workoutExercise: WorkoutExercise` (with nested `exercise` and `sets`), `onSetCompleted: () => void`

**Layout:**
```
Bench Press                    ⋮
Previous best: 85kg × 8

SET    KG     REPS    RPE
 1     80      8       -     ✓  (completed)
 2     85      6       7     ✓  (completed)
 3     [85]   [_]      -     ○  (active)

+ Add Set
```

**Behavior:**
- **Exercise name** in primary color (`text-primary`).
- **Previous best:** Shows the user's best set for this exercise from their last workout containing it. Requires fetching previous workout data. MVP approach: skip previous best if data isn't readily available, or use a simple query. Mark as enhancement if complex.
- **Set table:** Header row (SET / KG / REPS / RPE) + `SetRow` per set.
- **"+ Add Set":** Calls `workout.addSet({ workoutExerciseId })` → invalidates query.
- **"⋮" overflow menu:** MVP: "Add Note" only. "Remove Exercise" is omitted — there is no `removeExercise` tRPC endpoint. Users can leave an exercise card empty if they change their mind. A `removeExercise` endpoint can be added in a future iteration.
- **`onSetCompleted`:** Called when a set's checkmark is tapped, so parent can start rest timer.

### `set-row.tsx` — Inline Set Input Row

**Props:** `set: ExerciseSet`, `setNumber: number`, `previousWeight?: number`, `onCompleted: () => void`

**Layout:**
```
[1]   [80 kg]   [8 reps]   [RPE -]   [✓]
```

**Behavior:**
- **Weight field:** Numeric input. If empty, shows previous workout's weight as grey placeholder. On blur/change, calls `workout.updateSet({ setId, weight })`.
- **Reps field:** Numeric input. On blur/change, calls `workout.updateSet({ setId, reps })`.
- **RPE field:** Optional. Tap to show a simple picker (1-10). Displays "-" when unset. Calls `workout.updateSet({ setId, rpe })`.
- **Checkmark:** Uncompleted = grey circle (○). Tap → calls `workout.updateSet({ setId, completed: true })` → icon becomes green checkmark (✓) → triggers `onCompleted` (starts rest timer).
- **Input type:** `inputMode="decimal"` for weight, `inputMode="numeric"` for reps. Opens numeric keyboard on mobile.
- **Debounced saves:** Weight and reps changes are debounced (500ms) to avoid excessive mutations.
- **Completed row styling:** Completed sets have slightly muted text. Fields remain editable (user can correct mistakes).

### `add-exercise-sheet.tsx` — Exercise Search Bottom Sheet

**Props:** `workoutId: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`

**Layout:**
```
─── handle ───
Add Exercise

[🔍 Search exercises...]

RECENT
  💪 Bench Press          Chest · Barbell         [+]
  💪 Squat                Quads · Barbell         [+]
  💪 Overhead Press       Shoulders · Barbell     [+]

ALL EXERCISES
  💪 Ab Wheel Rollout     Abs · Bodyweight        [+]
  💪 Arnold Press         Shoulders · Dumbbell    [+]
  ↓ Scroll for more...

+ Create Custom Exercise
```

**Behavior:**
- Uses shadcn `Sheet` component with `side="bottom"`.
- **Search:** `exercise.list({ search: "..." })` with debounced input (300ms). Results replace the recents/all sections.
- **Recent exercises:** MVP approach: skip recents section. Show only the search bar and the full "All Exercises" list. Adding a "recent exercises" section requires either a new API endpoint or N+1 queries — defer to a future iteration when a dedicated `exercise.recent` endpoint can be added.
- **All exercises:** `exercise.list({ limit: 20 })` with cursor-based infinite scroll.
- **Tap "+":** Calls `workout.addExercise({ workoutId, exerciseId })` → invalidates workout query → closes sheet.
- **Create Custom:** Opens inline form within the sheet (name, category, primaryMuscles array, equipment). Calls `exercise.create({ name, category, primaryMuscles: [selected], equipment })` → then `workout.addExercise` → closes sheet. Note: `primaryMuscles` is an array per the schema — the form should have a single muscle group selector but send it as `[value]`.
- **Exercise row:** Shows exercise name, primary muscle group + equipment as subtitle.

### `rest-timer.tsx` — Floating Rest Timer

**Props:** `running: boolean`, `remainingSeconds: number`, `onSkip: () => void`, `onAdjust: (delta: number) => void`

**Layout (sticky bottom bar):**
```
┌─────────────────────────────────────────┐
│  1:24  Rest         [-15s] [+15s] [Skip]│
└─────────────────────────────────────────┘
```

**Behavior:**
- **Positioning:** `position: fixed; bottom: 4rem` on mobile (above bottom nav), `position: fixed; bottom: 0` on desktop. Uses `lg:` breakpoint to adjust.
- **Default duration:** 90 seconds. Configurable per-session (future: per-exercise).
- **Auto-start:** Parent component starts timer when a set is marked completed.
- **Countdown:** `useEffect` with `setInterval(1000ms)`. Displays `M:SS` format.
- **At zero:** Brief vibration (if `navigator.vibrate` available). Timer bar stays visible for 3 seconds showing "0:00", then auto-hides.
- **-15s / +15s:** Adjusts remaining time. Cannot go below 0.
- **Skip:** Sets remaining to 0, hides timer immediately.
- **Hidden when not running:** Component returns `null` when `running === false` and timer has been dismissed.

### `completion-summary.tsx` — Post-Workout Summary

**Props:** `workout: CompletedWorkout`, `newPRs: PersonalRecord[]`, `onDone: () => void`

**Layout:**
```
        🏆
  Workout Complete!

  45min    4        14      8,420kg
  Duration Exercises Sets   Volume

  ┌─ 🏆 New Personal Records ─────────┐
  │  Bench Press                       │
  │  Estimated 1RM            102 kg   │
  │  Squat                             │
  │  Volume PR              3,600 kg   │
  └────────────────────────────────────┘

  EXERCISES
  ● Bench Press     3 sets · Best: 85kg × 6
  ● Squat           4 sets · Best: 120kg × 5
  ● Incline DB      3 sets · Best: 30kg × 10
  ● Tricep Push     4 sets · Best: 25kg × 12

  [          Done          ]
```

**Behavior:**
- **Stats:** Duration from `workout.durationSeconds`. Exercise count and set count from workout data. Volume = sum of `weightKg × reps` for all completed sets.
- **PR section:** Only rendered if `newPRs.length > 0`. Gold/amber theme (`text-warning`, `bg-warning/10`). Shows PR type ("Estimated 1RM" or "Volume PR") and value.
- **Exercise breakdown:** Lists each exercise with set count and best set (highest weight × reps).
- **"Done" button:** Calls `onDone` → navigates to `/dashboard`.

## Data Flow

```
Page Mount
  └→ workout.create({}) → { workout: { id, startedAt } }
      └→ Store workoutId, render ActiveWorkout

Add Exercise
  └→ User taps "Add Exercise" → Sheet opens
      └→ exercise.list({ search? }) → display results
          └→ User taps "+" → workout.addExercise({ workoutId, exerciseId })
              └→ Invalidate workout.getById → new card appears

Log Set
  └→ workout.addSet({ workoutExerciseId }) → new empty set row
      └→ User enters weight/reps → workout.updateSet({ setId, weight, reps })
          └→ User taps ✓ → workout.updateSet({ setId, completed: true })
              └→ Rest timer auto-starts (90s default)

Complete Workout
  └→ User taps "Finish" → workout.complete({ workoutId })
      └→ Server: calculates duration, runs PR detection
          └→ Returns { workout, newPRs } → show CompletionSummary
              └→ User taps "Done" → navigate to /dashboard
```

## Unit System

Weight is stored in kg internally. Display conversion:
- **Metric:** Show as-is (`kg`)
- **Imperial:** Convert `kg × 2.20462` and display as `lbs`

Read `unitSystem` from the user's session. Apply conversion at the display layer only — all mutations send kg to the server. For MVP, hardcode metric display (the session already has `unitSystem` but building the conversion utility can be deferred).

## Out of Scope

- Workout templates (start from template)
- Exercise reordering (drag to reorder)
- Workout detail/history page (`/workouts/[id]`)
- Set type selector UI (warmup/dropset/failure — data model supports it, default to "working")
- Exercise images/videos in search results
- Imperial unit conversion (deferred — metric only for MVP)
- Offline support / PowerSync integration
- Workout deletion endpoint (incomplete workouts remain in DB)
