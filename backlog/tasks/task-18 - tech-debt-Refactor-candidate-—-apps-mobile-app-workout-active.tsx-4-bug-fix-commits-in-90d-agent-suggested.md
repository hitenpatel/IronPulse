---
id: TASK-18
title: Extract mobile active workout session controller
status: To Do
assignee: []
created_date: '2026-07-24 05:59'
updated_date: '2026-08-12 15:48'
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
- [ ] #1 The existing active-workout behavior is preserved while query/state orchestration moves into a dedicated session hook and SQL moves into a repository boundary
- [ ] #2 apps/mobile/app/workout/active.tsx is a thin coordinator below 300 lines
- [ ] #3 Hook invocation is unconditional and dependencies are complete, with no circular dependency introduced
- [ ] #4 Pure and React Native component tests cover loading, first-incomplete selection, rename, discard, rest visibility, and local-only finish/navigation
- [ ] #5 The full mobile test command and mobile TypeScript check exit successfully
<!-- AC:END -->
