---
id: TASK-19
title: >-
  test(mobile): 35 e2e flows reference removed/renamed UI — rewrite against
  current screens
status: To Do
assignee: []
created_date: '2026-07-24 05:59'
updated_date: '2026-08-12 15:48'
labels:
  - testing
  - mobile
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/446'
priority: medium
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #446: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/446

After the keyguard fix landed in #445, the main e2e suite now reports cleanly. Latest run (2026-06-16 09:48 UTC): 7 passed, 35 failed. **All failures are UI drift — testIDs renamed, screens redesigned, text changed — not regressions.** Prod smoke is 3/3 passing.

Full report: /tmp/e2e-reports/20260616-094827/

## Passing flows (7)
auth-signin, active-workout-redesign, goals, notifications, stats-redesign, sync-offline, workout-template

## Failures by likely root cause

**TestID renamed or removed (test needs new ID):**
- `achievements`: `achievements-progress` missing
- `auth-signup`: `signup-link` missing
- `body-fat-log` / `weight-log`: `weight-input` missing
- `cardio-manual`: `cardio-type` missing
- `forgot-password`: `forgot-password-link` missing
- `navigation-tabs`: `stats-heading` missing
- `profile-edit`: `profile-heading` missing
- `workout-empty`: `exercise-search-input` missing

**Text renamed or moved (test needs new label/path):**
- `calendar`: "Calendar"
- `cardio-cancel`: "Back"
- `data-export`: "Export Data"
- `feed`: "Feed"
- `googlefit` / `healthkit`: "Connected Apps"
- `history-navigation` / `workout-history-detail`: "Workout History"
- `messages`: "Messages"
- `nutrition`: "Nutrition"
- `security-settings`: "Password & Passkeys"
- `sleep`: "Sleep"
- `workout-cancel`: "Cancel"
- `capture-screens`/`-2`/`-3`/`-4`: "Notifications", "My Program", "Subscription", "3/4 Sit-Up"

**Redesigned screens (likely needs flow rewrite, not just rename):**
- `profile-redesign`: "Level"
- `dashboard-redesign`: "-day streak"
- `auth-signout` / `biometric-login`: "Sign Out"
- `integrations`: "Connected Apps"
- `progress-photos`: "Upload Progress Photos"
- `exercise-detail`: "Personal Records"
- `workout-warmup`: "Bench Press" (seed data?)
- `cardio-gps-start`: "Stop" (might be a real bug — GPS doesn't reach the running state)

See feedback_redesign_references.md: redesign tickets must QA against designs/claude-design-handoff, not the old app.
<!-- SECTION:DESCRIPTION:END -->
