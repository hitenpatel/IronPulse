---
id: TASK-23.4
title: Upgrade workout exercise picker to fast multi-select
status: To Do
assignee: []
created_date: '2026-08-09 03:28'
updated_date: '2026-08-12 15:48'
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
- [ ] #1 The picker provides Recent, device-local Favorites, and All views with composable search, muscle, and equipment filters
- [ ] #2 Selections persist while search, filters, and views change
- [ ] #3 A single local transaction adds all selected exercises and initial sets in selection order or rolls back all changes
- [ ] #4 An exercise already in the workout can be selected again, while one batch contains each exercise ID at most once
- [ ] #5 The picker returns once and focuses the first newly added exercise
- [ ] #6 Initial hydration, offline, no-results, and failure states are distinct and the header never overlaps system safe areas
<!-- AC:END -->
