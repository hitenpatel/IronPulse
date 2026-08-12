# Mobile Focus-Mode Workout Logging — Design Specification

**Date:** 2026-08-09
**Status:** Approved design, revision 3 prepared for final cross-model review
**Related backlog:** TASK-23 (this design), TASK-18 (required active-screen refactor)

## Summary

Refine Zor's native mobile workout flow around a single question: **what should the athlete do next?** The active workout remains a flexible, full-workout logger, but only the current exercise and next set receive primary visual emphasis. Completed and upcoming work stays available in a compact queue. Set completion, rest timing, exercise selection, offline recovery, and session resumption form one continuous loop.

This is a UX refinement, not a new workout model or a broad mobile redesign. It keeps the existing dark acid-sport identity, PowerSync data model, templates, warm-ups, set types, RPE, supersets, and out-of-order editing.

## Problem

The current active-workout screen renders all exercises as peer cards and uses decorative progress dots. This preserves flexibility but makes the athlete scan the screen to determine the next action. The empty workout state is mostly blank, and the add-exercise flow is single-select, visually inconsistent with the current design system, and susceptible to safe-area/header overlap.

Several technical details also undermine a fast interaction loop:

- Weight and rep edits are debounced independently, so completing immediately after typing can race pending writes.
- Rest-timer state is component-local and interval-based, so it cannot recover accurately after backgrounding or termination.
- The completion RPC is best-effort but is not currently backed by a durable, server-owned finalization record; PowerSync only queues its own table changes.
- The current completion call site does not match the API's `workoutId` / `newPRs` contract.
- `apps/mobile/app/workout/active.tsx` owns querying, mutations, focus, timing, navigation, and rendering, overlapping the structural concerns tracked by TASK-18.

## Goals

1. Render exactly one expanded current exercise and one filled primary next action during normal logging.
2. Let a repeated set be completed with one tap when prior values are acceptable.
3. Keep weight, reps, RPE, rest, and the next action reachable without unnecessary scrolling or keyboard dismissal.
4. Preserve whole-workout visibility and intentional out-of-order logging.
5. Make empty-workout setup and multi-exercise selection materially faster.
6. Preserve local logging, finishing, and resumption when offline or interrupted.
7. Measure whether the flow reduces time and interaction cost rather than relying on subjective polish.

## Non-goals

- A guided one-set-per-screen mode.
- Redesigning Stats, Profile, Goals, Sleep, Nutrition, or the overall tab structure.
- Recommending exercises, generating workouts, or changing training-program logic.
- Apple Watch workout logging (TASK-12).
- Cross-device synchronization of exercise favorites in the first release; favorites are device-local initially.
- A configurable between-exercise timer for supersets. The first release advances immediately within a superset and starts normal rest after the round.
- Simultaneous editing of one active workout on multiple devices. PowerSync's existing last-write-wins behavior remains; server finalization is still idempotent across devices.
- A new multi-workout recovery manager. The most recent incomplete workout is offered for resumption; older incomplete records are preserved and remain accessible through existing history surfaces.
- Closing TASK-18 automatically. TASK-18 is implemented and verified before TASK-23.3 because its controller extraction is a prerequisite for the Focus Mode UI work.

## Success measures

Compare a representative period before and after release using two lightweight measures:

- Median time from tapping Start/Continue to the first completed set.
- Median foreground taps per completed set, excluding text-entry keystrokes.

Instrumentation is a separate, non-blocking backlog item and does not gate the UX release. It must not include entered weights, reps, exercise notes, exercise identity, or other health data.

## Design principles

### One primary action

Only the immediate next action uses a filled lime treatment. Lime is not used simultaneously for multiple large surfaces.

### Focus without lock-in

The app proposes the next set but never prevents the athlete from selecting, editing, reordering, or completing another set.

### Local truth first

Logging and finishing depend on successful local persistence, not connectivity. Remote side effects are asynchronous and observable without blocking the session.

### Progressive density

The current work is expanded. Completed and upcoming work compress into scannable rows and expand on demand.

## End-to-end flow

```text
Home or global +
  ├─ unfinished workout → Continue Workout
  └─ no unfinished workout
       ├─ scheduled workout / recent template
       └─ Start Empty Workout
             ↓
Active workout
  ├─ empty → Add Exercise / recent / templates
  └─ populated → focused exercise + next set
                         ↓ Complete Set
                  local transaction succeeds
                         ↓
              rest dock + next-set preview
                         ↓
              next set / next superset member
                         ↓
                       Finish
                         ↓
        local completion summary immediately
                         ↓
       durable server finalization after sync
```

## Dashboard and session entry

The dashboard has one workout card whose state changes rather than stacking competing cards:

| State | Primary card |
|---|---|
| No active workout, scheduled session | Scheduled workout with **Start** |
| No active workout, no schedule | **Start Workout** with recent-template shortcuts |
| First-ever workout | Start card with three concise guidance steps inside it |
| Active workout | **Continue Workout** with name, elapsed time, and completed/total sets |

The center `+` sheet follows the same state rule. If a workout is active, Continue is primary. Starting another workout remains available behind a secondary action and requires confirmation, preventing accidental duplicate active sessions.

An active workout is the newest row matching `completed_at IS NULL`, ordered by `started_at DESC, id DESC`. If multiple incomplete workouts already exist, only the newest is offered as Continue in this scope. Older records are preserved and never deleted automatically.

## Active workout screen

### 1. Compact session header

The safe-area-aware sticky header contains:

- Close/cancel.
- Editable workout name.
- Elapsed time derived from `started_at`.
- Semantic set progress such as `4 / 15` instead of decorative fixed-count dots.
- Finish.

Finish stays visible while the keyboard is open. Closing still asks before discarding the workout. The header does not grow when the name wraps; long names truncate and remain editable.

### 2. Focused exercise

Only one exercise card is expanded by default. It contains:

- Exercise name, equipment, superset badge, and overflow actions.
- Completed sets as compact editable rows.
- One prominent active-set editor.
- Remaining future sets as subdued single-line rows.
- Secondary Add Set and Add Warm-up actions.

The active-set editor shows:

- Set number and type.
- Previous comparable performance.
- Large weight and rep inputs with persistent unit labels.
- Optional RPE.
- A clear visual association with the dock's thumb-friendly **Complete Set** action.

Weight is optional so bodyweight work remains valid. Focus-mode completion introduces a positive-integer reps rule for newly completed strength sets even though the legacy shared mutation schema currently permits zero. Existing zero-rep records remain visible and editable and are never silently rewritten; aligning every non-mobile mutation path is follow-up validation work. RPE remains optional. The app does not introduce duration/distance strength sets in this scope.

### 3. Workout queue

Exercises outside the current focus render as collapsed queue cards with:

- Name and equipment.
- Completed/total set count.
- Completed, current, upcoming, or superset state.
- A compact summary of the next planned values when available.

Tapping an incomplete exercise intentionally changes `focusedSetId` while the derived `canonicalNextSetId` remains available for recovery. Tapping a completed exercise sets a temporary `editingCompletedSetId`/viewed exercise without changing either incomplete-set pointer. Exactly one exercise card stays expanded: while historical editing is open, the dock replaces Complete Set with **Return to Next Set** and never presents a completion action for a hidden editor. Reordering and destructive actions live in the exercise overflow/menu rather than competing with the logging controls.

### 4. Persistent action dock

The bottom safe-area-aware dock owns the contextual primary action:

- Active set ready: Complete Set.
- Resting: countdown, `−15`, `+15`, Pause/Resume, and Skip.
- Rest expired: brief Rest Complete state and next-set cue.
- Historical completed-set editing: Return to Next Set.
- No exercises: Add Exercise.

The dock is the sole rendered Complete Set control; the focused editor does not duplicate it. It reserves layout space rather than covering the final list rows, and it moves above the keyboard without obscuring the focused fields.

## Deterministic focus order

The session controller builds a total, stable focus sequence from exercise `order`, `superset_group`, set type, and `set_number`. Because the database does not currently enforce unique order values, exercise ties sort by workout-exercise ID and set-number ties sort by set ID:

1. For a normal exercise, incomplete warm-ups sort first by `(set_number, set ID)`, followed by all incomplete non-warm-up sets sorted by the same key, before the next exercise.
2. Superset membership is every exercise sharing the same non-null `superset_group`. Members are sorted by `(exercise order, workout-exercise ID)`; no separate A/B field is assumed.
3. Linking and reordering maintain contiguous superset members. If legacy or concurrently edited data is non-contiguous, the group occupies its lowest `(order, ID)` position and all group members are processed there before intervening normal exercises.
4. Incomplete superset warm-ups come first in member order; each member's warm-ups sort by `(set_number, set ID)`.
5. Each member's non-warm-up sets—working, drop, or failure—sort together by `(set_number, set ID)` and are interleaved by ordinal round: A1, B1, A2, B2, and so on. Uneven set counts are allowed; missing members are skipped.
6. Completed sets never become canonical focus.
7. A manual incomplete-set selection creates a temporary focus override. After completion, progression scans forward from that set's position in the full stable sequence; if no later incomplete set exists, it wraps to the first incomplete set. If none exists, focus is null and Finish becomes the next session action.

The controller exposes `canonicalNextSetId`, `focusedSetId`, and `editingCompletedSetId` separately. Persist only `focusedSetId` in device-local active-session UI state. On restore, validate that it still exists and is incomplete; otherwise use `canonicalNextSetId`. Historical editing is intentionally transient. Database contents remain the source of truth for workout completion.

## Draft initialization and keyboard behavior

When an incomplete set with null fields first receives focus, the editor may present local suggestions from the most recent completed workout for the same exercise:

1. Prefer the same set type and set-number position.
2. Fall back to the most recent completed set of the same type.
3. Existing database values and template targets always take precedence.
4. Each field tracks whether the athlete has touched it. A late previous-performance result may populate only an untouched, still-null field and can never overwrite typing.

Suggested values live only in controlled editor state until the athlete edits or explicitly completes the set. Before that completion, untouched suggestions are not written to PowerSync, do not count as entered data in the finish summary, and are recomputed after process termination. Pressing Complete explicitly accepts the displayed suggestion and includes it in the atomic set-completion transaction; the bulk Finish flush never accepts suggestions for incomplete sets. Once the athlete edits a field, normal local persistence resumes.

Keyboard progression is Weight → Reps → Complete. The editor stores the latest raw field strings in a synchronous draft ref as well as render state. Completing a set cancels pending debounces, parses that ref, and writes those exact weight, rep, RPE, rest-target, and `completed = 1` values in one local transaction. A test must change a field and press Complete without blur or timer advancement, then assert the database contains the final keystroke.

Rapid completion taps are disabled while the transaction is in flight. If it has not resolved after two seconds, the dock reports “Still saving”; after eight seconds it reads the set back before offering an idempotent Retry. On success, use a light haptic and announce completion to assistive technology. On confirmed failure, keep the inputs and focus intact and do not start rest.

## Completion, Undo, and editing

After successful completion:

- The row collapses and the next focus becomes visible.
- An Undo affordance remains available for five seconds.
- Undo reopens the set and cancels its rest state only if no later set has been completed.
- After the Undo window, tapping any completed row still permits editing or marking it incomplete.

Editing a historical completed row does not automatically move focus away from the canonical next set. Marking it incomplete makes it eligible the next time focus order is derived.

## Rest behavior

Use the set's `rest_seconds` when present, otherwise the user's `defaultRestSeconds`. At completion, store the chosen rest target on the set.

For normal exercises, rest begins after each completed working set. For a superset, focus advances immediately through each exercise in the current round and normal rest begins after the final available member. Warm-up behavior follows the same group order but does not introduce a new between-exercise setting.

Persist rest UI state under a per-workout device key containing:

- Triggering set ID.
- Absolute deadline when running.
- Remaining seconds when paused.
- Paused/running state.

Foreground countdown derives from the deadline rather than decrementing component state as its source of truth. On restore, an expired timer is dismissed and the next set is focused; the app does not attempt a delayed haptic for a timer that expired while terminated. Clear persisted timer/focus state on finish or discard.

The next set remains visible and editable during rest. Rest controls never gate logging; Skip or completing the next set can dismiss/replace the current timer deliberately.

## Empty workout state

Replace the blank canvas with:

1. Full-width **Add Exercise** primary action.
2. Up to three recent exercises as secondary shortcuts.
3. A Choose Template link when templates exist.

Recent exercises are derived locally from the user's completed workouts. Choosing a shortcut inserts the exercise and its first set, then focuses it. Empty, offline, and first-sync states remain distinguishable; the screen never displays “syncing” as the only useful content.

## Exercise multi-picker

The picker uses one safe-area-aware in-screen header, fixing the current overlapping modal title. Search receives initial focus without covering the close action.

### Views and filtering

- **Recent:** exercises ordered by recent use from local workout history.
- **Favorites:** device-local starred exercise IDs, usable offline. The UI labels this behavior in settings/help; cross-device favorite sync is deferred.
- **All:** complete local exercise library.
- Muscle and equipment live behind one filter button with an active-count badge.

Search and filters compose. Selected exercises stay selected when the query or view changes. Rows show name, equipment, target muscle, last performance where available, and selection state.

### Multi-select commit

A sticky action reads `Add Exercise` or `Add N Exercises`. On press, one local transaction:

1. Re-reads the current maximum exercise order.
2. Inserts selected workout exercises in selection order with distinct sequential positions.
3. Inserts the first incomplete set for each exercise.
4. Rolls back the entire selection if any insert fails.

The picker then returns once and focuses the first newly added exercise. Preserve current duplicate-exercise behavior: an exercise already present in the workout remains selectable and creates another workout-exercise row. A single multi-select batch can contain an exercise ID only once.

PowerSync-local results render immediately. Use skeleton rows only during initial database hydration, a real no-results message for a completed empty query, and an offline indicator without disabling search.

## Finish flow and incomplete sets

Finish first flushes only database-backed values and fields the athlete actually touched; it never persists untouched local suggestions. If that local transaction fails, remain in the workout with drafts intact and do not show a finish summary or navigate. After a successful flush, if any incomplete set contains entered data or any planned set remains incomplete, show a concise summary:

- Completed and incomplete set counts.
- Duration.
- **Finish anyway** primary action.
- Return to workout secondary action.

Empty untouched sets are skipped, not silently marked completed. Local finalization writes `completed_at` and `duration_seconds`, clears device-local focus/rest state, and navigates to the completion summary immediately.

Remote PR detection, feed creation, achievements, and notifications are second-phase side effects owned by the server. A durable completion-finalization record keyed by workout ID is a hard prerequisite for TASK-23, not an optional enhancement.

Both the direct completion RPC used by non-PowerSync server/web flows and the PowerSync server path that first observes `workouts.completed_at` register the same finalization record. Web clients operating in PowerSync mode follow the local completion/status-observation path and must not call the direct RPC. The record stores the first completion timestamp and has a unique workout ID, processing state, attempt metadata, next-attempt time, and processed timestamp. A retry never overwrites the original `completed_at` or duration.

The finalizer claims pending or stale records and makes each logical side effect idempotent with stable deduplication keys. Database effects and their durable markers commit together; external notifications use one durable outbox intent keyed by workout, effect type, and recipient. Repeated calls or concurrent devices therefore cannot duplicate PR, feed, achievement, in-app-notification, or outbox records. Push-provider delivery is explicitly at-least-once: an ambiguous provider timeout can still produce a duplicate device notification because the provider exposes no end-to-end idempotency key.

Registration attempts to process immediately when its workout graph is ready. The connector uploads each PowerSync CRUD transaction through one atomic server endpoint, preserving operation order inside the batch. The server applies the complete batch in one database transaction, then registers any newly completed workout after every exercise/set operation in that batch is visible. PowerSync delivers local CRUD transactions in sequence, so earlier transactions have already been acknowledged before the completion batch is accepted. Connector and API integration tests must prove both guarantees, including a completion transaction that also flushes the active set's final keystroke. Legacy single-operation sync endpoints remain compatible, but the focus-mode client uses the atomic batch endpoint. A server-side sweep retries pending/stale records so finalization does not depend on the device that completed the workout reconnecting.

The final mobile flow writes completion locally and observes a `workout.finalizationStatus({ workoutId })` query for `pending`, `processing`, `completed`, or `failed` plus `newPRs`; it does not race a second completion mutation against the PowerSync queue. Direct non-PowerSync completion continues to use `workout.complete({ workoutId, completedAt? })`, which returns the same stable result. The existing mobile `{ id }` / `prs` mismatch is removed first by deleting the redundant direct call and navigating with `workoutId` only. It must not be “fixed” by shipping a correctly shaped second mutation, because that request can outrun queued set/exercise uploads and finalize an incomplete graph.

The completion summary distinguishes:

- Finalized results with PR callouts.
- Locally complete / syncing, with stats available and PRs pending.
- Finalization delayed or failed, with server-owned retry status.

Remote failure never reopens or loses the locally completed workout. It may delay PR/feed/notification results, which the completion summary labels honestly.

## Component and state boundaries

`apps/mobile/app/workout/active.tsx` becomes a thin screen coordinator. Proposed boundaries:

| Unit | Responsibility |
|---|---|
| `useActiveWorkoutSession` | Queries, derived focus sequence, manual override, atomic mutations, finish state |
| `workout-focus-sequence` | Pure deterministic normal/superset ordering |
| `WorkoutSessionHeader` | Cancel, editable name, elapsed time, semantic progress, Finish |
| `FocusedExerciseCard` | Current exercise, controlled set editor, validation, and keyboard chain; exposes draft state to the dock command |
| `WorkoutQueue` / `WorkoutQueueItem` | Compact non-focused exercises and explicit focus selection |
| `WorkoutActionDock` | Complete plus deadline-based persisted rest/rest-complete states |
| `ExerciseMultiPicker` | Search, views, filters, durable selection, atomic insertion |
| Server completion finalizer | Durable registration, idempotent effects, outbox, and retry sweep |

Each stateful hook exposes explicit state and commands. Presentational components do not issue SQL directly. This centralizes mutation ordering and makes the high-risk transitions testable without rendering the whole screen.

## Visual language

Retain the current dark palette and type families with stricter semantics:

- Electric lime: one primary action, active set, selected state.
- Cobalt: links, informational data, and superset grouping.
- Warm off-white: primary text and completed values.
- Amber: warnings and offline/pending attention.
- Red: destructive actions and errors.

The focused card uses a subtle lime edge or marker rather than a large lime fill. Completed rows use muted text plus a persistent check. Upcoming rows use neutral surfaces. Avoid nested cards where spacing and a divider communicate the relationship.

Use mono/tabular numerals for weight, reps, elapsed time, and rest countdown. Interactive text remains at least 15–17pt; uppercase eyebrow text is metadata only. Units remain visible when fields contain values.

## Accessibility and ergonomics

- Minimum 48dp interactive targets.
- Dynamic Type layouts remain usable without hiding Complete or Finish.
- Screen-reader labels include exercise, set position, value, unit, completion state, and the next action.
- Set completion and rest updates use polite announcements; errors interrupt only when action is required.
- Color is never the sole indicator of focus, completion, warning, or selection.
- Focus transitions and dock animation respect reduced-motion settings.
- Weight and rep keyboards expose appropriate decimal/integer input and explicit next/done actions.
- Header, keyboard, dock, and modal use shared safe-area values on Android and iOS.

## Error and recovery behavior

| Failure | Behavior |
|---|---|
| Set transaction fails | Preserve drafts and focus; inline Retry; no rest/focus advance |
| Multi-add transaction fails | Roll back all inserts; preserve selections; Retry |
| Local database unavailable | Blocking error state with retry/reinitialize path; never imply a set saved |
| App backgrounds mid-edit | Controlled drafts remain visible; persisted database values restore after termination |
| App terminates during rest | Restore from deadline/paused state if still relevant |
| PowerSync offline | Continue local logging; show compact offline state |
| Server finalization pending | Show local summary with PRs pending; poll status while foregrounded while the server retries durably |
| Authentication becomes invalid | Preserve local data; PowerSync/server finalization remains authoritative after re-authentication |
| Focused set deleted remotely/locally | Validate ID and derive next incomplete set |
| Exercise library unavailable on first sync | Explain that initial library data is unavailable and provide Retry; do not show false no-results |

## Testing strategy

### Pure/unit tests

- Normal focus ordering and manual override.
- Superset round-robin ordering, uneven groups, warm-ups, drop sets, and deleted sets.
- Local suggestion precedence, touched-field protection, and no PowerSync write for untouched suggestions.
- Atomic completion flush and duplicate-tap guard.
- Undo before/after later completion.
- Running, paused, adjusted, expired, backgrounded, and restored rest state.
- Incomplete-set finish summary rules.
- Completion-finalizer claiming, stable timestamp, crash recovery, concurrency, and side-effect deduplication.

### Component tests

- Expanded/collapsed hierarchy and exactly one primary lime action.
- Keyboard Weight → Reps → Complete flow.
- Dock avoids keyboard and reserves list space.
- Dynamic Type, screen-reader labels, and reduced motion.
- Picker selection survives search/filter/view changes.
- Empty, first-sync, offline, no-results, and failure states.

### Device-level flows

Run the automated Android flows on a verified 360–412dp target over ADB/Tailscale, using a safe display override or another device/emulator when the connected ~448dp Pixel is the only hardware available. Run iOS flows through an available macOS/EAS runner when one is configured; until then, iOS is an explicit manual release gate rather than a claim this ARM server can verify automatically.

1. Start empty → multi-add exercises → log → rest → finish.
2. Start template → accept previous values → complete repeated sets quickly.
3. Log a superset with uneven set counts.
4. Edit and undo completed sets.
5. Background and resume during edit and rest.
6. Kill and relaunch with an unfinished workout.
7. Complete fully offline, relaunch, reconnect, and receive side-effect results once.
8. Finish with partial and untouched sets.
9. Exercise picker with keyboard, filters, and initial-sync failure.

Existing Maestro identifiers should remain stable where their semantics have not changed. New IDs should use database IDs rather than list indexes where reordering can make index-based selectors unstable.

## Acceptance criteria

1. Normal logging renders exactly one expanded current exercise and one filled lime primary action; focus and completion also have non-color indicators.
2. A set with accepted prior values can be completed in one action.
3. Changing weight or reps and immediately pressing Complete—without blur or debounce advancement—stores the final typed value and `completed = 1` in the same local transaction.
4. Completed and upcoming exercises remain accessible without equal visual emphasis.
5. Rest and focus survive backgrounding; relevant state restores after termination.
6. Supersets use group ID plus exercise order, advance round-robin across uneven set counts, skip missing members, and start normal rest after each completed round.
7. The empty workout and multi-picker avoid repeated modal trips for common setup.
8. The active session can be resumed from Home and the global action.
9. Local logging and finishing work offline; a server-owned finalization record retries after sync and concurrent/repeated processing cannot duplicate logical database/outbox effects or change the original completion time. Push delivery retains documented at-least-once semantics.
10. Keyboard, safe-area, Dynamic Type, screen-reader, and reduced-motion checks pass on Android; the same iOS checks pass through an available macOS/EAS runner or remain an explicit manual release gate.
11. Automated tests cover the core start, log, rest, edit, resume, and finish transitions.
12. A separate optional instrumentation task can compare time-to-first-set and taps-per-set without collecting health or exercise values; it does not gate TASK-23.

## Follow-up design opportunities

Keep these separate from TASK-23 so the workout refinement stays reviewable:

- Standardize duplicate headers and safe areas on Goals, Sleep, Nutrition, and Progress Photos.
- Reframe Profile as Profile plus a clearer More/settings hierarchy.
- Replace misleading no-data trends on Stats with evidence-aware empty states.
- Synchronize exercise favorites across devices.
- Offer an optional short transition timer between superset exercises.
