---
id: TASK-31
title: 'test(mobile): decide the fate of four e2e flows that cannot pass as written'
status: To Do
assignee: []
created_date: '2026-09-07 20:59'
labels:
  - mobile
  - testing
  - e2e
dependencies: []
priority: medium
type: chore
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Surfaced while rewriting the stale flows in TASK-19. These four were deliberately left in place rather than silently deleted, because each needs a product decision rather than a selector fix.

- `e2e/body-fat-log.yaml` and `e2e/weight-log.yaml` — the body-weight / body-fat logging UI no longer exists anywhere in the app (confirmed by repo-wide grep); only an unrelated 'Body weight' goal type remains. Either the feature was dropped and the flows should go, or the feature regressed and should come back.
- `e2e/healthkit.yaml` — Apple Health is filtered out on Android by `platform: "ios"` in `app/settings/integrations.tsx`. The shared E2E device is Android-only, so this flow structurally cannot pass there. Needs either an iOS runner or an explicit platform skip.
- `e2e/workout-focus-offline-verify.yaml` — still taps the stale 'Workout History' row (renamed to 'Records'). It was outside TASK-19's listed failing set, so it was left untouched. Straight fix, just needs doing.

## Acceptance criteria
- [ ] Each of the four flows is either fixed, deleted with a recorded reason, or explicitly marked as platform-skipped
- [ ] The nightly Maestro run no longer reports any of them as an unexplained failure
<!-- SECTION:DESCRIPTION:END -->
