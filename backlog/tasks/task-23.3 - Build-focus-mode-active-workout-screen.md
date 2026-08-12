---
id: TASK-23.3
title: Build focus-mode active workout screen
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
  - TASK-18
  - TASK-23.1
  - TASK-23.2
  - TASK-23.7
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: enhancement
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace peer-weighted exercise cards with a focus-mode logger that emphasizes one current exercise and one next set while preserving full-workout access, offline writes, supersets, set types, editing, and rest controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Normal logging renders exactly one expanded current exercise and one filled lime primary action with non-color state indicators
- [ ] #2 Focus order is total and deterministic for normal exercises and group-ID-based supersets, including duplicate order values, uneven rounds, mixed non-warm-up types, and non-contiguous legacy groups
- [ ] #3 Previous-performance suggestions remain unsynced until explicitly edited or accepted by Complete and never overwrite a touched field
- [ ] #4 Immediate completion stores the final typed values and completed state in one local transaction without requiring blur or debounce
- [ ] #5 Completed and upcoming exercises remain accessible, and intentional out-of-order focus, historical editing, and conditional Undo are preserved
- [ ] #6 Rest timing uses a persisted deadline or paused remainder, starts at the documented normal/superset boundaries, and restores correctly after backgrounding or termination
- [ ] #7 Finish flushes only database-backed or touched draft fields, aborts on local failure, and never persists untouched suggestions for incomplete sets
- [ ] #8 Header, queue, editor, and action dock remain usable with the keyboard, safe areas, Dynamic Type, screen readers, reduced motion, and 48dp targets
- [ ] #9 The completion screen shows local stats immediately and foreground-polls durable finalization status without issuing a second completion mutation
<!-- AC:END -->
