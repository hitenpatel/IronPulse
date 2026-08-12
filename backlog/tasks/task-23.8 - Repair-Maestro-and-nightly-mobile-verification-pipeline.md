---
id: TASK-23.8
title: Repair Maestro and nightly mobile verification pipeline
status: To Do
assignee: []
created_date: '2026-08-09 03:52'
updated_date: '2026-08-09 04:20'
labels:
  - mobile
  - test
  - e2e
dependencies:
  - TASK-23.3
  - TASK-23.4
  - TASK-23.5
  - TASK-23.7
documentation:
  - docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md
  - docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md
  - docs/handoffs/2026-08-09-mobile-workout-focus-mode-claude.md
parent_task_id: TASK-23
priority: high
type: chore
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make device-level workout verification deterministic and failure-sensitive after the focus-mode UI lands. Current Maestro selectors and flows are stale, the nightly script points at obsolete checkout and artifact names, and the connected large Android device cannot provide the required small-screen evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Maestro workout flows use current database-ID-based selectors and deterministic seeded workout state
- [ ] #2 The nightly runner uses the IronPulse checkout and current APK and bundle identifiers and exits nonzero on missing artifact, backend-health, install, smoke, or suite failure
- [ ] #3 The scheduled nightly entrypoint exists and invokes the maintained runner and report location
- [ ] #4 The E2E stack uses an isolated PowerSync/backend profile and resets only the designated test user's workout graph
- [ ] #5 A fresh real-app Android artifact is exercised on a verified 360–412dp target; the connected larger device may supplement but not replace small-screen evidence
- [ ] #6 Offline tests preserve ADB control by stopping the isolated backend services rather than severing Wi-Fi or Tailscale
- [ ] #7 The runner is proven to fail on an intentionally broken copied flow and all nine repaired workout flows then pass
- [ ] #8 iOS remains an explicit macOS or EAS release gate until an automated runner is available
<!-- AC:END -->
