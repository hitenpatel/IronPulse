---
id: TASK-4
title: Move provider webhooks to a retry-backed job queue
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - infrastructure
  - 'priority:medium'
  - tech-debt
  - integrations
  - api
milestone: m-2
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/299'
priority: medium
type: chore
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #299: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/299

## Context

Strava, Garmin, Oura, Withings webhook routes all respond 200 immediately and fire-and-forget an async `importXActivity`. If the import fails, the provider doesn't retry; valid activity data is silently dropped.

## Acceptance Criteria

- [ ] Webhook handlers persist the inbound event payload to a new `webhook_events` table and enqueue a job
- [ ] A worker processes events with retry + DLQ semantics (BullMQ on top of existing Redis is the likely choice)
- [ ] Failed events after N retries create a Sentry incident with provider + external ID
- [ ] Runbook page added to BookStack for manual replay

## Notes

Redis is already in docker-compose. Consider whether BullMQ or Inngest fits better — whichever stays simplest.
<!-- SECTION:DESCRIPTION:END -->
