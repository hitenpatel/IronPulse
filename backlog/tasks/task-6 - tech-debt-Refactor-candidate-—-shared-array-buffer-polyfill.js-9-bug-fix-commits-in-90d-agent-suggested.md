---
id: TASK-6
title: >-
  tech-debt: Refactor candidate — shared-array-buffer-polyfill.js (9 bug-fix
  commits in 90d) (agent-suggested)
status: Done
assignee:
  - '@claude'
created_date: '2026-07-24 05:58'
updated_date: '2026-09-07 20:39'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read apps/mobile/lib/shared-array-buffer-polyfill.js, map the 5 concerns and their ordering constraints.
2. Find all importers (metro config getPolyfills, entry files, E2E config).
3. Create apps/mobile/lib/polyfills/{shared-array-buffer,url,globals,e2e-logbox}.js preserving behaviour and documenting ordering.
4. Wire imports in required order with comments; e2e-logbox loaded only under E2E.
5. Unit test per module asserting installed global is callable post-init.
6. Delete old file, update imports, run mobile unit tests + typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audit invalidated the ticket's premise. apps/mobile/lib/shared-array-buffer-polyfill.js had no importers anywhere — source, jest/vitest config, Maestro config, .forgejo CI. Git history shows it was orphaned on 2026-06-05 (80a4d17, 88c696e, 1b7a2c3) when apps/mobile/index.js plus a new apps/mobile/lib/url-polyfill.js took over with a deliberately hardened implementation (Object.defineProperty-based URL override, no Atomics, no self aliasing). The churn analysis that filed this ticket counted 9 bug-fix commits against a file that had since become inert.

Splitting a dead file into four live modules would have created five unused files plus tests for code nothing loads, so the acceptance criteria as written (split, wire into getPolyfills, unit-test each module) were not the right outcome. The file is deleted instead. The live entry point (index.js, ~20 lines of polyfill) is small enough that splitting it would be over-engineering; it is left alone.

Ordering constraints recovered from the deleted file's history, recorded here so the archaeology is not lost:
1. Polyfills must be the first side-effect import in the entry point — ES imports hoist above inline code (52ed4b5, df12e3d).
2. Each polyfill guards with typeof x === 'undefined' so it never clobbers a working native implementation (6e71421).
3. The URL polyfill must contain no require() calls — falling back to require('react-native/Libraries/Blob/URL') crashed on this Hermes build (92b6597).
4. global.URL must be assigned immediately after globalThis.URL; some libraries read global.URL specifically (45b533f).
5. self must alias globalThis rather than copy it, so later globals stay visible; defining self during module evaluation crashed a library that switched to a browser code path (aa597cc, 80a4d17).
6. E2E RedBox suppression must install at polyfill time, not component-mount time, to cover bootstrap errors (3a9f488).

The audit also surfaced a real bug, filed as TASK-30: index.js gates RedBox suppression on bare E2E, but the E2E APK sets only EXPO_PUBLIC_E2E, so the suppression never runs in the build it exists for.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Deleted apps/mobile/lib/shared-array-buffer-polyfill.js. The refactor the ticket asked for was not performed because the file turned out to be dead code — no importers in source, test config, Maestro config or CI — orphaned since 2026-06-05 when index.js and lib/url-polyfill.js replaced it. Verified by repo-wide grep before deletion. The original ACs (split into four modules, wire into getPolyfills, unit-test each) are moot and left unchecked. Ordering constraints from the file's history are preserved in the implementation notes; the E2E flag bug found during the audit is tracked as TASK-30. Merged to main as fa55d41.
<!-- SECTION:FINAL_SUMMARY:END -->
