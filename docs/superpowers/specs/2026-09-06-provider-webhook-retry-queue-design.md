# Provider webhook retry queue

**Ticket:** TASK-4 · Forgejo issue #299 · Milestone m-2
**Date:** 2026-09-06
**Author:** Hiten Patel (via Claude)
**Status:** Design approved; ready for implementation plan.

## Problem

The `POST` handlers at `apps/web/src/app/api/{strava,garmin,oura,withings,polar}/webhook/route.ts`
respond `200` immediately and hand the work to an unwatched `(async () => { ... })()` inside
the same request. If that background task throws — DB blip, expired token, provider quirk,
`importXActivity` bug — the error lands in Sentry (best case) and the activity payload is
gone forever. Providers do not retry a `200`, and there is no way for an operator to notice
or replay a dropped event.

## Goals

- Every inbound webhook event survives the request that delivered it.
- Transient failures self-heal via bounded retries.
- Terminal failures surface exactly one Sentry incident with enough context to act.
- An operator can replay a dead-lettered event by hand from a documented curl command.
- No new deployment surface (no new container, no new managed service).

## Non-goals

- Reworking the per-provider `importXActivity` code paths themselves.
- Building an admin UI for the queue in this ticket. Curl + Sentry are enough for m-2.
- Handling scheduled polling (Withings/Garmin sync loops) — those already have their own
  cron endpoints.

## Architecture

The `webhook_events` table IS the queue. A minute-cadence cron endpoint drains
eligible rows, dispatches to the existing per-provider importer, and manages retry state
in Postgres. No BullMQ, no Redis queue, no standalone worker service. Latency budget:
worst-case first attempt ~60s after receipt, worst-case DLQ ~7h20m after receipt.

Choice rationale — captured from brainstorming:

- **DB-driven vs BullMQ standalone worker**: chose DB-driven. A dedicated worker container
  gives sub-second retry latency but adds a service to keep alive and changes the deploy
  story for staging + prod. Webhook retry does not need sub-second latency; it needs
  survivability, observability and a manual replay path. Postgres + a cron tick gives
  those with zero new infra.
- **DB-driven vs BullMQ in-process**: chose DB-driven. In-process BullMQ workers must be
  singleton; Next.js gives no such guarantee under multi-instance or hot-reload.

### Data model

New Prisma model in `packages/db/prisma/schema.prisma`:

```prisma
enum WebhookEventStatus {
  pending
  processing
  succeeded
  dlq
}

model WebhookEvent {
  id            String              @id @default(cuid())
  provider      String              @db.VarChar(16)
  externalId    String              @db.VarChar(128)
  payload       Json
  signature     String?             @db.Text
  receivedAt    DateTime            @default(now())
  status        WebhookEventStatus  @default(pending)
  attempts      Int                 @default(0)
  lastError     String?             @db.Text
  lastAttemptAt DateTime?
  nextAttemptAt DateTime            @default(now())
  completedAt   DateTime?

  @@index([status, nextAttemptAt])
  @@unique([provider, externalId], name: "provider_external_id_unique")
}
```

- `provider` is a short slug (`strava` | `garmin` | `oura` | `withings` | `polar`).
- `externalId` is a required column. When the provider does not supply an event id
  (Polar `PING`), the handler computes `sha256(payload)` and uses that as the
  synthetic id, so `ON CONFLICT DO NOTHING` still works.
- `signature` stores the provider signature header where available (Garmin, Withings,
  Polar) for post-hoc audit. Not required for processing.
- `@@index([status, nextAttemptAt])` makes the worker's eligibility query fast even at
  high queue depth. `@@unique([provider, externalId])` gives duplicate-delivery immunity.

### Webhook handler contract

Each of the five `POST /api/{provider}/webhook` routes becomes:

```
1. Read + parse body (existing type guards stay).
2. Verify provider signature where supported. If invalid → 401. (Existing behaviour.)
3. Filter no-op event shapes as today (e.g. Strava's non-`activity`/non-`create` events).
   Return 200 without inserting.
4. Compute externalId (provider-native or sha256 fallback).
5. INSERT INTO webhook_events (..., status='pending', nextAttemptAt=now())
   ON CONFLICT (provider, externalId) DO NOTHING.
6. Return 200 { ok: true }.
```

No `(async () => { ... })()`. No `importXActivity` call on the request path.

GET verification handlers (Strava, Oura, Withings, Polar) are unchanged.

### Worker

New route `GET /api/cron/webhook-worker/route.ts`, wired into the existing cron
scheduler with a `* * * * *` cadence (every 60s).

Per tick, wrapped in a single transaction per batch:

```sql
WITH claimed AS (
  SELECT id FROM webhook_events
   WHERE status = 'pending' AND nextAttemptAt <= now()
   ORDER BY receivedAt ASC
   LIMIT 25
   FOR UPDATE SKIP LOCKED
)
UPDATE webhook_events e
   SET status = 'processing',
       attempts = e.attempts + 1,
       lastAttemptAt = now()
  FROM claimed
 WHERE e.id = claimed.id
 RETURNING e.*;
```

For each returned row, call `dispatch(provider, payload)` — see below. On resolve:

- **success** → `UPDATE webhook_events SET status='succeeded', completedAt=now(), lastError=null WHERE id=$1`
- **failure**, `attempts < 5` → `UPDATE webhook_events SET status='pending', nextAttemptAt=$next, lastError=$msg WHERE id=$1`
- **failure**, `attempts = 5` → `UPDATE webhook_events SET status='dlq', lastError=$msg WHERE id=$1`, then
  `captureError(err, { provider, externalId, eventId, attempts })` — one incident per event.

Backoff schedule (indexed from attempt 1 that just failed):

| attempts | delay until next |
| -------- | ---------------- |
| 1        | 1 min            |
| 2        | 5 min            |
| 3        | 15 min           |
| 4        | 1 h              |
| 5        | dead-letter      |

Worst-case DLQ: ~7h20m after receipt, comfortably inside "same-day alert".

`FOR UPDATE SKIP LOCKED` makes the worker safe against a duplicated cron tick or a
future move to two workers; only one process ever holds a row in `processing`.

### Dispatcher

`packages/api/src/lib/webhook-dispatcher.ts` exports one function:

```ts
async function dispatchWebhookEvent(
  provider: 'strava'|'garmin'|'oura'|'withings'|'polar',
  payload: unknown,
): Promise<void>
```

Body is a switch on `provider` calling the existing importers (`importStravaActivity`,
`importGarminActivity`, `importOuraDailyData`, `importWithingsData`, `importPolarActivity`
— whatever names already exist in `packages/api/src/lib/*.ts`). No behavioural changes to
the importers themselves. If the connection is disabled or missing, the dispatcher
resolves (event is a no-op success); it does NOT throw. Provider errors propagate.

### DLQ observation + manual replay

- **Observation**: `status='dlq'` rows carry `lastError` and produce exactly one Sentry
  incident at DLQ transition. The Sentry event tags include `provider` and `externalId`
  so oncall can jump straight to the row.
- **Replay endpoint**: `POST /api/admin/webhook-events/[id]/replay`. Requires an admin
  session (same guard the existing `/api/admin/*` routes use). Body: none. Effect:
  ```sql
  UPDATE webhook_events
     SET status='pending', attempts=0, nextAttemptAt=now(), lastError=null
   WHERE id = $1 AND status IN ('dlq','failed');
  ```
  Returns the updated row or 404 if not found / not eligible.
- **List endpoint**: `GET /api/admin/webhook-events?status=dlq&limit=50` for triage. Same
  admin guard.

### Runbook (BookStack)

New page under Iron Pulse book (id 19): "Webhook event replay". Sections:

1. **What lives here** — one paragraph explaining the queue + the DLQ.
2. **Find the failing event** — Sentry issue links, SQL to inspect a specific event id
   (payload, lastError, attempts).
3. **Fix the underlying cause first** — checklist of common causes (expired token,
   disabled connection, importer regression, provider outage).
4. **Replay** — one `curl` command with a placeholder for the event id and an admin
   bearer token, and the expected response shape.
5. **Bulk operations** — retention SQL (`DELETE WHERE status='succeeded' AND completedAt < now() - interval '30 days'`), triage query for DLQ backlog.
6. **When to escalate** — repeated DLQ from the same provider inside an hour → provider
   incident; DLQ with `lastError` mentioning `PrismaClientKnownRequestError` → schema
   drift → open a bug ticket.

## Test strategy

Unit tests (vitest, per package):

- `packages/api/src/lib/webhook-dispatcher.test.ts` — mock each importer; assert the
  switch routes correctly, resolves on missing connection, propagates on importer throw.
- `packages/api/src/lib/webhook-backoff.test.ts` — pure function returning the next
  delay; table-driven test covers each attempt value including boundary.

Integration tests (real Postgres, existing pattern under `packages/api`):

- Worker drains N pending events in one tick.
- Failed event moves to `pending` with correct `nextAttemptAt` (assert within ±2s of
  expected).
- Fifth failure moves to `dlq`, `Sentry.captureException` called exactly once with the
  expected tags.
- `FOR UPDATE SKIP LOCKED`: two concurrent worker calls each get a disjoint batch.
- Admin replay resets a `dlq` row; hitting a non-existent or `succeeded` row returns 404.

Route regressions (playwright + existing http-level tests):

- Each of the 5 `POST /api/{provider}/webhook` routes returns 200 and inserts one row.
- Duplicate delivery (same `provider`+`externalId`) leaves the table unchanged.
- Strava non-`create` events return 200 with no row.

## Cutover

Single PR:

1. Prisma migration adds `WebhookEvent` model + `WebhookEventStatus` enum + indexes.
2. Dispatcher added.
3. All 5 webhook routes rewritten (fire-and-forget deleted, insert added).
4. Worker cron route added, wired to the cron scheduler config.
5. Admin list + replay routes added.
6. Unit + integration + route regression tests added.
7. BookStack runbook page created and linked from the API webhooks section.

No feature flag. No backfill. In-flight fire-and-forget imports at deploy time either
succeed (unaffected) or are lost (same failure mode as today; a Sentry incident already
covers that case). Once merged, the new code path handles every subsequent inbound.

Retention: succeeded rows older than 30 days are cleaned by a small addition to the
existing `cleanup-tokens` cron endpoint (one extra `DELETE` statement in the same tx).
DLQ rows are never auto-deleted — operator triage decides.

## Risks + mitigations

- **Cron endpoint not invoked** → queue silently grows. Mitigation: Uptime Kuma probe on
  `/api/cron/webhook-worker` (returns `{"processed": N}`); alert if HTTP 5xx or if not
  hit inside 5 min. Also caught by TASK-5 (alerting on cron failures) if that lands.
- **Provider re-sends with different body but same externalId**: our unique constraint
  drops the second, losing potentially newer data. Mitigation: for known providers where
  this is possible (Withings state-diff events), the dispatcher re-reads live state via
  the provider API rather than trusting `payload` alone. Existing importers already do
  this for Withings.
- **Migration order**: `WebhookEventStatus` enum must exist before the table. Prisma
  handles the order; verify locally by running `db:push` against a fresh DB before
  merging.

## Out of scope (candidate follow-ups)

- Admin UI over `/api/admin/webhook-events`.
- Per-provider rate limiting on the dispatcher (only Strava is chatty enough to matter).
- Replay of a range of DLQ events at once (curl loop suffices for now).
- Migrating the four Stripe webhook route to the same pattern — different failure model,
  handled elsewhere.
