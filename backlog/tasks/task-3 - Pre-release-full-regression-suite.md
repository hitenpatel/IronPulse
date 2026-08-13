---
id: TASK-3
title: Pre-release full regression suite
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-24 05:58'
updated_date: '2026-08-13 02:29'
labels:
  - 'priority:high'
  - testing
milestone: m-0
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/212'
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #212: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/212

## Context

Consolidates Sprint 11–15 regression testing tickets (#153, #156, #160, #166, #173) into a single pre-release gate. Each individual ticket now requires its own tests per project policy, but a full regression pass is still needed before tagging v1.0.0.

## Acceptance Criteria

- [ ] All Playwright E2E tests pass (web)
- [ ] All Maestro E2E tests pass (iOS + Android)
- [ ] All unit tests pass (`pnpm test` across all packages)
- [ ] All API integration tests pass (against real PostgreSQL)
- [ ] Manual smoke test of critical user flows:
  - Sign up → onboarding → first workout → view stats
  - Cardio GPS tracking → route display
  - Coach signup → create program → assign to athlete
  - Stripe subscription → tier upgrade
  - Device integration OAuth flow (Strava)
  - Offline workout → sync on reconnect (mobile)
- [ ] Lighthouse score meets thresholds (if #159 is complete)
- [ ] No critical or high-severity Sentry errors in staging
- [ ] Performance: page load < 3s on 3G throttle for key pages

## Notes

Run this after all rc milestones are complete, before tagging v1.0.0. Replaces: #153, #156, #160, #166, #173.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pre-release regression gate — programmatic results 2026-08-13:

PASSED:
- packages/api vitest: 712/712 (55 files, real Postgres via docker-compose.dev.yml)
- apps/mobile vitest unit: 328/328 (29 files)
- apps/mobile Jest RN components: 69/69 (6 files)
- apps/web vitest: 147/147 (22 files)
- apps/web Playwright e2e: 27 passed, 5 skipped (BASE_URL=http://localhost:3000 against dev API)
- Mobile TypeScript: pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit exits 0
- apps/web build: implicit via Playwright webServer

BLOCKED / MANUAL:
- Mobile Maestro suite (iOS + Android): Pixel 100.69.203.52 adb-over-wifi is down (Connection refused on :5555). Once device is back, run scripts/nightly-e2e.sh main suite. Tracked also in TASK-23.11 AC #3 and TASK-23.8.
- Manual smoke of critical flows (signup→onboarding→workout→stats, Cardio GPS, Coach flows, Stripe subscription, Strava OAuth, offline mobile sync): requires human tester on device + live staging. Owner: hiten@ before v1.0.0 tag.
- Lighthouse (advisory): requires prod build (next build + next start). Skipped here — CI runs it with '|| advisory' flag; assertion targets performance>=0.8, a11y>=0.9, CLS<=0.1.
- No critical/high Sentry errors in staging: requires live traffic on staging deployment window before tag.
- Performance <3s on 3G throttle: bundled with Lighthouse advisory; verify pre-tag.
<!-- SECTION:NOTES:END -->
