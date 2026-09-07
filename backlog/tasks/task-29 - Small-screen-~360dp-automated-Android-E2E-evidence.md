---
id: TASK-29
title: Small-screen (~360dp) automated Android E2E evidence
status: To Do
assignee: []
created_date: '2026-09-07 08:51'
labels:
  - mobile
  - e2e
dependencies: []
priority: medium
type: chore
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The nightly Maestro suite runs on the shared Pixel 9 Pro XL at native density (448dp). The app claims ~360-450dp phone support, but the narrow end has no automated evidence: the 360-412dp density-override gate was removed on 2026-09-07 because overriding wm density on the owner's daily driver is unsafe (a killed job strands it) and does not test the device as shipped. Provide real small-screen coverage: an arm64 Android emulator image on the runner, a second physical ~360dp device, or a Maestro run in a cloud device farm.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A nightly or on-demand Maestro run exercises the main suite at an effective width of 360-412dp on an emulator or device, without changing the Pixel's display settings
- [ ] #2 Results publish to e2e.hiten-patel.co.uk alongside the 448dp run, labelled with the device dp
<!-- AC:END -->
