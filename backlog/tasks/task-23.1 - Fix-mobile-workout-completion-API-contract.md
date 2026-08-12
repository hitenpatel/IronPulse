---
id: TASK-23.1
title: Remove unsafe mobile completion side call
status: Done
assignee:
  - '@claude'
created_date: '2026-08-09 03:27'
updated_date: '2026-08-12 16:25'
labels:
  - mobile
  - workout
  - api
  - product
milestone: m-0
dependencies: []
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-workout-completion-finalization.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: bug
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mobile PowerSync finish path writes completion locally and then makes a malformed direct completion request. Correcting that request would create a worse ordering race by allowing server finalization to outrun queued exercise and set uploads. Remove the redundant request, keep completion local-first, and navigate with workoutId only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mobile finish writes completed_at and duration_seconds in one local PowerSync transaction and only updates an incomplete workout
- [x] #2 The helper reads back and returns the canonical stored completion values, including on replay, and fails if the workout row is missing
- [x] #3 The PowerSync finish path never invokes workout.complete directly
- [x] #4 WorkoutComplete navigation carries workoutId only and does not serialize stale or mismatched PR data
- [x] #5 A failed local transaction preserves the active workout and does not navigate
- [x] #6 Focused tests cover timestamp/duration derivation, replay readback, transaction failure, and absence of a network completion mutation
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Follow the pre-existing plan doc docs/superpowers/plans/2026-08-09-workout-completion-finalization.md — Task 1 (lines 25-113). Summary:

1. Failing test: create apps/mobile/lib/__tests__/workout-local-completion.test.ts asserting completeWorkoutLocally(db, {workoutId,startedAt,completedAt}) writes UPDATE workouts SET completed_at, duration_seconds WHERE id=? AND completed_at IS NULL, reads back canonical values, returns {completedAt, durationSeconds}, and rejects when the row is missing. Also create workout-no-direct-completion.test.ts: static regression guard reading active.tsx and asserting neither workout.complete.mutate nor requestWorkoutCompletion appears.

2. Run failing test — expect missing-module failure.

3. Implement apps/mobile/lib/workout-local-completion.ts: db.writeTransaction, clamp duration to nonneg int, guarded UPDATE, in-txn readback, throw if row missing.

4. Edit apps/mobile/app/workout/active.tsx: await the helper then router.push WorkoutComplete with {workoutId} only. Delete direct tRPC completion call, catch, as any, and serialized prs param.

5. Edit apps/mobile/app/workout/complete.tsx: remove route-param PR parser, keep local duration/volume/set/exercise summary, render neutral 'Records will appear after syncing' status until finalization-status integration lands (TASK-23.2+).

6. Edit App.tsx: update WorkoutComplete route params type to {workoutId: string}.

7. Verify: pnpm --filter @zor/mobile test -- lib/__tests__/workout-local-completion.test.ts lib/__tests__/workout-no-direct-completion.test.ts — expect exit 0. Project-wide tsc is repaired by TASK-23.7, do not gate on it here.

8. Commit scoped to those 6 files: fix(mobile): keep workout completion on PowerSync path
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation complete. Added apps/mobile/lib/workout-local-completion.ts with in-txn readback and guarded UPDATE. Rewired apps/mobile/app/workout/active.tsx handleFinish to call the helper, removed the direct trpc.workout.complete.mutate call, catch block, and prs serialization. Simplified apps/mobile/app/workout/complete.tsx by removing PR route-param parsing, confetti, haptics-on-PR, and rendering a neutral 'Records will appear after syncing' status. Updated App.tsx WorkoutComplete route params type to {workoutId: string}. Verified with pnpm --filter @zor/mobile test -- lib/__tests__/workout-local-completion.test.ts lib/__tests__/workout-no-direct-completion.test.ts — 8/8 passing.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the unsafe direct workout.complete RPC from the mobile PowerSync finish path. Completion now lives in a single local writeTransaction that guards on completed_at IS NULL, reads back canonical stored values, and throws on missing row. active.tsx awaits the helper and only navigates on success (failed transaction preserves the active workout). complete.tsx no longer parses a prs route param; renders a neutral post-sync status pending TASK-23.2 finalization integration. WorkoutComplete route params narrowed to {workoutId: string}. Verified with 8 passing unit + static-regression tests (pnpm --filter @zor/mobile test).
<!-- SECTION:FINAL_SUMMARY:END -->
