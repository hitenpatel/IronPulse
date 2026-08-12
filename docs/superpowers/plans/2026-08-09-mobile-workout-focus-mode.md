# Mobile Workout Focus-Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile workout logging faster and clearer by expanding one current exercise, presenting one next set/action, and keeping the full workout available as a compact queue.

**Architecture:** Keep PowerSync SQLite as the local source of truth. Extract a thin active-screen controller over pure focus/draft/rest/finish functions and transaction-only mutation helpers. Presentational components receive state and commands rather than issuing SQL. Device-local AsyncStorage persists focus, rest, and favorites; workout data remains in PowerSync. The completion screen renders local stats immediately and observes server-owned finalization status without issuing a second completion mutation.

**Tech Stack:** React Native 0.81, React 19.1, React Navigation 7, PowerSync, AsyncStorage, Vitest for pure tests, Jest plus React Native Testing Library for component tests, Maestro for Android device flows.

## Required execution order

1. Complete TASK-23.1 from `2026-08-09-workout-completion-finalization.md` so mobile finishing is local-only.
2. Restore the unit/component gate in TASK-23.7.
3. Complete TASK-23.2 from the finalization plan.
4. Complete TASK-18 as a behavior-preserving controller extraction.
5. Implement TASK-23.3, TASK-23.4, and TASK-23.5 in that order.
6. Repair the device pipeline in TASK-23.8, then execute release verification in TASK-23.6.
7. TASK-24 instrumentation is optional and must not block this release.

Do not deploy a build that reintroduces `workout.complete` from a PowerSync-backed mobile or web finish path. Do not stage or commit the unrelated rebrand, assets, screenshots, or worktree changes already present in the primary checkout.

---

### Task 1: Restore trustworthy mobile test gates (TASK-23.7)

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mobile/tsconfig.json`
- Modify: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/vitest.setup.ts`
- Create: `apps/mobile/jest.config.cjs`
- Create: `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/components/__tests__/test-harness-smoke.test.tsx`
- Modify: `apps/mobile/lib/__tests__/notifications.test.ts`
- Modify: `apps/mobile/lib/__tests__/googlefit.test.ts`
- Modify: `apps/mobile/lib/__tests__/healthkit.test.ts`

**Baseline evidence:** On 2026-08-09, `pnpm --filter @zor/mobile test` reported 143 passing tests, three notification failures, and Google Fit/HealthKit collection failures from `react-native-get-random-values`. `pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit` reported TS5095 because `module: commonjs` conflicts with `moduleResolution: bundler`.

- [ ] **Step 1: Preserve the failing baseline in TASK-23.7 notes**

Run both commands above and append their exact exit codes and failure names through `backlog task edit TASK-23.7 --append-notes`.

- [ ] **Step 2: Repair the pure-test environment**

Set `compilerOptions.module` to `ESNext` while retaining `moduleResolution: bundler`. Register `vitest.setup.ts` in `vitest.config.ts`. In setup, mock `react-native-get-random-values` as an empty side-effect module so pure Google Fit/HealthKit functions can load under Node.

Refactor `notifications.test.ts` to install a deterministic global `require` stub before dynamically importing `../notifications`; return the test's Expo Notifications, Expo Device, and React Native Platform fakes from that stub. Reset modules and globals after every test. Do not weaken the runtime module-availability guard in `notifications.ts` merely to satisfy Node tests.

- [ ] **Step 3: Add the React Native component runner**

Run:

```bash
pnpm --filter @zor/mobile add -D jest@29.7.0 babel-jest@29.7.0 @types/jest@29.5.14 @testing-library/react-native react-test-renderer@19.1.0
```

Configure `jest.config.cjs` with the React Native preset, `babel-jest`, `jest.setup.ts`, and the narrow transform-ignore allowlist needed by React Native, React Navigation, Reanimated, safe-area context, Lucide, and PowerSync. Mock Reanimated with its published mock and safe-area insets with stable top/bottom values.

Add scripts:

```json
{
  "test:unit": "vitest run",
  "test:components": "jest --config jest.config.cjs --runInBand",
  "test": "pnpm run test:unit && pnpm run test:components"
}
```

- [ ] **Step 4: Prove the component harness**

Create a smoke fixture containing a `Pressable` with role `button`, label `Complete set`, and a callback. Render it with React Native Testing Library, find it by role/name, press it, and assert the callback fired exactly once. This verifies rendering, accessibility queries, and events before product components depend on the harness.

- [ ] **Step 5: Verify and commit the gate**

```bash
pnpm --filter @zor/mobile test:unit
pnpm --filter @zor/mobile test:components
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

Expected: all three commands exit 0.

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/tsconfig.json apps/mobile/vitest.config.ts apps/mobile/vitest.setup.ts apps/mobile/jest.config.cjs apps/mobile/jest.setup.ts apps/mobile/components/__tests__/test-harness-smoke.test.tsx apps/mobile/lib/__tests__/notifications.test.ts apps/mobile/lib/__tests__/googlefit.test.ts apps/mobile/lib/__tests__/healthkit.test.ts
git commit -m "test(mobile): restore unit and component gates"
```

Finalize TASK-23.7 through the Backlog CLI before starting TASK-18.

---

### Task 2: Extract the active-workout controller without changing UX (TASK-18)

**Files:**
- Create: `apps/mobile/hooks/use-active-workout-session.ts`
- Create: `apps/mobile/lib/workout-session-repository.ts`
- Create: `apps/mobile/lib/__tests__/workout-session-repository.test.ts`
- Create: `apps/mobile/components/workout/__tests__/active-workout-session.test.tsx`
- Modify: `apps/mobile/app/workout/active.tsx`

**Interfaces:**

```ts
export interface ActiveWorkoutSession {
  workout: WorkoutRow | null;
  exercises: WorkoutExerciseRow[];
  sets: SetRow[];
  setsByExercise: ReadonlyMap<string, SetRow[]>;
  activeSetId: string | null;
  doneSets: number;
  totalSets: number;
  renameWorkout(name: string): Promise<void>;
  discardWorkout(): Promise<void>;
  finishWorkout(): Promise<void>;
}
```

- [ ] **Step 1: Add behavior-parity tests**

Mock the repository and PowerSync query hooks. Cover loading to loaded render, first-incomplete selection, rename, discard order, rest visibility after completion, and local-only finish/navigation from TASK-23.1. Assert hooks are never conditional.

- [ ] **Step 2: Run tests and confirm they fail before extraction**

```bash
pnpm --filter @zor/mobile test:unit -- lib/__tests__/workout-session-repository.test.ts
pnpm --filter @zor/mobile test:components -- active-workout-session.test.tsx
```

- [ ] **Step 3: Extract repository and hook**

Move workout lookup, exercise/set grouping, previous-performance lookup, current active-set derivation, rename, ordered discard, and local finish orchestration into the new boundary. The repository owns SQL strings; the hook owns React query/state wiring. Keep the current peer-card rendering, timer behavior, and interactions unchanged in this task.

- [ ] **Step 4: Make `active.tsx` a thin coordinator**

Leave navigation and composition in the screen; consume the hook and pass commands to existing components. Reduce `active.tsx` below 300 lines. Do not begin focus-mode styling in this refactor commit.

- [ ] **Step 5: Verify and commit TASK-18**

```bash
pnpm --filter @zor/mobile test
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
test "$(wc -l < apps/mobile/app/workout/active.tsx)" -lt 300
```

```bash
git add apps/mobile/hooks/use-active-workout-session.ts apps/mobile/lib/workout-session-repository.ts apps/mobile/lib/__tests__/workout-session-repository.test.ts apps/mobile/components/workout/__tests__/active-workout-session.test.tsx apps/mobile/app/workout/active.tsx
git commit -m "refactor(mobile): extract active workout session"
```

Record verification and finalize TASK-18 through the Backlog CLI.

---

### Task 3: Build the pure focus, draft, rest, and finish domain (TASK-23.3)

**Files:**
- Create: `apps/mobile/lib/workout-focus-sequence.ts`
- Create: `apps/mobile/lib/workout-set-draft.ts`
- Create: `apps/mobile/lib/workout-rest-state.ts`
- Create: `apps/mobile/lib/workout-finish-summary.ts`
- Create: `apps/mobile/lib/workout-session-storage.ts`
- Create: `apps/mobile/lib/__tests__/workout-focus-sequence.test.ts`
- Create: `apps/mobile/lib/__tests__/workout-set-draft.test.ts`
- Create: `apps/mobile/lib/__tests__/workout-rest-state.test.ts`
- Create: `apps/mobile/lib/__tests__/workout-finish-summary.test.ts`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

**Core interfaces:**

```ts
export interface FocusSequenceEntry {
  setId: string;
  workoutExerciseId: string;
  supersetGroup: number | null;
  round: number | null;
  endsRound: boolean;
}

export function buildFocusSequence(
  exercises: WorkoutExerciseRow[],
  sets: SetRow[],
): FocusSequenceEntry[];

export function deriveNextFocus(
  sequence: FocusSequenceEntry[],
  completedSetIds: ReadonlySet<string>,
  persistedFocusId?: string | null,
  progressionAnchorId?: string | null,
): string | null;
```

- [ ] **Step 1: Test total deterministic focus ordering**

Cover normal order; duplicate exercise orders resolved by workout-exercise ID; duplicate set numbers resolved by set ID; completed/deleted sets; warm-ups before all non-warm-ups; working/drop/failure sets sorted together by `(set_number, set ID)`; two- and three-member supersets; noncontiguous legacy groups placed at the group's lowest `(order, ID)` position; uneven rounds; manual focus; scan-forward after out-of-order completion; wrap to the first incomplete set; and null after all sets complete.

- [ ] **Step 2: Implement the minimum focus functions and pass their tests**

Do not read time, storage, SQL, or React state in this module. Include `endsRound` so rest behavior does not reimplement superset ordering.

- [ ] **Step 3: Test suggestion and touched-draft rules**

Define controlled string drafts for weight, reps, and RPE with per-field `touched` flags. Test same-type/same-position previous-performance preference, fallback by type, database/template precedence, late-result protection, positive-integer reps validation, optional bodyweight, and parse behavior. Assert accepting an untouched suggestion changes controlled display state but emits no persistence patch until Complete.

- [ ] **Step 4: Test deadline-based rest state**

Use a pure reducer with `running { deadlineMs }`, `paused { remainingSeconds }`, and `idle`. Cover start, `-15`, `+15`, pause, resume, skip, expiry, restore before/after deadline, completing the next set while resting, and `endsRound` rules for normal and uneven-superset sequences.

- [ ] **Step 5: Test finish-summary distinctions**

`buildFinishSummary` must distinguish completed sets, incomplete database-backed/template values, touched unsaved drafts, and untouched suggestions. Verify duration, incomplete count, and the rule that untouched suggestions never count as entered data.

- [ ] **Step 6: Add device-local storage**

```bash
pnpm --filter @zor/mobile add @react-native-async-storage/async-storage
```

Store focus/rest under `workout-session:${userId}:${workoutId}` with a versioned JSON payload. Export load/save/clear functions that validate IDs and numeric deadlines before returning state. Favorites use `workout-favorites:${userId}` in Task 5. Do not put workout values, notes, or exercise identity into telemetry.

- [ ] **Step 7: Verify and commit the pure domain**

```bash
pnpm --filter @zor/mobile test:unit -- lib/__tests__/workout-focus-sequence.test.ts lib/__tests__/workout-set-draft.test.ts lib/__tests__/workout-rest-state.test.ts lib/__tests__/workout-finish-summary.test.ts
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

```bash
git add apps/mobile/lib/workout-focus-sequence.ts apps/mobile/lib/workout-set-draft.ts apps/mobile/lib/workout-rest-state.ts apps/mobile/lib/workout-finish-summary.ts apps/mobile/lib/workout-session-storage.ts apps/mobile/lib/__tests__/workout-focus-sequence.test.ts apps/mobile/lib/__tests__/workout-set-draft.test.ts apps/mobile/lib/__tests__/workout-rest-state.test.ts apps/mobile/lib/__tests__/workout-finish-summary.test.ts apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add workout focus domain"
```

---

### Task 4: Implement transactional focus-mode logging and UI (TASK-23.3)

**Files:**
- Create: `apps/mobile/lib/workout-session-mutations.ts`
- Create: `apps/mobile/lib/__tests__/workout-session-mutations.test.ts`
- Modify: `apps/mobile/hooks/use-active-workout-session.ts`
- Create: `apps/mobile/hooks/use-workout-finalization-status.ts`
- Create: `apps/mobile/components/workout/workout-session-header.tsx`
- Create: `apps/mobile/components/workout/focused-exercise-card.tsx`
- Create: `apps/mobile/components/workout/focused-set-editor.tsx`
- Create: `apps/mobile/components/workout/workout-queue.tsx`
- Create: `apps/mobile/components/workout/workout-action-dock.tsx`
- Create: `apps/mobile/components/workout/workout-empty-state.tsx`
- Create: `apps/mobile/components/workout/workout-finish-sheet.tsx`
- Create: `apps/mobile/components/workout/__tests__/focused-workout.test.tsx`
- Create: `apps/mobile/components/workout/__tests__/workout-action-dock.test.tsx`
- Modify: `apps/mobile/components/workout/rpe-picker.tsx`
- Modify: `apps/mobile/app/workout/active.tsx`
- Modify: `apps/mobile/app/workout/complete.tsx`
- Modify: `apps/mobile/App.tsx`

**Mutation interface:**

```ts
export interface ParsedSetDraft {
  weightKg: number | null;
  reps: number;
  rpe: number | null;
}

export function completeSetAtomic(
  db: WorkoutDatabase,
  setId: string,
  draft: ParsedSetDraft,
  restSeconds: number,
): Promise<void>;
```

- [ ] **Step 1: Test the final-keystroke transaction**

Use fake timers and a fake PowerSync transaction. Change the raw rep draft from `"8"` to `"9"` and invoke Complete without blur or advancing the 500ms debounce. Assert one transaction writes weight, reps `9`, RPE, rest target, and `completed = 1`. Assert pending debounces are canceled, a duplicate tap starts no second transaction, and transaction failure retains the draft/focus and starts no rest.

- [ ] **Step 2: Implement mutation helpers**

All set/exercise SQL leaves presentational components. Completion reads the synchronous draft ref, validates reps, cancels pending timers, and performs one `writeTransaction`. Retry is idempotent with the same parsed values. Add transactional commands for mark-incomplete, edit completed set, add/delete set, add warm-ups, rename, link/unlink superset, delete exercise, and move an exercise or contiguous superset block earlier/later. Clearing/deleting must remove a superset group left with fewer than two members.

- [ ] **Step 3: Implement controller state and failure timing**

Expose these separate values: `canonicalNextSetId`, `focusedSetId`, `editingCompletedSetId`, `progressionAnchorId`, `draftRef`, `savingState`, `undoState`, and `restState`. A two-second timer changes `savingState` to `slow`. At eight seconds, read the set back: matching values plus completed means success; otherwise expose Retry. Tag each attempt so late results from an earlier attempt cannot overwrite newer state.

Undo lasts five seconds in memory. It may mark the set incomplete and cancel its rest only when no later completion event occurred. Historical editing never replaces canonical focus. While a completed exercise is open, the action dock shows Return to Next Set instead of a hidden Complete action.

- [ ] **Step 4: Implement persisted rest and focus**

Persist after focus/rest transitions. Foreground countdown derives from `deadlineMs`; AppState resume recalculates rather than replaying missed ticks. An expired restored timer becomes idle without delayed haptics. Completing the next set deliberately replaces or clears the prior timer. Clear storage on finish/discard.

- [ ] **Step 5: Render the focus hierarchy**

Use `KeyboardAvoidingView` and a regular-layout dock that reserves bottom space; do not use an absolute overlay. The safe-area header shows cancel, editable/truncated name, elapsed time, semantic `done / total`, and stable `finish-button`. Exactly one exercise is expanded. The dock is the sole rendered Complete Set control and uses lime (`colors.blue`); cobalt/superset state uses `colors.green`, never `colors.purple` (cream in the current theme).

Use database-ID selectors:

- `focused-exercise-${workoutExerciseId}`
- `queue-exercise-${workoutExerciseId}`
- `set-weight-${setId}`
- `set-reps-${setId}`
- `set-rpe-${setId}`
- `complete-set-${setId}`

Keep `finish-button` and `add-exercise-button` stable.

- [ ] **Step 6: Add accessibility/component tests**

Test one expanded card, one enabled lime primary action, non-color current/completed labels, keyboard order Weight → Reps → Complete, 48dp targets, safe-area/dock spacing, Dynamic Type without hidden actions, reduced motion, screen-reader labels/announcements, completed-set editing/return mode, slow/retry states, and empty/offline/initial-hydration distinctions.

- [ ] **Step 7: Implement finish review and local completion**

Finish flushes only database-backed or touched draft fields. A flush failure remains in the workout. After success, show completed/incomplete counts, duration, Finish Anyway, and Return. Finishing updates the workout locally, clears focus/rest storage, and resets navigation to `WorkoutComplete { workoutId }`; it never calls `workout.complete`.

- [ ] **Step 8: Observe finalization on the completion screen**

`use-workout-finalization-status.ts` calls `trpc.workout.finalizationStatus.query({ workoutId })` only while foregrounded. Treat offline/network/temporarily missing server rows as local-complete/pending. Poll pending/processing every two seconds, failed every fifteen seconds because the server still retries, and stop after completed. Render stable `{ exerciseName, type, value }` results, syncing/delayed language, and no raw server error. Local stats remain usable in every state.

- [ ] **Step 9: Verify and commit focus mode**

```bash
pnpm --filter @zor/mobile test:unit -- lib/__tests__/workout-focus-sequence.test.ts lib/__tests__/workout-set-draft.test.ts lib/__tests__/workout-rest-state.test.ts lib/__tests__/workout-finish-summary.test.ts lib/__tests__/workout-session-mutations.test.ts
pnpm --filter @zor/mobile test:components -- focused-workout.test.tsx workout-action-dock.test.tsx
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

```bash
git add apps/mobile/lib/workout-session-mutations.ts apps/mobile/lib/__tests__/workout-session-mutations.test.ts apps/mobile/hooks/use-active-workout-session.ts apps/mobile/hooks/use-workout-finalization-status.ts apps/mobile/components/workout/workout-session-header.tsx apps/mobile/components/workout/focused-exercise-card.tsx apps/mobile/components/workout/focused-set-editor.tsx apps/mobile/components/workout/workout-queue.tsx apps/mobile/components/workout/workout-action-dock.tsx apps/mobile/components/workout/workout-empty-state.tsx apps/mobile/components/workout/workout-finish-sheet.tsx apps/mobile/components/workout/__tests__/focused-workout.test.tsx apps/mobile/components/workout/__tests__/workout-action-dock.test.tsx apps/mobile/components/workout/rpe-picker.tsx apps/mobile/app/workout/active.tsx apps/mobile/app/workout/complete.tsx apps/mobile/App.tsx
git commit -m "feat(mobile): add workout focus mode"
```

Finalize TASK-23.3 through the Backlog CLI.

---

### Task 5: Add the fast multi-select exercise picker (TASK-23.4)

**Files:**
- Create: `apps/mobile/lib/exercise-picker-state.ts`
- Create: `apps/mobile/lib/__tests__/exercise-picker-state.test.ts`
- Modify: `apps/mobile/lib/workout-session-mutations.ts`
- Modify: `apps/mobile/lib/__tests__/workout-session-mutations.test.ts`
- Modify: `packages/sync/src/hooks/use-exercises.ts`
- Modify: `packages/sync/src/index.ts`
- Create: `packages/sync/src/__tests__/exercise-query.test.ts`
- Create: `apps/mobile/components/workout/exercise-multi-picker.tsx`
- Create: `apps/mobile/components/workout/__tests__/exercise-multi-picker.test.tsx`
- Modify: `apps/mobile/app/workout/add-exercise.tsx`
- Modify: `apps/mobile/App.tsx`

- [ ] **Step 1: Test picker state before UI**

Use ordered `selectedExerciseIds`. Cover selection persistence across search/view/filter changes, one occurrence per batch, duplicate-existing-workout exercise allowed, Recent ordering, device-local favorite toggling, filter badge count, initial hydration, offline, true no-results, and query failure.

- [ ] **Step 2: Expose the full local exercise library**

Extract/test the SQL query builder in `use-exercises.ts`. Preserve the existing default limit for current callers, but add an explicit full-library option for the picker. Search, muscle, equipment, and category compose with deterministic `(name, id)` ordering.

- [ ] **Step 3: Test and implement atomic multi-add**

```ts
export function addExercisesAtomic(
  db: WorkoutDatabase,
  workoutId: string,
  selectedExerciseIds: string[],
): Promise<{ firstWorkoutExerciseId: string; firstSetId: string }>;
```

Inside one `writeTransaction`, query `COALESCE(MAX("order"), 0)`, insert workout exercises at distinct sequential orders in selection order, and insert one incomplete working set per exercise. Test gaps in existing order, rollback on the second insert, an existing duplicate exercise, a duplicate ID rejected within the batch, and returned first IDs.

- [ ] **Step 4: Build the safe-area picker**

Replace hard-coded colors with the theme. Render one safe-area header/close control, auto-focused search, Recent/Favorites/All views, a filter sheet with muscle/equipment and active count, selection state, equipment/muscle/last-performance metadata, and a sticky `Add N Exercises` action. Selections survive list/query changes and a failed commit.

Use `exercise-option-${exerciseId}` selectors. On success, call `navigation.popTo("WorkoutActive", { workoutId, requestedFocusSetId: firstSetId }, { merge: true })` once. Extend the active route type and controller to validate/focus that requested set.

- [ ] **Step 5: Add empty-workout shortcuts**

The empty state shows Add Exercise first, up to three locally derived recent exercises, then Choose Template. A recent shortcut uses the same atomic helper. Add and test `hydrateEmptyWorkoutFromTemplateAtomic` in `workout-session-mutations.ts`; choosing a template hydrates the existing empty workout and must not create a second incomplete workout. Task 6 reuses this helper from the centralized start flow.

- [ ] **Step 6: Verify and commit the picker**

```bash
pnpm --filter @zor/sync test -- exercise-query.test.ts
pnpm --filter @zor/mobile test:unit -- lib/__tests__/exercise-picker-state.test.ts lib/__tests__/workout-session-mutations.test.ts
pnpm --filter @zor/mobile test:components -- exercise-multi-picker.test.tsx
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

```bash
git add apps/mobile/lib/exercise-picker-state.ts apps/mobile/lib/__tests__/exercise-picker-state.test.ts apps/mobile/lib/workout-session-mutations.ts apps/mobile/lib/__tests__/workout-session-mutations.test.ts packages/sync/src/hooks/use-exercises.ts packages/sync/src/index.ts packages/sync/src/__tests__/exercise-query.test.ts apps/mobile/components/workout/exercise-multi-picker.tsx apps/mobile/components/workout/__tests__/exercise-multi-picker.test.tsx apps/mobile/app/workout/add-exercise.tsx apps/mobile/App.tsx
git commit -m "feat(mobile): add workout exercise multi-picker"
```

Finalize TASK-23.4 through the Backlog CLI.

---

### Task 6: Unify workout start and resume entry points (TASK-23.5)

**Files:**
- Create: `apps/mobile/lib/workout-entry-state.ts`
- Create: `apps/mobile/lib/workout-start.ts`
- Create: `apps/mobile/lib/__tests__/workout-entry-state.test.ts`
- Create: `apps/mobile/lib/__tests__/workout-start.test.ts`
- Create: `apps/mobile/components/workout/workout-entry-card.tsx`
- Create: `apps/mobile/components/workout/__tests__/workout-entry-card.test.tsx`
- Modify: `packages/sync/src/hooks/use-workouts.ts`
- Modify: `packages/sync/src/index.ts`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/App.tsx`
- Modify: `apps/mobile/components/layout/new-session-sheet.tsx`
- Modify: `apps/mobile/components/workout/template-picker.tsx`
- Modify: `apps/mobile/components/onboarding/first-workout-tutorial.tsx`
- Modify: `apps/mobile/app/program/index.tsx`

**Entry priority:** newest active workout → today's scheduled template → first-workout guidance → unscheduled start.

- [ ] **Step 1: Test the state resolver**

Cover every priority state, offline/no-schedule fallback, and multiple incomplete rows. The active query is exactly `completed_at IS NULL ORDER BY started_at DESC, id DESC LIMIT 1`; older incomplete workouts remain untouched.

- [ ] **Step 2: Add the active-workout hook and scheduled resolver**

Export `useLatestIncompleteWorkout` from the sync package. Extract the program screen's week/day schedule math into `workout-entry-state.ts` so Dashboard and Program interpret today's template identically. Cache only the last successful scheduled descriptor needed for entry; do not cache health values.

- [ ] **Step 3: Centralize local workout creation/hydration**

`workout-start.ts` exports transaction helpers for empty creation, template creation, and hydrating an already-created empty workout. Template exercise/set insertion is one local transaction. Hydration first verifies the target workout is still incomplete and empty, then updates its name/template ID and inserts the graph. Test rollback and duplicate-active confirmation paths.

- [ ] **Step 4: Replace competing dashboard cards**

Render one `WorkoutEntryCard`. Move the three concise first-workout steps inside its first-workout variant and remove the separate tutorial panel. Active state shows Continue, name, elapsed time, and completed/total set count. Scheduled state starts the resolved template; unscheduled starts empty. Keep `next-up-hero` as the stable semantic selector.

- [ ] **Step 5: Make the global action state-aware**

When active, the workout row in `NewSessionSheet` says Continue Workout and is primary. Starting another workout is secondary and requires confirmation. Without an active workout, preserve template/empty choice. Both Home and FAB call the shared transaction helpers; no duplicate creation loops remain.

- [ ] **Step 6: Verify and commit entry unification**

```bash
pnpm --filter @zor/mobile test:unit -- lib/__tests__/workout-entry-state.test.ts lib/__tests__/workout-start.test.ts
pnpm --filter @zor/mobile test:components -- workout-entry-card.test.tsx
pnpm --filter @zor/sync test
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

```bash
git add apps/mobile/lib/workout-entry-state.ts apps/mobile/lib/workout-start.ts apps/mobile/lib/__tests__/workout-entry-state.test.ts apps/mobile/lib/__tests__/workout-start.test.ts apps/mobile/components/workout/workout-entry-card.tsx apps/mobile/components/workout/__tests__/workout-entry-card.test.tsx packages/sync/src/hooks/use-workouts.ts packages/sync/src/index.ts 'apps/mobile/app/(tabs)/index.tsx' apps/mobile/App.tsx apps/mobile/components/layout/new-session-sheet.tsx apps/mobile/components/workout/template-picker.tsx apps/mobile/components/onboarding/first-workout-tutorial.tsx apps/mobile/app/program/index.tsx
git commit -m "feat(mobile): unify workout start and resume"
```

Finalize TASK-23.5 through the Backlog CLI.

---

### Task 7: Repair deterministic Android device verification (TASK-23.8)

**Files:**
- Modify: `apps/mobile/scripts/nightly-e2e.sh`
- Create: `apps/mobile/scripts/nightly-e2e-wait.sh`
- Create: `docker/docker-compose.e2e.yml`
- Create: `packages/db/scripts/reset-mobile-e2e.ts`
- Modify: `packages/db/package.json`
- Modify: `apps/mobile/e2e/workout-empty.yaml`
- Modify: `apps/mobile/e2e/active-workout-redesign.yaml`
- Modify: `apps/mobile/e2e/workout-template.yaml`
- Modify: `apps/mobile/e2e/workout-warmup.yaml`
- Create: `apps/mobile/e2e/workout-focus-superset.yaml`
- Create: `apps/mobile/e2e/workout-focus-edit.yaml`
- Create: `apps/mobile/e2e/workout-focus-recovery.yaml`
- Create: `apps/mobile/e2e/workout-focus-offline.yaml`
- Create: `apps/mobile/e2e/workout-focus-partial-finish.yaml`
- Create: `apps/mobile/e2e/workout-focus-picker.yaml`

- [ ] **Step 1: Make the runner fail honestly**

Use `set -euo pipefail`, the actual `/home/ubuntu/dev/Zor` checkout, and an APK path supplied by `E2E_APK` with the current default `.e2e-build/zor-e2e.apk`. Abort on unreachable device, backend-health exhaustion, install failure, main-suite failure, or smoke failure. Preserve reports while returning the failing exit code. The wrapper `nightly-e2e-wait.sh` waits for the scheduled device window and then `exec`s the maintained runner so the existing cron entry points to a real file.

- [ ] **Step 2: Isolate backend and fixture state**

The compose override sets API `POWERSYNC_URL` to the device-reachable E2E PowerSync URL and runs the `sync` profile under a dedicated compose project. `reset-mobile-e2e.ts` resolves only `test@example.com`, deletes that user's workout graph, and re-seeds deterministic templates/exercises without touching other users. Run it before every stateful workout flow group. Tear down only the dedicated E2E compose project/volumes.

- [ ] **Step 3: Build the real app artifact**

Use `EXPO_PUBLIC_E2E=1` plus the E2E API URL and `apps/mobile/scripts/build-android.sh`; never use bare `E2E=1`, which selects the fake `App.e2e.tsx` path. Verify the installed package matches `com.zor.app.e2e` from `app.config.ts` and the artifact was built from the implementation commit under test.

- [ ] **Step 4: Replace stale selectors and complete the nine flows**

Use stable semantic IDs for global actions and database-ID selectors for reorderable workout entities. Cover:

1. Empty → multi-add → immediate final-keystroke completion → rest → finish.
2. Template → accepted prior values → rapid repeated sets.
3. Three-member/uneven superset and rest after each round.
4. Completed-set edit and conditional Undo.
5. Background/resume and process restart during edit/rest.
6. Kill/relaunch and Continue newest incomplete workout.
7. Stop the dedicated API/PowerSync services while retaining ADB, complete offline, relaunch, restart services, and observe one finalized result.
8. Partial finish with entered and untouched sets.
9. Picker keyboard, views, filters, selection persistence, and an induced initial-library failure.

- [ ] **Step 5: Enforce the small-screen gate**

Before the suite, record `adb shell wm size` and `adb shell wm density`. Use an emulator/device or an ADB display override whose calculated width is 360–412dp, record the calculation in TASK-23.8 notes, and restore `adb shell wm size reset` in the cleanup trap. The connected ~448dp Pixel may supplement but cannot replace this run.

- [ ] **Step 6: Verify runner behavior**

Intentionally make one copied flow fail and assert the runner exits nonzero; then restore it and run the suite successfully. Verify the scheduled wrapper invokes the same script and reports directory.

```bash
E2E_DEVICE=100.69.203.52:5555 E2E_APK=/home/ubuntu/dev/Zor/apps/mobile/.e2e-build/zor-e2e.apk bash apps/mobile/scripts/nightly-e2e.sh
```

- [ ] **Step 7: Commit test infrastructure**

```bash
git add apps/mobile/scripts/nightly-e2e.sh apps/mobile/scripts/nightly-e2e-wait.sh docker/docker-compose.e2e.yml packages/db/scripts/reset-mobile-e2e.ts packages/db/package.json apps/mobile/e2e
git commit -m "test(mobile): verify workout focus mode on device"
```

Finalize TASK-23.8 through the Backlog CLI.

---

### Task 8: Run release-level verification (TASK-23.6)

**Files:**
- Modify only defects found within TASK-23-owned files.
- Record evidence in TASK-23.6 and each owning subtask through the Backlog CLI.

- [ ] **Step 1: Run all automated checks fresh**

Start the disposable PostgreSQL container and export `ZOR_FINALIZATION_TEST_DB_URL` exactly as documented in Task 7 of `2026-08-09-workout-completion-finalization.md`; never run the API integration suites against a shared database.

```bash
pnpm --filter @zor/mobile test:unit
pnpm --filter @zor/mobile test:components
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
pnpm --filter @zor/sync test
pnpm exec tsc -p packages/sync/tsconfig.json --noEmit
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/api test -- workout.test.ts sync.test.ts workout-finalization.test.ts
pnpm --filter @zor/web test -- src/components/workout/__tests__/active-workout.test.tsx src/components/workout/__tests__/workout-draft-registry.test.ts src/app/api/cron/workout-finalizations/__tests__/route.test.ts
```

- [ ] **Step 2: Run Android evidence on the fresh artifact**

Run the repaired suite on a verified 360–412dp target. Save JUnit output, build commit, APK checksum, device model/API/dp size, backend profile, and exact pass/fail count in TASK-23.6 notes.

- [ ] **Step 3: Exercise accessibility manually on Android**

Verify TalkBack order/labels, largest supported font scale, reduced motion, keyboard/dock behavior, safe-area spacing, and 48dp targets. Record failures against the owning task; do not waive them silently.

- [ ] **Step 4: Execute or record the iOS gate**

Run the same keyboard, safe-area, VoiceOver, Dynamic Type, reduced-motion, background, and finish flows through an available macOS/EAS runner. If no runner is available, leave the iOS criterion explicitly open/manual and link TASK-15 status; do not claim iOS automation from this ARM Linux host.

- [ ] **Step 5: Reconcile every acceptance criterion**

Stop the disposable database with `docker stop zor-finalization-test-db`. Read `backlog instructions task-finalization`. Map objective evidence to every TASK-23.1–TASK-23.8 and parent TASK-23 criterion. Finalize each completed child first, then TASK-23.6, then the parent. Leave TASK-24 To Do because metrics are intentionally non-gating.
