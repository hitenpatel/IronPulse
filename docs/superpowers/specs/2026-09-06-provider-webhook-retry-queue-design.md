# Provider webhook retry queue

**Ticket:** TASK-4 · Forgejo issue #299 · Milestone m-2
**Date:** 2026-09-06 (revised after Codex cross-model review)
**Author:** Hiten Patel (via Claude, reconciled with Codex critique)
**Status:** Design approved; ready for implementation plan.

## Problem

The `POST` handlers at `apps/web/src/app/api/{strava,garmin,oura,withings,polar}/webhook/route.ts`
respond `200` immediately and hand the work to an unwatched `(async () => { ... })()` inside
the same request. If that background task throws — DB blip, expired token, provider quirk,
`importXActivity` bug — the error lands in Sentry (best case) and the activity payload is
gone forever. Providers do not retry a `200`, and there is no way for an operator to notice
or replay a dropped event.

## Goals

- Every inbound webhook event that we accept (past filter + signature check +
  zod parse) is persisted before the request returns, so the delivery survives
  even if the importer or the process dies.
- Transient failures self-heal via bounded retries (six attempts, exponential
  backoff, DLQ at the sixth failure).
- Terminal failures surface at most one Sentry incident per DLQ transition,
  posted AFTER the DLQ commit, with `{provider, externalId, eventId, attempts}`
  in Sentry `extra`.
- An operator can replay a `dlq` or `skipped_no_connection` row by hand from
  a documented curl command.
- No new deployment surface (no new container, no new managed service).

**Non-goals for the delivery invariant** (documented so nobody assumes them):
- Filtered events (Strava `update`, Polar `PING`, empty Garmin batches, Oura
  no-op event types) return 200 with no row on purpose.
- Events for missing/disabled connections land as `skipped_no_connection`
  terminal state, replayable after reconnection.
- User-deletion cascade removes queued rows via `onDelete: Cascade` on the
  `userId` FK; that is the intended GDPR behavior.
- Importers themselves have known partial-failure weaknesses (Strava/Garmin
  create a session before fetching route data and swallow route-fetch errors,
  Oura readiness is best-effort). A successful dispatch does not guarantee
  every downstream artefact landed. Hardening those is a separate ticket per
  provider.

## Non-goals

- Reworking the per-provider `importXActivity` code paths themselves. Those importers
  have known partial-failure weaknesses (see **Out of scope** at the bottom); this ticket
  guarantees delivery, not downstream import idempotency.
- Building an admin session/role/UI in this ticket. Replay is curl-callable behind the
  cron shared secret. Downstream admin UI is a separate follow-up.
- Handling scheduled polling (Withings/Garmin sync loops) — those already have their
  own cron endpoints.

## Architecture

The `webhook_events` table IS the queue. A minute-cadence cron endpoint drains
eligible rows, dispatches to the existing per-provider importer, and manages retry state
in Postgres. No BullMQ, no Redis queue, no standalone worker service.

Latency budget:
- First attempt: worst-case ~60s after receipt (cron cadence).
- DLQ: sum of backoff gaps = **8h36m** after receipt under the schedule below,
  comfortably inside "same-business-day alert".

Choice rationale — captured from brainstorming:

- **DB-driven vs BullMQ standalone worker**: chose DB-driven. A dedicated worker
  container gives sub-second retry latency but adds a service to keep alive and changes
  the deploy story for staging + prod. Webhook retry does not need sub-second latency;
  it needs survivability, observability and a manual replay path. Postgres + a cron
  tick gives those with zero new infra.
- **DB-driven vs BullMQ in-process**: chose DB-driven. In-process BullMQ workers must
  be singleton; Next.js gives no such guarantee under multi-instance or hot-reload.

### Data model

New Prisma model in `packages/db/prisma/schema.prisma` (snake_case columns to match the
rest of the schema; SQL examples in this doc target the mapped names verbatim):

```prisma
enum WebhookEventStatus {
  pending
  processing
  succeeded
  skipped_no_connection
  dlq
}

model WebhookEvent {
  id                   String              @id @default(cuid())
  provider             String              @db.VarChar(16)
  externalId           String              @map("external_id") @db.VarChar(128)
  userId               String?             @map("user_id") @db.Uuid
  payload              Json
  receivedAt           DateTime            @default(now()) @map("received_at")
  status               WebhookEventStatus  @default(pending)
  attempts             Int                 @default(0)
  lastError            String?             @map("last_error") @db.Text
  lastAttemptAt        DateTime?           @map("last_attempt_at")
  processingStartedAt  DateTime?           @map("processing_started_at")
  processingOwner      String?             @map("processing_owner") @db.VarChar(64)
  nextAttemptAt        DateTime            @default(now()) @map("next_attempt_at")
  completedAt          DateTime?           @map("completed_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, nextAttemptAt])
  @@index([status, processingStartedAt])
  @@index([userId])
  @@unique([provider, externalId], name: "provider_external_id_unique")
  @@map("webhook_events")
}
```

- `provider` slug: `strava` | `garmin` | `oura` | `withings` | `polar`.
- `externalId` is NOT NULL. When the provider does not supply an id (rare —
  Strava has `object_id`, Garmin the enclosing activity id, Oura per-event ids,
  Withings `grpid` per notification, Polar `entity_id` on non-PING events), the
  handler falls back to `sha256(canonicalize(payload))`. Polar PING is filtered
  out before the row is inserted, so it never needs a synthetic id.
- `userId` FK with `onDelete: Cascade` so the existing user-deletion cron
  reclaims webhook rows automatically. `userId` is resolved at insert time by
  looking up `DeviceConnection` for `(provider, providerAccountId)`; when the
  connection does not yet exist, `userId` is null and the row is dispatched
  and lands as `skipped_no_connection`.
- `signature` column intentionally omitted — the parsed JSON in `payload` does
  not preserve the exact signed bytes, so storing the header cannot help
  future signature verification. YAGNI.
- `processingStartedAt` + `processingOwner` are the stale-claim recovery
  primitives (see **Worker** below). Pattern mirrors
  `packages/api/src/lib/notification-outbox.ts`.
- `@@index([status, nextAttemptAt])` for the pending-eligibility query;
  `@@index([status, processingStartedAt])` for the stale-claim reclaimer.
- `@@unique([provider, externalId])` gives duplicate-delivery immunity for
  all providers. Withings-specific caveat below.

**Withings dedupe trade-off (user-approved).** Withings notifications carry only
`(userid, appli, startdate, enddate)` — no per-event id. `externalId` is the
sha256 of the canonical inbound payload; two identical POSTs deduplicate,
but two POSTs describing the same measurement window with different bytes are
two rows (safer default — no data loss). `grpid` referenced in
`packages/api/src/lib/withings.ts` lives on the measure groups FETCHED after
the notification, not on the notification itself, so it cannot be used as a
dedupe key at ingest. If notification-hash dedupe proves noisy, the follow-up
fix is per-day dedupe (`(provider, appli, userid, DATE(received_at))`) or
dropping the unique constraint for Withings and letting the dispatcher re-read
live state on every dispatch.

### Webhook handler contract

Per-route ordering, one shape across all five routes:

```
1. Read raw body bytes.
2. Garmin only: verify HMAC signature on the raw bytes BEFORE JSON parse; 401 on mismatch.
   (The other four routes have no POST signature today; keep as-is.)
3. Zod-parse the body against a per-provider inbound schema. Malformed → 400.
   Non-event shapes today handled by if-branches (Strava non-create/non-activity,
   Polar PING, empty Garmin batch, Oura no-op event types) → 200 without insert.
4. Resolve provider account id → look up DeviceConnection → capture userId
   (may be null if the connection was never made or was disconnected).
5. Compute externalId (provider-native or sha256 fallback).
6. INSERT INTO webhook_events (provider, external_id, user_id, payload,
   received_at, status='pending', next_attempt_at=now())
   ON CONFLICT (provider, external_id) DO NOTHING.
7. If INSERT itself throws (DB unavailable, unique constraint on the wrong path, etc.)
   → 500. Provider retries.
8. Return 200 { ok: true }.
```

**Garmin batches** (user-approved trade-off): a Garmin POST containing N
`activityDetails` becomes ONE `webhook_events` row per request. Rationale:
provider re-delivery is per-request; retry semantics stay atomic; one bad
activity in a batch causes the whole batch to retry. This matches how the
current fire-and-forget path already treats a batch as one unit of work.
Per-activity granularity is a follow-up if oncall triage shows batch retries
holding up sibling activities.

GET verification handlers stay as they are today. Notes:

- Strava GET (hub.challenge) — unchanged.
- Oura GET — unchanged.
- Withings HEAD — preserve; used by Withings for endpoint liveness.
- Polar has no GET handler today; do not add one.

### Worker

New route `GET /api/cron/webhook-worker/route.ts`, guarded by
`Authorization: Bearer ${CRON_SECRET}`, wired into the existing cron scheduler
at `* * * * *` (every 60s). Deployment note: cron scheduling lives OUTSIDE
this repo — the cutover explicitly adds the tick to staging + prod cron
config, see **Cutover** below.

Two phases per tick, in this order:

**Phase A — reclaim stale claims** (transactional):

```sql
UPDATE webhook_events
   SET status = 'pending',
       processing_owner = NULL,
       processing_started_at = NULL
 WHERE status = 'processing'
   AND processing_started_at < now() - interval '10 minutes';
```

10 min is comfortably longer than any importer's realistic completion time
(largest currently: Strava full activity + route fetch, ~30s p99). Reclaimed
rows keep their `attempts` count so the retry budget still applies.

**Phase B — claim + dispatch a batch of up to 25** (claim is one transaction;
dispatch runs OUTSIDE that transaction so provider HTTP is never held under
row lock):

```sql
-- inside a tx
WITH claimed AS (
  SELECT id FROM webhook_events
   WHERE status = 'pending' AND next_attempt_at <= now()
   ORDER BY received_at ASC
   LIMIT 25
   FOR UPDATE SKIP LOCKED
)
UPDATE webhook_events e
   SET status               = 'processing',
       attempts             = e.attempts + 1,
       last_attempt_at      = now(),
       processing_started_at = now(),
       processing_owner     = $ownerToken   -- e.g. `${pid}-${randomUUID()}`
  FROM claimed
 WHERE e.id = claimed.id
 RETURNING e.*;
-- commit
```

The claim tx holds row locks only long enough to write the transition. Then,
for each returned row and OUTSIDE the tx:

```
result = await dispatch(provider, payload, userId)
```

Completion writes are guarded by `processing_owner` — a resurrected old
worker cannot overwrite a row a fresh worker has already reclaimed:

```sql
-- success
UPDATE webhook_events
   SET status = 'succeeded', completed_at = now(), last_error = NULL,
       processing_owner = NULL, processing_started_at = NULL
 WHERE id = $1 AND processing_owner = $ownerToken;

-- skipped (connection missing/disabled at dispatch time)
UPDATE webhook_events
   SET status = 'skipped_no_connection', completed_at = now(), last_error = NULL,
       processing_owner = NULL, processing_started_at = NULL
 WHERE id = $1 AND processing_owner = $ownerToken;

-- failure, still under budget
UPDATE webhook_events
   SET status = 'pending', next_attempt_at = $next, last_error = $msg,
       processing_owner = NULL, processing_started_at = NULL
 WHERE id = $1 AND processing_owner = $ownerToken;

-- terminal failure
UPDATE webhook_events
   SET status = 'dlq', last_error = $msg, completed_at = now(),
       processing_owner = NULL, processing_started_at = NULL
 WHERE id = $1 AND processing_owner = $ownerToken
 RETURNING id, provider, external_id, attempts;
-- Sentry.captureException posted AFTER the returning row commits.
```

Backoff schedule — **six attempts, five gaps**
(user-approved `1m / 5m / 30m / 2h / 6h`; DLQ on the sixth failure):

| gap after failed attempt N | delay until next attempt |
| -------------------------- | ------------------------ |
| 1                          | 1 min                    |
| 2                          | 5 min                    |
| 3                          | 30 min                   |
| 4                          | 2 h                      |
| 5                          | 6 h                      |
| 6                          | dead-letter              |

Sum of gaps: `1 + 5 + 30 + 120 + 360` min = **8h36m** worst-case DLQ from receipt.

`FOR UPDATE SKIP LOCKED` makes the worker safe against a duplicated cron
tick or a future move to two workers; only one process ever holds a row in
`processing`.

**Status endpoint (separate from worker).** `GET /api/cron/webhook-worker/status`
returns JSON without touching queue state:

```
{
  "dueCount": 1,
  "oldestDueAgeSec": 42,
  "pendingCount": 3,
  "processingCount": 0,
  "dlqCount": 1,
  "oldestProcessingAgeSec": null
}
```

`dueCount` and `oldestDueAgeSec` restrict to `status='pending' AND
next_attempt_at <= now()` — the actionable backlog. A row correctly
scheduled hours in the future during backoff sits in `pendingCount` but
does NOT contribute to `dueCount`, so a legitimate long backoff does
not trip a "stuck queue" alert.

Uptime Kuma probes THIS endpoint, not the worker, so a probe cannot itself
cause the worker to advance the queue. Runbook thresholds:
`oldestDueAgeSec > 300` → warn (worker behind on due work);
`dlqCount` change → alert.

### Dispatcher

`packages/api/src/lib/webhook-dispatcher.ts` exports:

```ts
type DispatchOutcome =
  | { kind: 'succeeded' }
  | { kind: 'skipped_no_connection' };

async function dispatchWebhookEvent(
  provider: 'strava' | 'garmin' | 'oura' | 'withings' | 'polar',
  payload: unknown,      // already zod-validated at insert time
  userId: string | null, // captured at insert time; may be null
): Promise<DispatchOutcome>  // throws on genuine import failure
```

Body is a switch on `provider`. Each branch:

1. Look up `DeviceConnection` for the provider + `providerAccountId` derived
   from the payload. If missing or `syncEnabled=false` → return
   `{ kind: 'skipped_no_connection' }`.
2. Refresh access token if the provider requires it (Oura, Withings, Garmin,
   Polar all do; Strava on its own). This logic moves out of the routes into
   here, preserving current behaviour verbatim.
3. Call the existing importer for that provider with the resolved
   connection + payload. The Withings and Oura branches perform the current
   route-level fetch-then-import steps.
4. Update `deviceConnection.lastSyncedAt = now()` inside the same importer
   transaction where possible; otherwise as a separate write.
5. Return `{ kind: 'succeeded' }`.

Provider errors propagate; the worker records them as `lastError` and
schedules retry or DLQ. Missing/disabled connections do NOT throw — they
return the skipped outcome so replay after reconnection is possible via the
admin endpoint.

Behaviour parity check: each of the five current routes has a small dispatch
block (find-connection, importer call, `lastSyncedAt` update). The new
dispatcher copies each block verbatim into its provider branch; the routes
retain no dispatch logic after the migration.

### DLQ + manual replay

- **Observation**: `status='dlq'` rows carry `lastError` + `attempts`. On the
  DLQ transition the worker posts one Sentry incident via `captureError` —
  context lands in the Sentry event's `extra` (not tags, per how the existing
  `captureError` helper wraps `Sentry.captureException`). Invariant softened
  from the original draft: **at most one Sentry incident per DLQ transition**;
  a replay that then re-DLQs will emit another incident. Acceptable tradeoff.
- **Replay endpoint**: `POST /api/admin/webhook-events/[id]/replay` guarded
  by `Authorization: Bearer ${CRON_SECRET}` (user-approved; reuses the cron
  shared secret rather than building admin session infra).
  ```sql
  UPDATE webhook_events
     SET status = 'pending', attempts = 0, next_attempt_at = now(),
         last_error = NULL, processing_owner = NULL, processing_started_at = NULL
   WHERE id = $1 AND status IN ('dlq', 'skipped_no_connection')
   RETURNING id, provider, external_id, status;
  ```
  Response: the updated row, or 404 if not found / not eligible.
- **List endpoint**: `GET /api/admin/webhook-events?status=dlq&limit=50&cursor=<id>`
  behind the same guard. Cursor pagination on `received_at` DESC + `id`.

### Runbook (BookStack)

New page under Iron Pulse book (id 19): "Webhook event replay". Sections:

1. **What lives here** — one paragraph explaining the queue, the DLQ, the
   `skipped_no_connection` status.
2. **Find the failing event** — Sentry issue links (extra fields, not tags,
   include provider/externalId/eventId/attempts); SQL to inspect a specific
   event id (payload, lastError, attempts).
3. **Fix the underlying cause first** — checklist: expired token, disabled
   connection, importer regression, provider outage, malformed payload
   (400 at insert time; look at request logs).
4. **Replay** — one `curl` command with a placeholder for the event id and
   `CRON_SECRET`, and the expected response shape.
5. **Bulk operations** — retention SQL
   (`DELETE FROM webhook_events WHERE status='succeeded' AND completed_at < now() - interval '30 days'`),
   triage queries for DLQ backlog + oldest-pending age.
6. **Monitoring** — Uptime Kuma probes `/api/cron/webhook-worker/status`,
   thresholds documented (oldestPendingAgeSec>300s → warn; dlqCount>0 → alert).
7. **When to escalate** — DLQ from the same provider inside an hour → provider
   incident; `lastError` mentioning a schema/type-shape mismatch → open a bug
   ticket. (Do not claim schema drift from every `PrismaClientKnownRequestError`.)

## Test strategy

**Unit** (vitest, per package; tests live under `packages/api/__tests__/`
to match `packages/api/vitest.config.ts` include pattern `["__tests__/**/*.test.ts"]`):

- `webhook-dispatcher.test.ts` — mock each importer + DeviceConnection lookup;
  assert routing, `skipped_no_connection` return on missing/disabled connection,
  throw propagation on importer failure, `lastSyncedAt` write on success.
- `webhook-backoff.test.ts` — pure function returning `(attempts) → nextDelay`;
  table-driven test covers each attempt value + boundary.

**Integration** (real Postgres, existing pattern):

- Worker drains N pending events in one tick.
- Failed event moves to `pending` with correct `next_attempt_at` (assert within
  ±2s of expected).
- Sixth failure moves to `dlq`; `captureError` mock called exactly once with
  the expected `extra` fields (provider, externalId, eventId, attempts).
- `FOR UPDATE SKIP LOCKED`: two concurrent worker calls each get a disjoint
  batch.
- Stale-claim reclaimer: a row stuck in `processing` for >10 min becomes
  `pending` again on the next tick, `attempts` preserved.
- Ownership guard: a completion write with a stale `processing_owner` is a
  no-op (0 rows affected).
- Admin replay resets a `dlq` row and a `skipped_no_connection` row; hitting
  a `succeeded` or non-existent row returns 404.
- INSERT failure at handler → 500 to caller, no row.
- Zod validation failure at handler → 400 to caller, no row.
- Duplicate delivery (same `provider`+`externalId`) is a no-op.
- `/api/cron/webhook-worker/status` returns queue counts without advancing
  state (invariant: pending count unchanged after a status call).

**Route regression** (playwright + http-level tests):

- Each of the 5 `POST /api/{provider}/webhook` routes returns 200 and inserts
  one row for a legitimate event.
- Strava non-`create` events return 200 with no row.
- Polar `PING` returns 200 with no row.
- Empty Garmin batch returns 200 with no row.
- Garmin signature invalid → 401 with no row (existing behaviour preserved).

**Deliberately not tested here** (out of scope, called out in **Non-goals**):

- Idempotency of the importers themselves against duplicate re-runs of the
  same activity id. TASK-4 guarantees delivery; downstream idempotency is a
  separate hardening.

## Cutover

Single PR:

1. Prisma migration adds `WebhookEvent` model + `WebhookEventStatus` enum +
   indexes. Author with `pnpm --filter @zor/db prisma migrate dev --name webhook_events_queue` locally so migration
   history is recorded. Production applies via `prisma migrate deploy`
   (`docker/remote-deploy.sh:24`).
2. Dispatcher module added under `packages/api/src/lib/webhook-dispatcher.ts`.
3. All 5 webhook routes rewritten: keep provider-specific parsing + Garmin
   signature verify + non-event filters; drop the `(async () => {})()` block;
   INSERT + return 200.
4. Worker cron route added: `apps/web/src/app/api/cron/webhook-worker/route.ts`.
5. Status route added: `apps/web/src/app/api/cron/webhook-worker/status/route.ts`.
6. Admin replay + list routes added under
   `apps/web/src/app/api/admin/webhook-events/` (both guarded by
   `CRON_SECRET`).
7. Retention: add one line to the existing cleanup cron's `Promise.allSettled`
   list to delete `succeeded` rows older than 30 days. DLQ rows never
   auto-deleted; operator triage decides.
8. Unit + integration + route regression tests added.
9. BookStack runbook page created and linked from the API webhooks section.
10. **Deployment-time step (outside this repo):** register the new
    `/api/cron/webhook-worker` tick at `* * * * *` and Uptime Kuma probe on
    `/api/cron/webhook-worker/status` in staging + prod cron config. Verify
    the tick is firing in each environment before the ticket is closed —
    otherwise the queue silently grows.

No feature flag. No backfill. In-flight fire-and-forget imports at deploy
time either succeed (unaffected) or are lost (same failure mode as today; a
Sentry incident already covers that case). Once merged, the new code path
handles every subsequent inbound.

**Rollback plan**: the app can be rolled back safely — the `webhook_events`
table stays populated; the pre-migration app will simply not insert new
rows, and any pending rows sit until the next roll-forward. If the worker
itself is the problem, the operator can pause dispatching without a rollback
by disabling the cron tick.

## Risks + mitigations

- **Cron endpoint not invoked** → queue silently grows. Mitigation: the
  status endpoint + Uptime Kuma probe. Also caught by TASK-5 (alerting on
  cron failures) if that lands.
- **Withings deltas with same externalId lose newer state** — accepted
  limitation, documented above and in runbook. Reversal path: per-day dedupe
  key or dispatcher re-reads live state.
- **Importer partial-write failure** (Strava/Garmin create session then
  swallow route fetch errors) — out of scope. Documented in **Out of scope**
  so nobody assumes TASK-4 fixes it.
- **Migration order**: `WebhookEventStatus` enum must exist before the
  table. Prisma handles the order; verify locally by running
  `prisma migrate dev` against a fresh DB before merging. Production applies
  via `prisma migrate deploy`, not `db:push`.
- **Small crash window between DLQ commit and Sentry post**: acceptable.
  A retry of the worker tick will not re-post because the row is already
  DLQ. The operator will still find the DLQ row on manual triage; the missed
  Sentry incident is the cost.

## Out of scope (candidate follow-ups)

- **Admin session/role infrastructure + admin UI** over
  `/api/admin/webhook-events`. Curl behind CRON_SECRET is sufficient for
  this ticket.
- **Per-provider rate limiting** on the dispatcher (only Strava is chatty
  enough to matter today).
- **Importer idempotency hardening**: Strava/Garmin/Oura importers create
  sessions before fetching route data and swallow route-fetch errors;
  re-runs skip existing sessions. A successful `webhook_events` dispatch
  therefore does NOT guarantee the target activity was fully imported. Fix
  as a separate ticket per provider.
- **Downstream unique constraints** on `CardioSession.externalId`,
  `SleepData.externalId`, etc. — currently indexed but not unique. TASK-4
  does not enforce cross-row idempotency at the import layer.
- **Migrating the Stripe webhook route** to the same pattern — different
  failure model, handled elsewhere.
- **Per-activity Garmin queue granularity** — a follow-up if oncall shows
  batch retries starve sibling activities.
