---
id: TASK-12
title: 'feat(watch): active workout view and HealthKit sync on Apple Watch'
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
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/386'
priority: medium
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #386: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/386

Parent: #368 (Apple Watch companion app — broken into scoped sub-issues)
Depends on: workout history list view sub-issue

## Why
Closes the core Watch UX loop: while a workout is active on iPhone, the user sees live progress on their wrist and can mark sets complete from the watch.

## Acceptance criteria
- [ ] When a workout is active in the iOS app, the Watch app shows an in-progress view: current exercise name, current set number, elapsed timer
- [ ] Tapping "Done" on the watch sends a WatchConnectivity message to the iOS app to mark the current set complete
- [ ] On workout end (from either device), a HealthKit workout sample is written with correct start/end time and active calorie data
- [ ] Round-trip verified: start workout on iOS simulator → watch simulator shows live data; mark set done on watch → iOS app reflects it
- [ ] Unit tests for WatchConnectivity message handling on both ends

## Out of scope
- Starting a brand-new workout from the watch (separate feature)
- Complications / glances
- Apple Watch Series < 4 / watchOS < 10
<!-- SECTION:DESCRIPTION:END -->
