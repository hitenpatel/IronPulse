---
id: TASK-18
title: Extract mobile active workout session controller
status: Done
assignee: []
created_date: '2026-07-24 05:59'
updated_date: '2026-08-13 00:33'
labels:
  - agent-suggested
  - mobile
  - tech-debt
milestone: m-0
dependencies:
  - TASK-23.2
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/418'
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
priority: high
type: chore
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Behavior-preserving prerequisite for Focus Mode. The high-churn active-workout screen currently owns PowerSync queries, SQL mutations, focus, timing, navigation, and rendering. Extract a testable session controller and repository boundary before the visual redesign; keep the existing peer-card UX unchanged in this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The existing active-workout behavior is preserved while query/state orchestration moves into a dedicated session hook and SQL moves into a repository boundary
- [x] #2 apps/mobile/app/workout/active.tsx is a thin coordinator below 300 lines
- [x] #3 Hook invocation is unconditional and dependencies are complete, with no circular dependency introduced
- [x] #4 Pure and React Native component tests cover loading, first-incomplete selection, rename, discard, rest visibility, and local-only finish/navigation
- [x] #5 The full mobile test command and mobile TypeScript check exit successfully
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Shipped in 3 commits (876bc8b, 9da51ec, 197b2ec): workout-session-repository.ts (renameWorkout, discardWorkout) + 4 vitest tests; useActiveWorkoutSession hook (all queries, derivations, callbacks); active.tsx rewritten as thin coordinator at 243 lines. 8 Jest RN component tests for loading, first-incomplete active-set, rename, discard, rest visibility, local-only finish/navigation. Behavior preserved — visual + navigation identical.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted active-workout screen into apps/mobile/hooks/use-active-workout-session.ts (session controller) + apps/mobile/lib/workout-session-repository.ts (SQL boundary). active.tsx is now 243 lines of thin coordinator (rendering + local UI state only). Session hook wraps PowerSync queries, first-incomplete derivation, and all callbacks (rename, discard, add-exercise, finish). Repository owns SQL with focused vitest tests. Component tests cover loading, active-set selection, rename, discard, rest visibility, and local finish/navigation. All gates green: mobile 187 vitest, 8 jest (2 files), tsc 0 errors.
<!-- SECTION:FINAL_SUMMARY:END -->
