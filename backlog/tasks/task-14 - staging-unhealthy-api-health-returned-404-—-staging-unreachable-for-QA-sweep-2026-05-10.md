---
id: TASK-14
title: >-
  staging unhealthy: /api/health returned 404 — staging unreachable for QA sweep
  2026-05-10
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-07-24 06:07'
labels:
  - agent-suggested
  - bug
  - regression
  - staging-down
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/393'
priority: high
type: bug
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #393: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/393

## What failed

The QA agent weekly sweep (2026-05-10, run `01bc7fac-a5a2-4776-a864-15044e7c8f5e`) found staging unreachable before any Playwright specs could run.

## Health probe result

```
GET https://staging.ironpulse.hiten-patel.co.uk/api/health
HTTP 404 — "404 page not found"
```

The staging site root (`/`) also returns **404**, confirming the app is not serving.

## Likely root cause

The `Deploy to Staging` CI job has been failing since commit `5c37178c7b79` (first reported in issue #379, opened 2026-05-07). Staging has not received a successful deployment since then.

## Impact

No Tier-1 or Tier-2 Playwright specs were run. Effective QA status: **red** (staging unreachable = all Tier-1 must-pass specs cannot be verified).

## Why

Staging deployment failure prevents QA test execution and blocks verification of Tier-1 functionality. Restoring the health check confirms the deployment pipeline is working.

## Acceptance criteria

- [ ] Unblock: ensure issue #379 (Deploy to Staging CI job) is resolved and staging receives a successful deployment
- [ ] Verify `GET https://staging.ironpulse.hiten-patel.co.uk/api/health` returns HTTP 200 with `{"status":"ok"}`
- [ ] Verify `GET https://staging.ironpulse.hiten-patel.co.uk/` returns HTTP 200 (app is serving)
- [ ] Run the QA sweep again (or trigger manually) and verify all Tier-1/Tier-2 Playwright specs execute
- [ ] Document the deployment fix in the related issue #379

## Out of scope

- Fixing the underlying Deploy to Staging CI job (tracked in #379)
- Changes to the health endpoint implementation
- Tier-1 test spec updates

---
*Filed by IronPulse QA · agent-suggested · weekly Sunday sweep · 2026-05-10*
<!-- SECTION:DESCRIPTION:END -->
