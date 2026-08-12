---
id: TASK-11
title: 'feat(watch): workout history list view on Apple Watch'
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - agent-ready
  - feature
  - mobile
  - watch
milestone: m-1
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/385'
priority: medium
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #385: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/385

Parent: #368 (Apple Watch companion app — broken into scoped sub-issues)
Depends on: WatchKit target scaffold (feat(watch): scaffold WatchKit app target)

## Why
First user-visible feature of the Watch app: display recent workouts sourced from HealthKit so users can glance at their history from their wrist.

## Acceptance criteria
- [ ] Watch app main screen lists the 10 most recent workouts from HealthKit: workout name, date, duration
- [ ] HealthKit read permission for `HKWorkoutType` is requested on first launch; graceful empty state if denied
- [ ] Uses the existing HealthKit integration in `apps/mobile/lib/` — no new auth or credential handling added
- [ ] Empty state shown when no HealthKit workouts are present
- [ ] Unit test for the HealthKit data-fetch function using a mocked `HKHealthStore`

## Out of scope
- Active/in-progress workout tracking (next sub-issue)
- Exercise-level detail (sets, reps, weight) — top-level workout summary only
- Writing data back to IronPulse servers or HealthKit
<!-- SECTION:DESCRIPTION:END -->
