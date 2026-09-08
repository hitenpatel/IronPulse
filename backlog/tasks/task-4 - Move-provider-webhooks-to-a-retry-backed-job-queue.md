---
id: TASK-4
title: Move provider webhooks to a retry-backed job queue
status: Done
assignee:
  - '@claude'
created_date: '2026-07-24 05:58'
updated_date: '2026-09-08 01:59'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Re-scoped after audit — the queue itself already exists on main.
1. Raise a Sentry incident via packages/api/src/lib/capture-error.ts at the DLQ transition in webhook-worker.ts, carrying provider, external ID, event ID and last error.
2. Cover it in packages/api/__tests__/webhook-worker.test.ts: an event exhausting MAX_ATTEMPTS captures exactly one incident with provider + external ID; a retryable failure captures none.
3. Write the BookStack runbook (Iron Pulse book 19) for manual replay: how to list DLQ events via the admin endpoint, how to replay one, and how to interpret worker tick counts.
4. Verify: pnpm --filter @zor/api test.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pre-work audit (2026-09-07): most of this task is already implemented on main and the ticket is stale.

Already present:
- `webhook_events` table + `WebhookEventStatus` enum (packages/db/prisma/schema.prisma:420-426), migration 20260906084836_webhook_events_queue.
- All five provider webhooks persist the payload and enqueue: apps/web/src/app/api/{strava,garmin,oura,withings,polar}/webhook/route.ts.
- Worker with claim/reclaim, attempt backoff and DLQ: packages/api/src/lib/webhook-worker.ts (+ webhook-backoff.ts), driven by apps/web/src/app/api/cron/webhook-worker/route.ts.
- Admin replay endpoints: apps/web/src/app/api/admin/webhook-events/ (list + [id]/replay).
- Tests: packages/api/__tests__/webhook-worker.test.ts, route tests per provider.

Note: the queue is Postgres-backed (SELECT ... FOR UPDATE claim loop), not BullMQ as the ticket speculated. No reason to change that.

Remaining gaps against the acceptance criteria:
- AC3: no Sentry incident is raised when an event reaches DLQ. capture-error.ts is only called for a state-write failure (webhook-worker.ts:103), not for the DLQ transition itself, and it does not include the provider external ID.
- AC4: no BookStack runbook page for manual replay.

Correction to my earlier audit: acceptance criterion 3 was ALREADY met on main. The DLQ transition in packages/api/src/lib/webhook-worker.ts:104-110 already called captureError(err, { provider, externalId, eventId, attempts }), and webhook-worker.test.ts already asserted one incident with the external ID. My first pass missed it because the helper is named captureError and contains no 'sentry' substring.

Acceptance criterion 4 was also already met: BookStack page 151, 'Webhook Event Queue — Operations & Replay Runbook' (Iron Pulse book 19), written 2026-09-07, documents the lifecycle, backoff schedule, endpoints, cron ticks and replay procedure.

So the only real work left was small: lastError is now included in the DLQ Sentry context, and the retryable-failure path gained an explicit assertion that it raises no incident. Two doc-drift errors in the runbook were corrected — the worker tick returns processed, not claimed, and the Sentry extra key is eventId, not webhookEventId (plus the new lastError).

Not changed, flagged for a decision: writeCompletionWithRetry's own failure path (webhook-worker.ts:103) captures { provider, eventId, phase } with no externalId, so state-write incidents cannot be correlated to a provider event the way dispatch incidents can. Out of scope here.

Ops wiring completed 2026-09-07: staging (NAS) deployed 5c1a3e5, health SHA matches, _prisma_migrations=4, dueCount=dlqCount=0. Per-minute tick via new docker/compose.staging.yml webhook-cron service (curl to http://ironpulse:3000/api/cron/webhook-worker with CRON_SECRET). Prod (Oracle VM) deployed c63b2b8, health OK, _prisma_migrations=5 (was 1). Per-minute tick via ubuntu crontab hitting https://ironpulse.hiten-patel.co.uk. Uptime Kuma monitors: 79 (staging), 80 (prod), keyword "dlqCount":0, 5m interval, Authorization: Bearer <secret>, linked to ntfy notification 2.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Re-scoped after audit: the retry-backed queue already shipped on main (Postgres-backed claim loop, not BullMQ) with the webhook_events table, all five provider webhooks enqueueing, backoff to DLQ at 6 attempts, admin list/replay endpoints and the BookStack runbook. Added the last error message to the DLQ Sentry incident context and an assertion that retryable failures raise no incident; corrected two field-name errors in BookStack page 151. Verified with pnpm --filter @zor/api test on merged main: 67 files, 823 tests passing. Merged as a merge commit on main.
<!-- SECTION:FINAL_SUMMARY:END -->
