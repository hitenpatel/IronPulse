---
id: TASK-23.5
title: Unify mobile workout start and resume entry points
status: To Do
assignee: []
created_date: '2026-08-09 03:28'
updated_date: '2026-08-09 04:20'
labels:
  - mobile
  - ux
  - dashboard
  - workout
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
- [ ] #1 Home shows one workout card that becomes Continue Workout for the newest row matching completed_at IS NULL ordered by started_at DESC, id DESC
- [ ] #2 The global action prioritizes the same active workout and requires confirmation before starting another
- [ ] #3 The first-workout guidance is contained within the single start card rather than rendered as a competing panel
- [ ] #4 The empty-workout screen offers Add Exercise first, then recent exercises and templates as secondary shortcuts
- [ ] #5 Empty and template workout creation or hydration is transactional and never creates a second incomplete workout accidentally
- [ ] #6 Older incomplete workouts are preserved and no new multi-workout recovery manager is introduced
- [ ] #7 Tests cover scheduled, unscheduled, first-workout, active-workout, offline, multiple-incomplete-record, rollback, and duplicate-active-confirmation states
<!-- AC:END -->
