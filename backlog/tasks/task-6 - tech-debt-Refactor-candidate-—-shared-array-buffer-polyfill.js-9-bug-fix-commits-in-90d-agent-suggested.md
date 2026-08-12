---
id: TASK-6
title: >-
  tech-debt: Refactor candidate — shared-array-buffer-polyfill.js (9 bug-fix
  commits in 90d) (agent-suggested)
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - agent-suggested
  - tech-debt
  - web
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/340'
priority: low
type: chore
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #340: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/340

## Why this surfaced

Git churn analysis: `apps/mobile/lib/shared-array-buffer-polyfill.js` received **9 bug-fix commits** in the last 90 days, making it the highest-churn non-test, non-config source file in the repository.

## Observable evidence

The file now handles 5 separate concerns in one module: `SharedArrayBuffer`, `Atomics`, `URL` + `URLSearchParams`, `self`/`global` aliasing, and E2E `ErrorUtils` suppression — all as side-effect-only globals injected before app bootstrap.

## Why
Co-locating five unrelated polyfills in a single side-effect file is what made the 9 successive bug fixes necessary — each polyfill's interaction with Hermes, Metro, and the others created a new edge case. Splitting them into separately-loaded, independently-testable modules removes the implicit ordering coupling that caused the regressions.

## Acceptance criteria
- [ ] `apps/mobile/lib/shared-array-buffer-polyfill.js` is split into 4 separate files under `apps/mobile/lib/polyfills/`: `shared-array-buffer.js` (SAB + Atomics), `url.js` (URL + URLSearchParams), `globals.js` (self/global aliasing), `e2e-logbox.js` (LogBox/RedBox suppression — only loaded under E2E)
- [ ] Metro `getPolyfills` (or equivalent entry) imports them in the documented required order, with comments explaining ordering constraints discovered in the original file
- [ ] Each polyfill module has a unit test asserting the global it installs is callable post-init (mocked Hermes-style runtime where possible)
- [ ] No behavioural change: existing E2E tests pass without modification
- [ ] Old `shared-array-buffer-polyfill.js` is removed; all imports updated

## Out of scope
- Replacing any polyfill with a third-party package
- Upgrading Hermes/Metro versions
- Removing polyfills no longer needed (track separately if discovered)

## Suggested type
tech-debt

## Confidence
medium — split is mechanical but ordering between polyfills is a real constraint that must be preserved.

---
*Filed by IronPulse Product Owner · agent-suggested · weekly Sunday sweep*
<!-- SECTION:DESCRIPTION:END -->
