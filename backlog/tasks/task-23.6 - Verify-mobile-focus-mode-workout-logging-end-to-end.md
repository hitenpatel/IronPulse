---
id: TASK-23.6
title: Verify mobile focus-mode workout logging end to end
status: To Do
assignee: []
created_date: '2026-08-09 03:28'
updated_date: '2026-08-09 04:14'
labels:
  - mobile
  - test
  - workout
dependencies:
  - TASK-23.1
  - TASK-23.2
  - TASK-23.3
  - TASK-23.4
  - TASK-23.5
  - TASK-23.7
  - TASK-23.8
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-workout-completion-finalization.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: task
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Provide release-level evidence that the focus-mode workout flow remains correct across input timing, supersets, offline completion, interruption, accessibility, and supported devices.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Unit tests cover focus ordering, untouched suggestions, immediate completion flush, Undo, rest restoration, and completion finalization
- [ ] #2 Component tests cover hierarchy, keyboard flow, safe-area spacing, accessibility labels, Dynamic Type, reduced motion, and picker state
- [ ] #3 Android device flows pass for empty, template, superset, editing, background, process restart, offline completion, partial finish, and picker failure cases
- [ ] #4 iOS checks pass through an available macOS or EAS runner, or are recorded as an explicit manual release gate with TASK-15 status
- [ ] #5 Existing stable Maestro identifiers are preserved and new reorderable entities use database-ID-based identifiers
- [ ] #6 Regression evidence is recorded against every TASK-23 acceptance criterion before the parent task is finalized
<!-- AC:END -->
