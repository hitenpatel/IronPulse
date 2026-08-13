---
id: TASK-23.3
title: Build focus-mode active workout screen
status: Done
assignee: []
created_date: '2026-08-09 03:28'
updated_date: '2026-08-13 00:51'
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
- [x] #1 Normal logging renders exactly one expanded current exercise and one filled lime primary action with non-color state indicators
- [x] #2 Focus order is total and deterministic for normal exercises and group-ID-based supersets, including duplicate order values, uneven rounds, mixed non-warm-up types, and non-contiguous legacy groups
- [x] #3 Previous-performance suggestions remain unsynced until explicitly edited or accepted by Complete and never overwrite a touched field
- [x] #4 Immediate completion stores the final typed values and completed state in one local transaction without requiring blur or debounce
- [x] #5 Completed and upcoming exercises remain accessible, and intentional out-of-order focus, historical editing, and conditional Undo are preserved
- [x] #6 Rest timing uses a persisted deadline or paused remainder, starts at the documented normal/superset boundaries, and restores correctly after backgrounding or termination
- [x] #7 Finish flushes only database-backed or touched draft fields, aborts on local failure, and never persists untouched suggestions for incomplete sets
- [x] #8 Header, queue, editor, and action dock remain usable with the keyboard, safe areas, Dynamic Type, screen readers, reduced motion, and 48dp targets
- [x] #9 The completion screen shows local stats immediately and foreground-polls durable finalization status without issuing a second completion mutation
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 3 commits (fbd0b25, 99173e0, b5cab40): pure focus/draft/rest/finish domain in apps/mobile/lib/ with 79 new vitest tests; focus-mode UI (FocusModeComposer + editor + queue + rest timer) with 23 new Jest RN component tests; active.tsx swapped from peer-card FlatList to FocusModeComposer (84 lines, was 243). Focus order: sort by (order, id), group supersets at earliest-member anchor, warmups first then working sets round-robin across superset members. Rest timer: monotonic deadlineMs persisted to AsyncStorage under workout-session:{userId}:{workoutId}, restored via AppState foreground EXPIRE recalculation. Gates: mobile 266 vitest, 31 jest, tsc 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Focus-mode logger replaces peer-weighted exercise cards. Exactly one expanded current exercise + one filled lime primary action per plan. Pure domain (computeFocusOrder + draft + rest reducer + finish planner) covers total deterministic ordering for supersets/duplicates/uneven-rounds/mixed-types/non-contiguous legacy groups. Previous-performance suggestions render but never persist without explicit touch or Complete accept. Immediate completion writes final typed values in one local writeTransaction. Rest deadline is a monotonic absolute timestamp persisted per user+workout, restored correctly after background/termination. Finish planner flushes only DB-backed or touched draft fields; aborts on failure; never persists untouched suggestions for incomplete sets. Completed and upcoming exercises stay accessible; historical editing + conditional Undo preserved. Header/queue/editor/action-dock keyboard-safe, safe-area padded, Dynamic Type friendly, 48dp targets, reduced-motion respected. complete.tsx already renders local stats immediately + polls finalizationStatus (AC #9 satisfied since TASK-23.2 Slice E).
<!-- SECTION:FINAL_SUMMARY:END -->
