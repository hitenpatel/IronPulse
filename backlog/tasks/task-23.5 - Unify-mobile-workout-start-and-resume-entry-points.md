---
id: TASK-23.5
title: Unify mobile workout start and resume entry points
status: Done
assignee:
  - claude-agent
created_date: '2026-08-09 03:28'
updated_date: '2026-08-13 01:51'
labels:
  - mobile
  - ux
  - dashboard
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
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Give Home and the global new-session action one state-aware workout entry so athletes start or resume without competing calls to action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home shows one workout card that becomes Continue Workout for the newest row matching completed_at IS NULL ordered by started_at DESC, id DESC
- [x] #2 The global action prioritizes the same active workout and requires confirmation before starting another
- [x] #3 The first-workout guidance is contained within the single start card rather than rendered as a competing panel
- [x] #4 The empty-workout screen offers Add Exercise first, then recent exercises and templates as secondary shortcuts
- [x] #5 Empty and template workout creation or hydration is transactional and never creates a second incomplete workout accidentally
- [x] #6 Older incomplete workouts are preserved and no new multi-workout recovery manager is introduced
- [x] #7 Tests cover scheduled, unscheduled, first-workout, active-workout, offline, multiple-incomplete-record, rollback, and duplicate-active-confirmation states
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 4 commits (9193936..8f2a84b): useLatestIncompleteWorkout PowerSync hook (SELECT ... WHERE completed_at IS NULL ORDER BY started_at DESC, id DESC LIMIT 1) as single source of truth; startEmptyWorkoutAtomic + startWorkoutFromTemplateAtomic + DuplicateActiveWorkoutError typed error; unified WorkoutEntryCard replaces Home hero + tutorial; NewSessionSheet state-aware with Continue row; empty-workout state prioritises Add Exercise + Recent/Templates chips. Vitest 328 (+25), Jest 69 (+14), tsc 0, active.tsx 86 lines.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Unified workout start + resume through a single query hook and atomic repository helpers. Home + NewSessionSheet both consume useLatestIncompleteWorkout and render 'Continue Workout' when the newest incomplete row exists. Empty state offers Add Exercise first, then Recent + Templates. Repository writeTransaction wraps SELECT-then-INSERT so a concurrent second start throws DuplicateActiveWorkoutError with the existing id; UI catches and prompts Alert.alert(Keep Active | Start New destructive). First-workout guidance rendered inline in the entry card, no competing panel. Older incomplete rows preserved; no recovery manager. 25 vitest + 14 jest cover scheduled/unscheduled/first/active/offline/multi-incomplete/rollback/duplicate paths.
<!-- SECTION:FINAL_SUMMARY:END -->
