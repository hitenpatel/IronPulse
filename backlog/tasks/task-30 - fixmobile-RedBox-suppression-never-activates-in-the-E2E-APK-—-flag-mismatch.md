---
id: TASK-30
title: 'fix(mobile): RedBox suppression never activates in the E2E APK — flag mismatch'
status: To Do
assignee: []
created_date: '2026-09-07 20:39'
labels:
  - mobile
  - testing
  - e2e
dependencies: []
priority: high
type: bug
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`apps/mobile/index.js:22` gates the global ErrorUtils/RedBox suppression on `process.env.E2E === "1"`.

The real E2E APK never sets that variable. `apps/mobile/eas.json:21-22` sets only `EXPO_PUBLIC_E2E=1`, and its inline comment states this is deliberate: setting bare `E2E` would trigger the App.e2e mock plus the PowerSync stub in metro.config and build a fake app.

Net effect: the suppression is dead code in every E2E build. Background errors still raise the RedBox overlay, which is exactly what blocks Maestro — the reason the suppression was added in the first place.

## Evidence
- `apps/mobile/index.js:22` — `if (process.env.E2E === "1" && typeof ErrorUtils !== "undefined")`
- `apps/mobile/eas.json:21-22` — sets `EXPO_PUBLIC_E2E`, explicitly warns against setting bare `E2E`
- `apps/mobile/app.config.js:1` — `const IS_E2E = process.env.EXPO_PUBLIC_E2E === "1"`

Found while auditing TASK-6; the same mismatch existed in the now-deleted shared-array-buffer-polyfill.js, which gated on `EXPO_PUBLIC_E2E`.

## Acceptance criteria
- [ ] The suppression activates in an APK built with the E2E profile, without pulling in the App.e2e mock or the PowerSync stub
- [ ] A test or build-time assertion covers the gating condition so the two flags cannot silently diverge again
- [ ] Confirmed on the nightly Maestro run that RedBox no longer blocks flows
<!-- SECTION:DESCRIPTION:END -->
