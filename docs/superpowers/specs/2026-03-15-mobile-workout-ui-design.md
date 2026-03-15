# Mobile Workout Logging UI — Design Specification

Redesigned mobile-first workout logging UI for the IronPulse Expo app. Single-screen layout with swipe gestures, haptic feedback, keyboard-aware scrolling, and template support. This is sub-project 2 of 4 for the mobile app.

## Scope

- Active workout screen (fullscreen, pushed over tabs)
- Exercise cards with inline set inputs and swipe-to-delete
- Fullscreen exercise search modal
- Template picker bottom sheet
- Rest timer with circular progress
- Completion summary with PR callouts
- Haptic feedback on set completion
- Keyboard-aware scrolling for set inputs
- 3 Maestro E2E flows

## Out of Scope

- Workout history list / detail views (sub-project 4)
- Cardio logging (sub-project 3)
- Save-as-template flow (sub-project 4)

## Screen Flow & Navigation

```
FAB "Start Workout"
  → Template Picker (bottom sheet)
    → "Empty Workout" or select template
    → Active Workout Screen (fullscreen stack, no tab bar)
      → Add Exercise (fullscreen modal, slides up)
      → Completion Summary (replaces active workout)
        → "Done" → back to dashboard
```

The active workout is a dedicated fullscreen screen pushed onto the stack. The user cannot navigate away without cancelling or finishing. Swiping back or tapping cancel shows a confirmation alert: "Discard workout? All logged sets will be lost."

## Active Workout Screen Layout

Three zones, designed for one-handed gym use:

### Top Zone — Workout Header

- Elapsed timer (auto-counting from workout start, `started_at` field)
- Workout name (tappable to edit via `Alert.prompt`)
- "Cancel" button (top-left) — shows discard confirmation
- "Finish" button (top-right) — triggers completion flow

### Middle Zone — Exercise List

`FlatList` of exercise cards:

- **Exercise card:** exercise name header with swipe-to-delete gesture (swipe left reveals red delete via `Swipeable` from `react-native-gesture-handler`)
- **Set rows:** horizontal layout within each card
  - Weight input (`TextInput`, `keyboardType="decimal-pad"`, placeholder "kg")
  - Reps input (`TextInput`, `keyboardType="number-pad"`, placeholder "reps")
  - RPE picker (tappable, opens a small picker with values 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0 — Borg CR10 subset for strength training)
  - Completion checkmark (toggle button, `Pressable`)
  - All touch targets minimum 44pt (Apple HIG)
- **"Add Set" button** at the bottom of each exercise card
- **Keyboard-aware scrolling:** `FlatList` uses `keyboardShouldPersistTaps="handled"` to allow tapping other inputs without dismissing the keyboard. On input focus, call `flatListRef.scrollToIndex()` to keep the focused row visible. Do NOT use `KeyboardAvoidingView` wrapping `FlatList` (causes layout issues). Instead, use `FlatList` with `contentContainerStyle={{ paddingBottom: keyboardHeight }}` derived from the `Keyboard` event listener.

### Bottom Zone — Actions

- "Add Exercise" button fixed at bottom above safe area inset
- Rest timer slides up from bottom when a set is completed, overlaying the add exercise button

## Set Input Behavior

- Weight and reps are `TextInput` with numeric keyboard
- RPE is a custom picker (not free text): tapping opens a small popover or bottom sheet with values 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0
- Tapping the checkmark marks the set complete (`completed = 1`)
- Completed sets remain editable (inputs don't lock)
- Changes are written to PowerSync immediately via `db.execute(UPDATE exercise_sets ...)`
- Debounce writes by 500ms to match web implementation and avoid excessive SQLite operations during rapid typing

## Swipe-to-Delete

- Exercise cards: swipe left reveals a red "Delete" button. Tapping performs a two-step delete: first `DELETE FROM exercise_sets WHERE workout_exercise_id = ?`, then `DELETE FROM workout_exercises WHERE id = ?`. PowerSync/SQLite does not support `ON DELETE CASCADE` foreign keys, so both deletes must be explicit.
- Individual sets: no swipe delete. A "−" button appears on each set row (next to the checkmark) that deletes the set row.

## Haptic Feedback

- Set completion checkmark: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` via `expo-haptics`
- Workout finish: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`

## Add Exercise Modal

Fullscreen modal pushed onto the stack (slides up from bottom):

- Search input at top with auto-focus and `autoFocus={true}`
- Exercise list from `useExercises({ search })` (PowerSync, local data)
- Each row: exercise name, category badge, primary muscles text
- Tapping an exercise:
  1. Inserts `workout_exercises` row via `db.execute()`
  2. Inserts first empty `exercise_sets` row
  3. Dismisses the modal
  4. Scrolls the exercise list to the new exercise
- Single-select only — tap "Add Exercise" again for more

## Template Picker

Bottom sheet shown when "Start Workout" is tapped from the FAB:

- "Empty Workout" option at top (large, primary styled)
- Divider
- List of saved templates from `useTemplates()` (PowerSync)
- Each row: template name, exercise count
- Tapping a template:
  1. Creates workout row via `db.execute(INSERT INTO workouts ...)`
  2. For each `template_exercise`: inserts `workout_exercises` row
  3. For each `template_set`: inserts `exercise_sets` row with target weight/reps
  4. Navigates to active workout screen
- Tapping "Empty Workout":
  1. Creates workout row
  2. Navigates to active workout screen (no exercises yet)

## Rest Timer

Triggered when a set is marked complete (checkmark tapped):

- Slides up from bottom as a floating bar (absolutely positioned, above safe area)
- Shows: countdown text (default 90s), circular progress ring (`react-native-svg` or `react-native-reanimated` animated circle), "Skip" button
- Tapping the timer expands to show +15s / −15s adjustment buttons
- Auto-dismisses when countdown reaches 0
- Completing another set while timer is running resets it to 90s
- Only one timer active at a time
- Timer persists across scrolling

## Completion Flow

When "Finish" is tapped:

1. **Local write:** `UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ?`
2. **Server call:** `trpc.workout.complete.mutate({ id })` — runs PR detection server-side. Returns new PRs if any.
3. **Haptic:** `Haptics.notificationAsync(Success)`
4. **Navigate** to completion summary screen (replaces active workout in stack)

### Completion Summary Screen

- Workout name and total duration
- Total volume: sum of (weight × reps) for all completed sets, computed from local data
- Exercise list: exercise name + "3 sets" etc.
- PR callouts: highlighted cards for any new PRs returned by the server
- "Done" button → pops back to dashboard

If server call fails (offline): summary still shows, PRs omitted. PRs will be detected on next sync when the user is online.

## Data Layer

All writes via `usePowerSync()` → `db.execute()`, identical to web:

| Operation | SQL |
|-----------|-----|
| Create workout | `INSERT INTO workouts (id, user_id, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)` |
| Add exercise | `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes) VALUES (?, ?, ?, ?, ?)` |
| Add set | `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, ?, 'working', 0)` |
| Update set | `UPDATE exercise_sets SET weight_kg = ?, reps = ?, rpe = ? WHERE id = ?` |
| Complete set | `UPDATE exercise_sets SET completed = 1 WHERE id = ?` |
| Delete set | `DELETE FROM exercise_sets WHERE id = ?` |
| Delete exercise | `DELETE FROM workout_exercises WHERE id = ?` |
| Update name | `UPDATE workouts SET name = ? WHERE id = ?` |
| Finish workout | `UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ?` |

Reads use shared hooks from `@ironpulse/sync`: `useWorkoutExercises(workoutId)`, `useWorkoutSets(workoutId)`, `useExercises({ search })`, `useTemplates()`.

Server call: `trpc.workout.complete.mutate({ id })` for PR detection (via mobile tRPC client with bearer auth).

## FAB Integration

The existing `NewSessionSheet` component stays. When the user taps "Start Workout" inside that sheet, it opens the template picker as a second bottom sheet (or navigates to the template picker screen). "Log Cardio" remains as a placeholder until sub-project 3.

## Routing

Workout screens live under `app/workout/` which is outside the `(tabs)` group. This means the tab bar is automatically hidden when the workout stack is active. `app/workout/_layout.tsx` uses `<Stack screenOptions={{ headerShown: false, presentation: 'fullScreenModal' }}>` for a fullscreen feel. Navigation from tabs: `router.push("/workout/active")`.

## App Backgrounding & Resume

All workout data (sets, exercises) is written to PowerSync immediately during the workout. If the app is killed mid-workout, the data survives in SQLite. On next app launch, detect any workout where `completed_at IS NULL` and `started_at` exists — offer the user a choice to "Resume" or "Discard" via an alert. The elapsed timer reconstructs from the `started_at` field in the database, not from component state.

## Template Hooks

The template picker needs to read `template_exercises` and `template_sets` to hydrate a workout from a template. These hooks don't exist yet in `packages/sync/src/hooks/`. Create two new hooks:

- `useTemplateExercises(templateId)` — `SELECT te.*, e.name as exercise_name FROM template_exercises te LEFT JOIN exercises e ON te.exercise_id = e.id WHERE te.template_id = ? ORDER BY te."order"`
- `useTemplateSets(templateExerciseId)` — `SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number`

These are added to `packages/sync/src/hooks/` and exported from `@ironpulse/sync`.

## Sync Timing on Completion

When the user taps "Finish," the local write (`completed_at`, `duration_seconds`) is applied immediately to SQLite. The server call `trpc.workout.complete.mutate({ id })` runs PR detection by reading from PostgreSQL. The sets and exercises were synced to PostgreSQL continuously during the workout via PowerSync's upload queue. In the rare edge case where the user completes a workout immediately after going online (sets haven't synced yet), the server may miss some sets for PR calculation. This is acceptable — PRs will be recalculated on the next sync cycle. No explicit "wait for sync" step is needed.

## Empty Template State

If the user has zero saved templates, the template picker bottom sheet shows only "Empty Workout" (the template list section is hidden). No empty state message needed — the user simply taps "Empty Workout" directly.

## TestID Convention

All interactive components must include `testID` props for Maestro E2E tests:

- FAB button: `testID="fab-button"`
- Set weight input: `testID="weight-input-{exerciseIndex}-{setIndex}"`
- Set reps input: `testID="reps-input-{exerciseIndex}-{setIndex}"`
- Set complete button: `testID="complete-set-{exerciseIndex}-{setIndex}"`
- Add exercise button: `testID="add-exercise-button"`
- Finish button: `testID="finish-button"`

## File Structure

```
apps/mobile/
├── app/
│   ├── workout/
│   │   ├── _layout.tsx                  # Stack layout for workout flow
│   │   ├── active.tsx                   # Active workout screen (orchestrator)
│   │   ├── add-exercise.tsx             # Fullscreen exercise search modal
│   │   └── complete.tsx                 # Completion summary
├── components/workout/
│   ├── workout-header.tsx               # Timer, name, cancel/finish
│   ├── exercise-card.tsx                # Swipeable card with set rows
│   ├── set-row.tsx                      # Weight/reps/RPE inputs + checkmark
│   ├── rpe-picker.tsx                   # Custom RPE value picker
│   ├── rest-timer.tsx                   # Floating countdown with progress ring
│   └── template-picker.tsx              # Bottom sheet for template selection
├── lib/
│   └── workout-utils.ts                 # Volume calc, name generation, time formatting
└── e2e/
    ├── workout-empty.yaml               # Empty workout flow
    ├── workout-template.yaml            # Template flow
    └── workout-cancel.yaml              # Cancel flow
```

## Dependencies

- `expo-haptics` — haptic feedback (new, needs install)
- `react-native-gesture-handler` — swipe-to-delete (already installed)
- `react-native-reanimated` — rest timer animation (already installed)
- `@gorhom/bottom-sheet` — template picker (already installed)
- `lucide-react-native` — icons (already installed)

## Testing

### Maestro E2E Flows

**workout-empty.yaml:**
```yaml
appId: com.ironpulse.app
---
- launchApp
# Sign in first
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Good morning"
# Start workout via FAB
- tapOn:
    id: "fab-button"
- tapOn: "Empty Workout"
- assertVisible: "Finish"
# Add an exercise
- tapOn: "Add Exercise"
- tapOn: "Bench Press"
# Log a set
- tapOn:
    id: "weight-input-0-0"
- inputText: "80"
- tapOn:
    id: "reps-input-0-0"
- inputText: "8"
- tapOn:
    id: "complete-set-0-0"
# Finish
- tapOn: "Finish"
- assertVisible: "Workout Complete"
- tapOn: "Done"
- assertVisible: "Good morning"
```

**workout-template.yaml:**
```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Good morning"
- tapOn:
    id: "fab-button"
# Assumes a template exists in synced data
- assertVisible: "Empty Workout"
```

**workout-cancel.yaml:**
```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Good morning"
- tapOn:
    id: "fab-button"
- tapOn: "Empty Workout"
- assertVisible: "Finish"
- tapOn: "Cancel"
- tapOn: "Discard"
- assertVisible: "Good morning"
```

### Unit Tests

- `workout-utils.ts`: volume calculation, elapsed time formatting, default workout name generation
- Tested with Vitest in `apps/mobile/` or `packages/sync/`
