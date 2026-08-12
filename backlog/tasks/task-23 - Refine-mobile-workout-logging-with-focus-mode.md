---
id: TASK-23
title: Refine mobile workout logging with focus mode
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-09 03:04'
updated_date: '2026-08-09 04:34'
labels:
  - mobile
  - ux
  - workout
dependencies: []
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-workout-completion-finalization.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
priority: high
type: enhancement
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the mobile active-workout experience faster and clearer by centering the current exercise and next set while preserving access to the complete workout. The refinement should retain the existing Mettle Lift visual identity, offline-first behavior, supersets, warm-ups, RPE, editing, and flexible workout order.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Normal logging renders exactly one expanded current exercise and one filled lime primary action with a non-color focus indicator
- [ ] #2 Changing a set value and immediately pressing Complete persists the final typed values and completed state in one local transaction
- [ ] #3 Completed and upcoming work remains accessible, including out-of-order editing, warm-ups, RPE, supersets, and exercise reordering
- [ ] #4 Focus and deadline-based rest state recover correctly after backgrounding or process termination
- [ ] #5 Empty-workout setup and the multi-select picker add common exercise groups without repeated modal trips
- [ ] #6 Home and the global action resume the newest incomplete workout instead of accidentally creating another
- [ ] #7 Offline finishing registers durable server finalization after sync without duplicate logical effects or a second PowerSync-path completion RPC
- [ ] #8 Keyboard, safe-area, Dynamic Type, screen-reader, reduced-motion, and minimum touch-target checks satisfy the documented Android gate and explicit iOS gate
- [ ] #9 Automated and device evidence covers the nine release flows in the approved specification
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Execute in dependency order: TASK-23.1 → TASK-23.7 → TASK-23.2 → TASK-18 → TASK-23.3 → TASK-23.4 → TASK-23.5 → TASK-23.8 → TASK-23.6. Claude is the implementation assignee for this initiative and makes scoped commits from the dated handoff. Reviewers are chosen by the user; Codex reviews only when requested. TASK-24 remains optional and non-gating.
<!-- SECTION:PLAN:END -->
