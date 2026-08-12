---
id: TASK-23.7
title: Restore mobile unit and component test baseline
status: To Do
assignee: []
created_date: '2026-08-09 03:50'
updated_date: '2026-08-09 04:20'
labels:
  - mobile
  - test
dependencies:
  - TASK-23.1
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: chore
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore a trustworthy local test foundation before focus-mode UI implementation. The current full mobile Vitest run and TypeScript command fail, and Vitest only includes pure lib tests, so required state and React Native component tests cannot yet gate changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The full mobile Vitest unit suite exits successfully with the current notification, Google Fit, and HealthKit collection failures resolved without weakening runtime guards
- [ ] #2 The documented mobile TypeScript command uses a compatible project configuration and exits successfully
- [ ] #3 Mobile test scripts execute both pure library tests and React Native component tests without weakening production transforms
- [ ] #4 A React Native Testing Library harness supports accessibility, keyboard, hierarchy, safe-area, and reduced-motion tests
- [ ] #5 The component-test configuration has a passing focused smoke fixture and the starting failure evidence is recorded
<!-- AC:END -->
