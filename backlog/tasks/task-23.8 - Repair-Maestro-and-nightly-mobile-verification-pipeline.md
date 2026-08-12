---
id: TASK-23.8
title: Repair Maestro and nightly mobile verification pipeline
status: In Progress
assignee:
  - '@claude'
created_date: '2026-08-09 03:52'
updated_date: '2026-08-12 20:09'
labels:
  - mobile
  - test
  - e2e
  - testing
  - ci
milestone: m-0
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Surgical native-tree alignment (app.config.js is source of truth for scheme + bundle ID after Zor rebrand):

1. apps/mobile/android/app/build.gradle: namespace + applicationId com.mettlelift.app -> com.ironpulse.app
2. apps/mobile/android/settings.gradle: rootProject.name 'Mettle Lift' -> 'Zor'
3. apps/mobile/android/app/src/main/res/values/strings.xml: app_name 'Mettle Lift' -> 'Zor'
4. apps/mobile/android/app/src/main/AndroidManifest.xml: replace 'mettlelift' deep-link scheme with two <data> entries for 'zor' and 'ironpulse' (matches app.config.js scheme array)
5. Rebuild E2E APK: EXPO_PUBLIC_E2E=1 cd apps/mobile/android && ./gradlew assembleRelease (or via build-safe.sh per memory) - required com.ironpulse.app.e2e output
6. Uninstall stale com.mettlelift.app.e2e from Pixel 100.69.203.52:5555, install fresh com.ironpulse.app.e2e
7. Rerun prod-smoke flow first (auth-signin) as fastest feedback, then full main suite
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nightly failure signature (captured 2026-08-12 from run 1261 + prior 1249/1250/1253/1255/1257/1259):

Maestro log /home/ubuntu/.maestro/tests/2026-08-12_140633/maestro.log:
  14:06:52 Launching app com.mettlelift.app.e2e
  14:06:53 Assert id:email-input is visible RUNNING
  14:07:53 CommandFailed after 60s: Assertion is false: id: email-input is visible
  14:07:53 Screenshot taken, driver uninstalled

Root cause: bundle-ID drift. apps/mobile/android/app/build.gradle still declares namespace + applicationId 'com.mettlelift.app' (rename-branch leftover). apps/mobile/app.config.js correctly uses 'com.ironpulse.app'. Expo prebuild would fix but the checked-in Android native folder overrides. The E2E APK on the Pixel (100.69.203.52:5555) is therefore com.mettlelift.app.e2e; when nightly-e2e.sh rewrites appIds it produces com.mettlelift.app.e2e (or com.ironpulse.app.e2e after my current-day rebrand — a mismatch either way). The wrong APK launches but never reaches login within 60s.

Fix scope: rewrite android/app/build.gradle namespace + applicationId to com.ironpulse.app, rebuild + reinstall the E2E APK on the Pixel, then rerun the nightly. Verify with the pre-flight prod smoke first (single flow, faster feedback than the full main suite).

Cron intact at 03:30 UTC. Nightly will refire tomorrow; expect same failure until android/app/build.gradle is aligned and the E2E APK re-installed.

EAS build kicked off 2026-08-12 17:35: build ID c8a92b79-20cc-431e-a1e3-20f862d55ec0 (profile e2e, com.ironpulse.app.e2e). Local android/ edits (build.gradle, settings.gradle, strings.xml, AndroidManifest.xml) applied but gitignored per apps/mobile/.gitignore — expo prebuild regenerates from app.config.js on EAS anyway. When build finishes: uninstall com.mettlelift.app.e2e from Pixel 100.69.203.52:5555, install fresh APK, rerun smoke.

Post-rebuild verification (2026-08-12 20:06, /home/ubuntu/.maestro/tests/2026-08-12_200551):
  Launch app com.ironpulse.app.e2e ...............COMPLETED
  Assert id: email-input visible ..................COMPLETED
  Tap email-input .................................COMPLETED
  Input test@example.com ..........................COMPLETED
  Tap password-input ..............................COMPLETED
  Input password123 ...............................COMPLETED
  Tap login-button ................................COMPLETED
  Assert id: greeting visible .....................FAILED

Structural fix confirmed: correct APK on device (com.ironpulse.app.e2e installed from EAS build c8a92b79...), sed rewrite in nightly-e2e.sh produces matching appId, app boots, login UI renders, inputs work. Remaining greeting-visible failure is API-side, not pipeline-side.

Root cause of new failure: the E2E APK points at EXPO_PUBLIC_API_URL=http://100.113.79.51:3000 (this VM's tailscale IP per apps/mobile/eas.json line 14), but nothing binds :3000 here — connection refused. Login POST hits nowhere, no session, greeting never renders. Same class of gap as TASK-23.10 (no local dev Postgres). New follow-up needed to bring up a dev API + seeded auth for e2e.

TASK-23.8 pipeline-repair scope met: the maestro runner now exercises real UI. API availability is a separate concern (TASK-23.11 covers it).
<!-- SECTION:NOTES:END -->
