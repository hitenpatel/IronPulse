---
id: TASK-19
title: >-
  test(mobile): 35 e2e flows reference removed/renamed UI — rewrite against
  current screens
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-24 05:59'
updated_date: '2026-09-07 20:59'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Rewrote the 35 stale flows against current screens; merged to main as c8d9cf3 (36 files: 27 flow YAMLs, 9 app/component files).

Selectors were derived from the current screen source rather than guessed, and nine missing testIDs were added to components so flows stop matching fragile copy: profile-heading (app/(tabs)/profile.tsx:310), stats-heading (via a new TopBar testID prop), exercises-heading and exercises-search-input, signup-link and forgot-password-link (app/(auth)/login.tsx), cancel-workout-button (components/workout/workout-session-header.tsx:71), cardio-type (app/cardio/summary.tsx:126), cardio-picker-close (app/cardio/type-picker.tsx:103).

Several flows needed a real rewrite, not a rename: profile-edit (Profile no longer has edit fields — the journey now goes through Settings), cardio-cancel (Back only clears the selection; the close control is a separate button), workout-cancel (Cancel is icon-only and raises a native Alert), nutrition and sleep (log forms are collapsed behind a toggle by default), history-navigation and workout-history-detail (the Profile row was renamed to Records, so the flow now enters from the dashboard View all link).

Verification so far is static only: tsc --noEmit clean apart from one pre-existing TS7016 error, all 54 flow YAMLs parse, every selector grep-verified against source, apps/mobile vitest 340 passed and jest 69 passed. No device commands were run — the shared Pixel is owned by another process. The real gate is the nightly Maestro run; do not treat the acceptance criteria as met until that reports.

Three flows need a human decision rather than a rewrite, tracked as TASK-31: body-fat-log.yaml and weight-log.yaml test a body-weight/body-fat logging UI that no longer exists anywhere in the app, healthkit.yaml cannot pass on the Android-only shared device because Apple Health is filtered out by platform, and workout-focus-offline-verify.yaml still taps the stale 'Workout History' row.
<!-- SECTION:NOTES:END -->
