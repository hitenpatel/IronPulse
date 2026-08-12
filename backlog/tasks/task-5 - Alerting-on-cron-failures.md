---
id: TASK-5
title: Alerting on cron failures
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - infrastructure
  - 'priority:low'
  - infra
  - ci
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/322'
priority: low
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #322: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/322

## Context

Cron routes in `apps/web/src/app/api/cron/*` return 200 on success but have no consistent alerting path when something inside throws or returns 500. Silent cron death is how outages slip by.

## Acceptance Criteria

- [ ] Wrap each cron handler in a helper that: emits a Sentry breadcrumb on start/end, captures exceptions with job name context, and forwards failures to Uptime Kuma's push-URL for the job
- [ ] All existing cron routes migrated to the helper
- [ ] Runbook updated with the "how to diagnose a failed cron" section

## Notes

Uptime Kuma push-style monitors are documented in NASDocker book — link to that.
<!-- SECTION:DESCRIPTION:END -->
