---
id: TASK-3
title: Pre-release full regression suite
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
labels:
  - 'priority:high'
  - testing
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
