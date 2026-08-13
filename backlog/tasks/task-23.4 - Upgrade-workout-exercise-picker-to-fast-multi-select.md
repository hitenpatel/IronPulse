---
id: TASK-23.4
title: Upgrade workout exercise picker to fast multi-select
status: Done
assignee: []
created_date: '2026-08-09 03:28'
updated_date: '2026-08-13 01:29'
labels:
  - mobile
  - ux
  - workout
  - product
milestone: m-0
dependencies:
  - TASK-23.3
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: enhancement
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the workout add-exercise modal with a safe-area-aware multi-select picker that uses local exercise data and minimizes repeated modal trips during workout setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The picker provides Recent, device-local Favorites, and All views with composable search, muscle, and equipment filters
- [x] #2 Selections persist while search, filters, and views change
- [x] #3 A single local transaction adds all selected exercises and initial sets in selection order or rolls back all changes
- [x] #4 An exercise already in the workout can be selected again, while one batch contains each exercise ID at most once
- [x] #5 The picker returns once and focuses the first newly added exercise
- [x] #6 Initial hydration, offline, no-results, and failure states are distinct and the header never overlaps system safe areas
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 4 commits (3b2bc03, 1f94647, bf2ab66, 29eadac): pure filter/dedupe/favorites-store helpers + useRecentExercises PowerSync hook; addExercisesAtomic repository writeTransaction batch; ExerciseMultiPicker screen rewrite with Recent|Favorites|All views and composable search/muscle/equipment filters; requestedFocusSetId nav param + FocusModeComposer seeding for post-picker focus jump. Vitest 303 (>266), Jest 55 (>31), tsc 0 errors.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Multi-select picker with Recent/Favorites/All views. Composable search + muscle + equipment filters. Selection state persists across view/filter/search changes. Atomic addExercisesAtomic wraps all workout_exercises + initial exercise_sets inserts in one writeTransaction — partial failure rolls back the whole batch (test asserts zero rows landed after a mid-batch throw). Same exercise ID can be added across separate picker opens (creates second row); within a batch, second tap deselects. Add returns once with requestedFocusSetId payload; FocusModeComposer jumps focus to the first newly added exercise's first set. Distinct hydration/offline/no-results/failure states; safe-area padded header.
<!-- SECTION:FINAL_SUMMARY:END -->
