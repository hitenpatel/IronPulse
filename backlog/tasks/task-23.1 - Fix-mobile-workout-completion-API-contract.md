---
id: TASK-23.1
title: Remove unsafe mobile completion side call
status: To Do
assignee: []
created_date: '2026-08-09 03:27'
updated_date: '2026-08-09 04:20'
labels:
  - mobile
  - workout
  - api
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
- [ ] #1 Mobile finish writes completed_at and duration_seconds in one local PowerSync transaction and only updates an incomplete workout
- [ ] #2 The helper reads back and returns the canonical stored completion values, including on replay, and fails if the workout row is missing
- [ ] #3 The PowerSync finish path never invokes workout.complete directly
- [ ] #4 WorkoutComplete navigation carries workoutId only and does not serialize stale or mismatched PR data
- [ ] #5 A failed local transaction preserves the active workout and does not navigate
- [ ] #6 Focused tests cover timestamp/duration derivation, replay readback, transaction failure, and absence of a network completion mutation
<!-- AC:END -->
