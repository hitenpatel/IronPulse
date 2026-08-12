---
id: TASK-24
title: Measure mobile workout logging efficiency
status: To Do
assignee: []
created_date: '2026-08-09 03:29'
updated_date: '2026-08-09 04:14'
labels:
  - mobile
  - telemetry
  - workout
dependencies:
  - TASK-23.6
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
priority: low
type: enhancement
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After focus mode is verified, measure whether the released flow improves workout-start and set-completion efficiency without collecting exercise identity or health values. This task is informative and does not block TASK-23 release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Instrumentation records anonymous timestamps needed to calculate Start or Continue to first completed set
- [ ] #2 Instrumentation records anonymous foreground interaction counts per completed set while excluding text-entry keystrokes
- [ ] #3 Events contain no weights, reps, RPE, exercise identity, notes, or other health data
- [ ] #4 A before-and-after report distinguishes new and returning athletes only when privacy-safe cohort data is available
<!-- AC:END -->
