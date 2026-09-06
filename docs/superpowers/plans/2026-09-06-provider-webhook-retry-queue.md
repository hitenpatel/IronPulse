# Provider Webhook Retry Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fire-and-forget provider webhook handlers with a durable Postgres-backed retry queue that guarantees each accepted event is persisted before response, bounds retries at six attempts with exponential backoff, dead-letters terminal failures with a Sentry incident, and exposes a curl-callable manual replay path.

**Architecture:** New `webhook_events` table is the queue. A minute-cadence `/api/cron/webhook-worker` route reclaims stale claims, then claims a small batch (5 rows max) under `FOR UPDATE SKIP LOCKED` and dispatches those rows IN PARALLEL (concurrency = batch size) OUTSIDE the claim transaction via `packages/api/src/lib/webhook-dispatcher.ts`. Sequential dispatch is intentionally avoided so the per-row lease never expires before its dispatch begins. `attempts` is incremented on FAILURE only (not on claim) so worker crashes do not burn the retry budget. Ownership tokens on completion writes stop a resurrected old worker from overwriting a reclaimed row. Six-attempt exponential backoff, DLQ on the sixth failure, one Sentry incident per DLQ transition posted AFTER the DLQ commit. Admin list + replay endpoints share `CRON_SECRET`.

**Tech Stack:** Next.js 15 App Router (`apps/web`), Prisma (`packages/db`, Postgres), `@zor/api` server-side lib, Vitest (integration tests hit a real Postgres — the URL is expected in `DATABASE_URL` at test time; existing `packages/api/__tests__/retention.test.ts` is the canonical real-DB test example to mirror), `@sentry/nextjs` via the existing `captureError` helper, `zod` for handler-side validation.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-06-provider-webhook-retry-queue-design.md` — read before implementation. Every task must satisfy the spec as written.
- Providers in scope (5): `strava`, `garmin`, `oura`, `withings`, `polar`.
- Tests for `packages/api` live under `packages/api/__tests__/*.test.ts` (flat), matches `packages/api/vitest.config.ts` include pattern `["__tests__/**/*.test.ts"]`.
- Tests for `apps/web` routes live under `apps/web/src/app/api/<route>/__tests__/route.test.ts` — mirrors `apps/web/src/app/api/garmin/webhook/__tests__/route.test.ts`.
- Prisma migration MUST be created via `pnpm --filter @zor/db db:migrate --name webhook_events_queue` against a local dev Postgres so migration history is recorded; production applies via `prisma migrate deploy` (`docker/remote-deploy.sh:24`), NOT `db:push`.
- Column names are snake_case via `@map(...)`; Prisma model uses camelCase fields. Every SQL example in this plan uses the snake_case column names as they land in Postgres.
- Repo scripts: `pnpm --filter @zor/api test` runs the full api vitest suite; use `pnpm --filter @zor/api exec vitest run <name>` to target one file. `pnpm --filter @zor/web test` for the web suite. There is NO `typecheck` script — `pnpm --filter @zor/api lint` runs `tsc --noEmit && eslint`. `pnpm --filter @zor/db db:generate` regenerates the Prisma client (no `build` script exists in `@zor/db`).
- **Security posture:** the same `CRON_SECRET` guards the worker, status, admin list and admin replay endpoints. This is a deliberate scope decision (spec §3.5); operators who hold the cron secret can list full webhook payloads and replay any DLQ row. Do not paste the secret into anything less trusted than Uptime Kuma or the ops SSH session. If audit later requires split credentials, follow-up ticket.
- No feature flag. No back-fill. The old fire-and-forget block is deleted in the same PR as the new queue.
- Commit style: conventional commits, lowercase subject (repo's commitlint config rejects sentence-case). Each task ends with a commit.

## File Structure

Create:
- `packages/db/prisma/migrations/<timestamp>_webhook_events_queue/migration.sql` — Prisma-generated
- `packages/api/src/lib/webhook-backoff.ts`
- `packages/api/src/lib/webhook-external-id.ts`
- `packages/api/src/lib/webhook-schemas.ts`
- `packages/api/src/lib/webhook-dispatcher.ts`
- `packages/api/src/lib/webhook-worker.ts` (worker algorithm as a library function)
- `packages/api/__tests__/webhook-backoff.test.ts`
- `packages/api/__tests__/webhook-external-id.test.ts`
- `packages/api/__tests__/webhook-schemas.test.ts`
- `packages/api/__tests__/webhook-dispatcher.test.ts`
- `packages/api/__tests__/webhook-worker.test.ts` (integration; real Postgres)
- `apps/web/src/app/api/cron/webhook-worker/route.ts` + `__tests__/route.test.ts`
- `apps/web/src/app/api/cron/webhook-worker/status/route.ts` + `__tests__/route.test.ts`
- `apps/web/src/app/api/admin/webhook-events/route.ts` + `__tests__/route.test.ts`
- `apps/web/src/app/api/admin/webhook-events/[id]/replay/route.ts` + `__tests__/route.test.ts`
- `apps/web/src/app/api/strava/webhook/__tests__/route.test.ts` (new)
- `apps/web/src/app/api/oura/webhook/__tests__/route.test.ts` (new)
- `apps/web/src/app/api/withings/webhook/__tests__/route.test.ts` (new)
- `apps/web/src/app/api/polar/webhook/__tests__/route.test.ts` (new)

Modify:
- `packages/db/prisma/schema.prisma` — add `WebhookEventStatus` enum + `WebhookEvent` model + `User.webhookEvents` inverse relation. Also add `@@unique([provider, providerAccountId])` to `DeviceConnection` (see Task 1) so per-provider account lookups are deterministic.
- `apps/web/src/app/api/strava/webhook/route.ts`
- `apps/web/src/app/api/garmin/webhook/route.ts`
- `apps/web/src/app/api/oura/webhook/route.ts`
- `apps/web/src/app/api/withings/webhook/route.ts`
- `apps/web/src/app/api/polar/webhook/route.ts`
- `apps/web/src/app/api/garmin/webhook/__tests__/route.test.ts` — assert row inserted, no importer call.
- `apps/web/src/app/api/cron/cleanup-tokens/route.ts` — one entry each in `Promise.allSettled` AND the parallel `tableNames` array (see Task 15).

---

### Task 0: Prerequisite survey — capture ground truth

**Files:** none modified. Findings recorded inline into later tasks as-needed.

**Interfaces:** none.

Purpose: pin down every payload shape, importer signature, and test-infra assumption BEFORE writing schemas or dispatcher code. Codex flagged the prior draft for inventing an `importOuraData` symbol that does not exist and for a Withings notification schema that ignored the `appli` filter. This task exists to make that class of error impossible.

- [ ] **Step 1: Confirm importer signatures**

```bash
grep -n "^export async function import" packages/api/src/lib/strava.ts packages/api/src/lib/garmin.ts packages/api/src/lib/oura.ts packages/api/src/lib/withings.ts packages/api/src/lib/polar.ts
```

Expected findings (must match; if any drift has occurred since 2026-09-06, update the dispatcher in Task 5 accordingly):
- `importStravaActivity(activityId: number, connection, db)`
- `importGarminActivity(activityId: number, connection, db)`
- `importOuraSleep(connection, db, startDate: string, endDate: string)`
- `importOuraReadiness(connection, db, startDate: string, endDate: string)`
- `importWithingsMeasures(measuregrps, userId: string, db)` — takes measure groups array + userId, NOT a connection.
- `importPolarActivity(entityId: string, connection, db)`

- [ ] **Step 2: Confirm current route payload shapes and filters**

Read each of the five route files:
- `apps/web/src/app/api/strava/webhook/route.ts` — `{object_type, aspect_type, object_id, owner_id}`; process only when `object_type === "activity" && aspect_type === "create"`.
- `apps/web/src/app/api/garmin/webhook/route.ts` — `{activityDetails: [{userId, activityId}]}`; iterates per-activity, each with its own connection lookup by `userId`; keep HMAC verification on the RAW body BEFORE parse.
- `apps/web/src/app/api/oura/webhook/route.ts` — `{event_type, data_type, user_id, event_date}`; process only when `data_type ∈ {"sleep", "daily_readiness"}`; dispatch uses `startDate === endDate === event_date` window.
- `apps/web/src/app/api/withings/webhook/route.ts` — body is `application/x-www-form-urlencoded` with `{userid, appli: number, startdate: number, enddate: number}`; process only when `appli === 1 || appli === 4`; dispatch calls `ensureWithingsFreshToken` + `fetchWithingsApi("/measure", ...)` and only then `importWithingsMeasures(measuregrps, connection.userId, db)`; preserve `HEAD` and `GET` handlers.
- `apps/web/src/app/api/polar/webhook/route.ts` — `{event, user_id: string, entity_id, timestamp, url}`; process only when `event === "EXERCISE"`.

- [ ] **Step 3: Confirm cleanup-tokens shape**

```bash
sed -n '30,80p' apps/web/src/app/api/cron/cleanup-tokens/route.ts
```

Expected: a `Promise.allSettled` list AND a parallel `tableNames as const` array; the two are index-aligned so a result's label comes from `tableNames[i]`. Task 15 must append to BOTH arrays (and update its existing test's mocked `webhookEvent` delegate).

- [ ] **Step 4: Confirm real-Postgres test pattern**

```bash
head -40 packages/api/__tests__/retention.test.ts
grep -n "PrismaClient\|DATABASE_URL\|\$disconnect" packages/api/__tests__/retention.test.ts
```

Note the initialization pattern (top-level `const db = new PrismaClient()` seen elsewhere in the suite; `afterAll` disconnect where present). Task 6's integration test MUST mirror this pattern including `await db.$disconnect()` in `afterAll` — Codex flagged the prior draft for omitting disconnect.

- [ ] **Step 5: Confirm DeviceConnection unique constraints**

```bash
grep -n "@@unique\|providerAccountId" packages/db/prisma/schema.prisma | grep -i device
```

Expected today: `@@unique([userId, provider])`. There is NO `(provider, providerAccountId)` constraint. Task 1 adds one so per-provider account lookups are deterministic (a duplicate providerAccountId across users would otherwise let `findFirst` pick nondeterministically).

- [ ] **Step 6: Record findings**

If any expected finding does not match (importer renamed, filter changed, cleanup route restructured), update the affected task in this file BEFORE proceeding. Do not adapt at implementation time — the plan is the contract.

- [ ] **Step 7: Commit (no code change; the plan file itself may have been amended)**

If the plan was amended, commit:

```bash
git add docs/superpowers/plans/2026-09-06-provider-webhook-retry-queue.md
git commit -m "docs(plan): task-4 prerequisite survey findings"
```

Otherwise skip the commit and move on.

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_webhook_events_queue/migration.sql` (Prisma-generated)

**Interfaces:**
- Consumes: Task 0 findings.
- Produces: `WebhookEvent` and `WebhookEventStatus` on the `@zor/db` PrismaClient. Also `DeviceConnection.@@unique([provider, providerAccountId])` — every subsequent task depends on these.

- [ ] **Step 1: Add enum + model + DeviceConnection constraint**

Insert after the existing `DeviceConnection` model:

```prisma
enum WebhookEventStatus {
  pending
  processing
  succeeded
  skipped_no_connection
  dlq
}

model WebhookEvent {
  id                    String              @id @default(cuid())
  provider              String              @db.VarChar(16)
  externalId            String              @map("external_id") @db.VarChar(128)
  userId                String?             @map("user_id") @db.Uuid
  payload               Json
  receivedAt            DateTime            @default(now()) @map("received_at")
  status                WebhookEventStatus  @default(pending)
  attempts              Int                 @default(0)
  lastError             String?             @map("last_error") @db.Text
  lastAttemptAt         DateTime?           @map("last_attempt_at")
  processingStartedAt   DateTime?           @map("processing_started_at")
  processingOwner       String?             @map("processing_owner") @db.VarChar(64)
  nextAttemptAt         DateTime            @default(now()) @map("next_attempt_at")
  completedAt           DateTime?           @map("completed_at")

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, nextAttemptAt])
  @@index([status, processingStartedAt])
  @@index([userId])
  @@unique([provider, externalId], name: "provider_external_id_unique")
  @@map("webhook_events")
}
```

Modify `DeviceConnection` — add one line to its block:

```prisma
  @@unique([provider, providerAccountId], name: "provider_provider_account_id_unique")
```

Add the inverse relation on `User`:

```prisma
  webhookEvents WebhookEvent[]
```

- [ ] **Step 2: Generate migration**

Ensure a local dev Postgres is running (see `docker-compose.dev.yml`), then:

```bash
pnpm --filter @zor/db exec prisma migrate dev --name webhook_events_queue
```

Verify the SQL contains `CREATE TYPE "WebhookEventStatus"` BEFORE `CREATE TABLE "webhook_events"`, and includes the `ALTER TABLE "device_connections" ADD CONSTRAINT ... UNIQUE ...` line. If DeviceConnection already carries duplicate `(provider, providerAccountId)` rows in dev data, delete the offending rows or reassign providerAccountId before re-running.

- [ ] **Step 3: Regenerate client, sanity check the delegate exists**

```bash
pnpm --filter @zor/db db:generate
node -e "const {PrismaClient} = require('@zor/db'); const c = new PrismaClient(); console.log(typeof c.webhookEvent);"
```

Expected: `object`.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations
git commit -m "feat(db): webhook_events queue + device_connection unique for task-4"
```

---

### Task 2: Backoff schedule (pure function, TDD)

**Files:**
- Create: `packages/api/src/lib/webhook-backoff.ts`
- Create: `packages/api/__tests__/webhook-backoff.test.ts`

**Interfaces:**
- Consumes: none.
- Produces:
  - `nextAttemptDelayMs(failedAttempts: number): number | null` — `failedAttempts` is the total number of attempts made INCLUDING the one that just failed. Returns `null` when the caller should DLQ (i.e. `failedAttempts >= MAX_ATTEMPTS`).
  - `MAX_ATTEMPTS = 6` — used by the worker as the DLQ threshold.
- Consumed by: Task 6 (worker).

Semantics per spec §3.5: the worker increments `attempts` on failure only (not on claim), so `nextAttemptDelayMs(1)` returns the delay after the 1st failure, and so on. The 6th failure returns `null`.

- [ ] **Step 1: Write the failing test**

Create `packages/api/__tests__/webhook-backoff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { nextAttemptDelayMs, MAX_ATTEMPTS } from "../src/lib/webhook-backoff";

describe("nextAttemptDelayMs", () => {
  it("MAX_ATTEMPTS is 6", () => {
    expect(MAX_ATTEMPTS).toBe(6);
  });
  it("returns 1 min after the 1st failed attempt", () => {
    expect(nextAttemptDelayMs(1)).toBe(60_000);
  });
  it("returns 5 min after the 2nd failed attempt", () => {
    expect(nextAttemptDelayMs(2)).toBe(5 * 60_000);
  });
  it("returns 30 min after the 3rd failed attempt", () => {
    expect(nextAttemptDelayMs(3)).toBe(30 * 60_000);
  });
  it("returns 2 h after the 4th failed attempt", () => {
    expect(nextAttemptDelayMs(4)).toBe(2 * 60 * 60_000);
  });
  it("returns 6 h after the 5th failed attempt", () => {
    expect(nextAttemptDelayMs(5)).toBe(6 * 60 * 60_000);
  });
  it("returns null (DLQ) after the 6th failed attempt", () => {
    expect(nextAttemptDelayMs(6)).toBeNull();
  });
  it("returns null for any attempts count above 6", () => {
    expect(nextAttemptDelayMs(7)).toBeNull();
    expect(nextAttemptDelayMs(100)).toBeNull();
  });
  it("throws for non-positive attempts", () => {
    expect(() => nextAttemptDelayMs(0)).toThrow();
    expect(() => nextAttemptDelayMs(-1)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @zor/api exec vitest run webhook-backoff
```

- [ ] **Step 3: Implement**

Create `packages/api/src/lib/webhook-backoff.ts`:

```ts
const GAPS_MS: readonly number[] = [
  1 * 60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
];

export const MAX_ATTEMPTS = GAPS_MS.length + 1; // 6 total attempts; DLQ on the 6th failure.

export function nextAttemptDelayMs(failedAttempts: number): number | null {
  if (!Number.isInteger(failedAttempts) || failedAttempts < 1) {
    throw new Error(`nextAttemptDelayMs: failedAttempts must be a positive integer, got ${failedAttempts}`);
  }
  if (failedAttempts >= MAX_ATTEMPTS) return null;
  return GAPS_MS[failedAttempts - 1];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @zor/api exec vitest run webhook-backoff
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/webhook-backoff.ts packages/api/__tests__/webhook-backoff.test.ts
git commit -m "feat(api): webhook retry backoff schedule for task-4"
```

---

### Task 3: External ID helper (pure function, TDD)

**Files:**
- Create: `packages/api/src/lib/webhook-external-id.ts`
- Create: `packages/api/__tests__/webhook-external-id.test.ts`

**Interfaces:**
- Consumes: Node `crypto`.
- Produces: `hashPayload(payload: unknown): string` — 64-char hex sha256 of the canonical JSON stringification. Object keys are sorted; **array order is preserved** (arrays carry meaningful order per provider payload contracts). `undefined` at any depth is treated as key-absent.

Consumed by Tasks 11 (Garmin) and 13 (Withings) when the provider event has no native id. Not used by Strava/Oura/Polar which always have native ids.

- [ ] **Step 1: Write the failing test**

Create `packages/api/__tests__/webhook-external-id.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPayload } from "../src/lib/webhook-external-id";

describe("hashPayload", () => {
  it("returns a 64-char hex string", () => {
    expect(hashPayload({ foo: "bar" })).toMatch(/^[0-9a-f]{64}$/);
  });
  it("is deterministic for the same input", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ a: 1, b: 2 }));
  });
  it("is stable under object-key reordering", () => {
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });
  it("is NOT stable under array reordering (arrays are ordered)", () => {
    expect(hashPayload({ arr: [1, 2, 3] })).not.toBe(hashPayload({ arr: [3, 2, 1] }));
  });
  it("differs for different payloads", () => {
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
  it("handles nested objects and arrays", () => {
    expect(hashPayload({ arr: [1, 2, { x: "y" }] })).toBe(hashPayload({ arr: [1, 2, { x: "y" }] }));
  });
  it("treats undefined at any depth as key-absent", () => {
    expect(hashPayload({ a: 1, b: undefined })).toBe(hashPayload({ a: 1 }));
  });
});
```

- [ ] **Step 2: Run + fail**

```bash
pnpm --filter @zor/api exec vitest run webhook-external-id
```

- [ ] **Step 3: Implement**

Create `packages/api/src/lib/webhook-external-id.ts`:

```ts
import { createHash } from "node:crypto";

function canonicalize(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => canonicalize(x) ?? null);
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src).sort()) {
    const c = canonicalize(src[k]);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)))
    .digest("hex");
}
```

- [ ] **Step 4: Run + pass**

```bash
pnpm --filter @zor/api exec vitest run webhook-external-id
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/webhook-external-id.ts packages/api/__tests__/webhook-external-id.test.ts
git commit -m "feat(api): stable payload hash for webhook external id fallback"
```

---

### Task 4: Per-provider zod schemas + key extractors (TDD)

**Files:**
- Create: `packages/api/src/lib/webhook-schemas.ts`
- Create: `packages/api/__tests__/webhook-schemas.test.ts`

**Interfaces:**
- Consumes: `zod` (already a dep of `@zor/api`).
- Produces:
  - `stravaWebhookSchema`, `garminWebhookSchema`, `ouraWebhookSchema`, `withingsWebhookSchema`, `polarWebhookSchema` — five `z.ZodType`s reflecting the payload shapes captured in Task 0.
  - Per-provider key extractor returning `{ providerAccountId: string | null, externalId: string | null }`. `null` on either field signals the caller must fall back (skip dispatch OR use sha256 fallback for externalId).

Schema decisions locked from Task 0:

- **Strava**: `{ object_type: string, aspect_type: string, object_id: number, owner_id: number }` — strict; native externalId = `String(object_id)`.
- **Garmin**: `{ activityDetails?: Array<{ userId: string, activityId: number }> }` — a request is ONE queue row per batch; hash of the whole batch is the externalId; `providerAccountId` is null (batch may span users — Task 5 looks up per activity).
- **Oura**: `{ event_type: string, data_type: string, user_id: string, event_date: string }` — externalId = `${user_id}:${data_type}:${event_date}` (deterministic string, no hash fallback needed).
- **Withings**: `{ userid: string, appli: number, startdate: number, enddate: number }` — coerce `appli`/`startdate`/`enddate` from strings via `z.coerce.number()`; `providerAccountId = userid`; externalId hashed by caller.
- **Polar**: `{ event: string, user_id: string, entity_id: string, timestamp: string, url: string }` — externalId = `entity_id`; `providerAccountId = user_id`.

- [ ] **Step 1: Write the failing test**

Create `packages/api/__tests__/webhook-schemas.test.ts` — write out every describe block in full. Do NOT abbreviate any provider block.

```ts
import { describe, expect, it } from "vitest";
import {
  stravaWebhookSchema, garminWebhookSchema, ouraWebhookSchema,
  withingsWebhookSchema, polarWebhookSchema,
  stravaEventKey, garminEventKey, ouraEventKey,
  withingsEventKey, polarEventKey,
} from "../src/lib/webhook-schemas";

describe("stravaWebhookSchema", () => {
  it("accepts a well-formed create event", () => {
    expect(stravaWebhookSchema.safeParse({ object_type: "activity", aspect_type: "create", object_id: 42, owner_id: 7 }).success).toBe(true);
  });
  it("rejects missing owner_id", () => {
    expect(stravaWebhookSchema.safeParse({ object_type: "activity", aspect_type: "create", object_id: 42 }).success).toBe(false);
  });
});

describe("stravaEventKey", () => {
  it("maps owner_id -> providerAccountId and object_id -> externalId", () => {
    const p = stravaWebhookSchema.parse({ object_type: "activity", aspect_type: "create", object_id: 42, owner_id: 7 });
    expect(stravaEventKey(p)).toEqual({ providerAccountId: "7", externalId: "42" });
  });
});

describe("garminWebhookSchema", () => {
  it("accepts a batch, an empty batch, and a batchless payload", () => {
    expect(garminWebhookSchema.safeParse({ activityDetails: [{ userId: "u", activityId: 1 }] }).success).toBe(true);
    expect(garminWebhookSchema.safeParse({ activityDetails: [] }).success).toBe(true);
    expect(garminWebhookSchema.safeParse({}).success).toBe(true);
  });
  it("rejects an activity entry missing activityId", () => {
    expect(garminWebhookSchema.safeParse({ activityDetails: [{ userId: "u" }] }).success).toBe(false);
  });
});

describe("garminEventKey", () => {
  it("returns null providerAccountId (per-activity lookup happens in dispatcher) and null externalId (hash fallback)", () => {
    const p = garminWebhookSchema.parse({ activityDetails: [{ userId: "u1", activityId: 1 }] });
    expect(garminEventKey(p)).toEqual({ providerAccountId: null, externalId: null });
  });
  it("returns nulls for an empty batch too", () => {
    const p = garminWebhookSchema.parse({ activityDetails: [] });
    expect(garminEventKey(p)).toEqual({ providerAccountId: null, externalId: null });
  });
});

describe("ouraWebhookSchema", () => {
  it("accepts a sleep event", () => {
    expect(ouraWebhookSchema.safeParse({ event_type: "create", data_type: "sleep", user_id: "u1", event_date: "2026-09-06" }).success).toBe(true);
  });
  it("rejects missing event_date", () => {
    expect(ouraWebhookSchema.safeParse({ event_type: "create", data_type: "sleep", user_id: "u1" }).success).toBe(false);
  });
});

describe("ouraEventKey", () => {
  it("maps user_id -> providerAccountId and composes externalId from user_id, data_type, event_date", () => {
    const p = ouraWebhookSchema.parse({ event_type: "create", data_type: "sleep", user_id: "u1", event_date: "2026-09-06" });
    expect(ouraEventKey(p)).toEqual({ providerAccountId: "u1", externalId: "u1:sleep:2026-09-06" });
  });
});

describe("withingsWebhookSchema", () => {
  it("coerces appli/startdate/enddate from strings (form-urlencoded)", () => {
    const r = withingsWebhookSchema.safeParse({ userid: "42", appli: "1", startdate: "100", enddate: "200" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ userid: "42", appli: 1, startdate: 100, enddate: 200 });
  });
  it("rejects missing userid", () => {
    expect(withingsWebhookSchema.safeParse({ appli: 1, startdate: 0, enddate: 0 }).success).toBe(false);
  });
});

describe("withingsEventKey", () => {
  it("maps userid and returns null externalId (hash fallback)", () => {
    const p = withingsWebhookSchema.parse({ userid: "42", appli: 1, startdate: 100, enddate: 200 });
    expect(withingsEventKey(p)).toEqual({ providerAccountId: "42", externalId: null });
  });
});

describe("polarWebhookSchema", () => {
  it("accepts an EXERCISE event with all fields", () => {
    expect(polarWebhookSchema.safeParse({ event: "EXERCISE", user_id: "9", entity_id: "abc", timestamp: "t", url: "u" }).success).toBe(true);
  });
  it("rejects numeric user_id (current route treats user_id as string)", () => {
    expect(polarWebhookSchema.safeParse({ event: "EXERCISE", user_id: 9, entity_id: "abc", timestamp: "t", url: "u" }).success).toBe(false);
  });
});

describe("polarEventKey", () => {
  it("maps user_id -> providerAccountId and entity_id -> externalId", () => {
    const p = polarWebhookSchema.parse({ event: "EXERCISE", user_id: "9", entity_id: "abc", timestamp: "t", url: "u" });
    expect(polarEventKey(p)).toEqual({ providerAccountId: "9", externalId: "abc" });
  });
});
```

- [ ] **Step 2: Run + fail**

```bash
pnpm --filter @zor/api exec vitest run webhook-schemas
```

- [ ] **Step 3: Implement**

Create `packages/api/src/lib/webhook-schemas.ts`:

```ts
import { z } from "zod";

// Strava
export const stravaWebhookSchema = z.object({
  object_type: z.string(),
  aspect_type: z.string(),
  object_id: z.number(),
  owner_id: z.number(),
});
export type StravaWebhookEvent = z.infer<typeof stravaWebhookSchema>;
export function stravaEventKey(p: StravaWebhookEvent) {
  return { providerAccountId: String(p.owner_id), externalId: String(p.object_id) };
}

// Garmin — one queue row per batch; per-activity connection lookup happens in the dispatcher.
export const garminWebhookSchema = z.object({
  activityDetails: z
    .array(z.object({ userId: z.string(), activityId: z.number() }))
    .optional(),
});
export type GarminWebhookEvent = z.infer<typeof garminWebhookSchema>;
export function garminEventKey(_p: GarminWebhookEvent) {
  return { providerAccountId: null as string | null, externalId: null as string | null };
}

// Oura
export const ouraWebhookSchema = z.object({
  event_type: z.string(),
  data_type: z.string(),
  user_id: z.string(),
  event_date: z.string(),
});
export type OuraWebhookEvent = z.infer<typeof ouraWebhookSchema>;
export function ouraEventKey(p: OuraWebhookEvent) {
  return {
    providerAccountId: p.user_id,
    externalId: `${p.user_id}:${p.data_type}:${p.event_date}`,
  };
}

// Withings — form-urlencoded body; coerce numerics.
export const withingsWebhookSchema = z.object({
  userid: z.string(),
  appli: z.coerce.number(),
  startdate: z.coerce.number(),
  enddate: z.coerce.number(),
});
export type WithingsWebhookEvent = z.infer<typeof withingsWebhookSchema>;
export function withingsEventKey(p: WithingsWebhookEvent) {
  return { providerAccountId: p.userid, externalId: null as string | null };
}

// Polar — user_id is a string per the current route contract.
export const polarWebhookSchema = z.object({
  event: z.string(),
  user_id: z.string(),
  entity_id: z.string(),
  timestamp: z.string(),
  url: z.string(),
});
export type PolarWebhookEvent = z.infer<typeof polarWebhookSchema>;
export function polarEventKey(p: PolarWebhookEvent) {
  return { providerAccountId: p.user_id, externalId: p.entity_id };
}
```

- [ ] **Step 4: Run + pass**

```bash
pnpm --filter @zor/api exec vitest run webhook-schemas
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/webhook-schemas.ts packages/api/__tests__/webhook-schemas.test.ts
git commit -m "feat(api): per-provider webhook schemas + key extractors"
```

---

### Task 5: Dispatcher

**Files:**
- Create: `packages/api/src/lib/webhook-dispatcher.ts`
- Create: `packages/api/__tests__/webhook-dispatcher.test.ts`
- Reference (READ, do not modify): `packages/api/src/lib/strava.ts`, `garmin.ts`, `oura.ts`, `withings.ts`, `polar.ts`; the five current webhook routes.

**Interfaces:**
- Consumes: `@zor/db` PrismaClient (`DeviceConnection` model), the five importers listed in Task 0, and the five schema+key modules from Task 4.
- Produces:
  ```ts
  export type DispatchOutcome = { kind: "succeeded" } | { kind: "skipped_no_connection" };
  export async function dispatchWebhookEvent(args: {
    provider: "strava" | "garmin" | "oura" | "withings" | "polar";
    payload: unknown;   // JSON-parsed; caller has zod-validated at insert time
    db: PrismaClient;
  }): Promise<DispatchOutcome>; // throws on genuine import failure
  ```
- Consumed by: Task 6 (worker).

Semantics locked from Task 0 findings:
- Garmin: dispatcher iterates `activityDetails`, does a per-activity `findFirst({provider:"garmin", providerAccountId:activity.userId})`, and calls `importGarminActivity(activity.activityId, connection, db)` for each. If the connection lookup for a given activity returns null/disabled, that activity is silently skipped (matches current fire-and-forget behaviour) but does NOT short-circuit the batch. If the ENTIRE batch produces zero valid `(activity, connection)` pairs, return `skipped_no_connection`. Otherwise mark `lastSyncedAt` on each connection touched and return `succeeded`.
- Oura: dispatcher branches on `data_type`. For `sleep` calls `importOuraSleep(connection, db, event_date, event_date)`; for `daily_readiness` calls `importOuraReadiness(...)`. Any other `data_type` slipped past the ingest filter is treated as `skipped_no_connection`.
- Withings: dispatcher calls `ensureWithingsFreshToken(connection, db)`, then `fetchWithingsApi("/measure", accessToken, { action:"getmeas", meastype:"1,6,8,76,88,77,10,9", startdate, enddate })`, then `importWithingsMeasures(response.body.measuregrps, connection.userId, db)`.

- [ ] **Step 1: Write the failing tests**

Create `packages/api/__tests__/webhook-dispatcher.test.ts`. Use `vi.hoisted` for mock refs so hoisted `vi.mock` factories can see them (Vitest 3 pattern; a bare top-level `const mock = vi.fn()` fails "cannot access before initialization" inside a hoisted factory).

Write the four-test block IN FULL for each of the five providers (skipped_no_connection when no connection, skipped when syncEnabled=false, succeeded + `lastSyncedAt` update on happy path, importer error propagates). For Garmin ALSO include a mixed-batch case where one activity has a connection and one does not: assert one importer call, one `lastSyncedAt` update, and `succeeded`.

Skeleton:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const importers = vi.hoisted(() => ({
  importStravaActivity: vi.fn(),
  importGarminActivity: vi.fn(),
  importOuraSleep: vi.fn(),
  importOuraReadiness: vi.fn(),
  importWithingsMeasures: vi.fn(),
  importPolarActivity: vi.fn(),
  ensureWithingsFreshToken: vi.fn(),
  fetchWithingsApi: vi.fn(),
}));

vi.mock("../src/lib/strava", () => ({ importStravaActivity: importers.importStravaActivity }));
vi.mock("../src/lib/garmin", () => ({ importGarminActivity: importers.importGarminActivity }));
vi.mock("../src/lib/oura", () => ({ importOuraSleep: importers.importOuraSleep, importOuraReadiness: importers.importOuraReadiness }));
vi.mock("../src/lib/withings", () => ({
  importWithingsMeasures: importers.importWithingsMeasures,
  ensureWithingsFreshToken: importers.ensureWithingsFreshToken,
  fetchWithingsApi: importers.fetchWithingsApi,
}));
vi.mock("../src/lib/polar", () => ({ importPolarActivity: importers.importPolarActivity }));

import { dispatchWebhookEvent } from "../src/lib/webhook-dispatcher";

function fakeDb(connectionByLookup: Array<{ where: any; result: any }>) {
  const findFirst = vi.fn(async ({ where }: any) => {
    const m = connectionByLookup.find((c) => c.where.provider === where.provider && c.where.providerAccountId === where.providerAccountId);
    return m?.result ?? null;
  });
  const update = vi.fn(async () => ({}));
  return { deviceConnection: { findFirst, update } } as any;
}

beforeEach(() => {
  Object.values(importers).forEach((m) => (m as any).mockReset?.());
});

// ---------- Strava ----------
// (write all four cases fully)

// ---------- Garmin ----------
// (write all cases fully, including the mixed-batch test:
//  - two activities, only user "u1" has a live connection, "u2" does not
//  - assert importGarminActivity called ONCE with activityId=1, not twice
//  - assert deviceConnection.update called ONCE (for u1)
//  - assert return value is { kind: "succeeded" })

// ---------- Oura sleep ----------
// (write all cases; ALSO a daily_readiness case using importOuraReadiness)

// ---------- Withings ----------
// (write all cases; assert ensureWithingsFreshToken called with (connection, db);
//  assert fetchWithingsApi called with "/measure", token, {action:"getmeas", meastype, startdate, enddate};
//  assert importWithingsMeasures called with (measuregrps, connection.userId, db))

// ---------- Polar ----------
// (write all cases)
```

- [ ] **Step 2: Run + fail**

```bash
pnpm --filter @zor/api exec vitest run webhook-dispatcher
```

- [ ] **Step 3: Implement**

Create `packages/api/src/lib/webhook-dispatcher.ts`:

```ts
import type { PrismaClient } from "@zor/db";
import { importStravaActivity } from "./strava";
import { importGarminActivity } from "./garmin";
import { importOuraSleep, importOuraReadiness } from "./oura";
import { ensureWithingsFreshToken, fetchWithingsApi, importWithingsMeasures } from "./withings";
import { importPolarActivity } from "./polar";
import {
  stravaWebhookSchema, garminWebhookSchema, ouraWebhookSchema,
  withingsWebhookSchema, polarWebhookSchema,
} from "./webhook-schemas";

export type DispatchOutcome = { kind: "succeeded" } | { kind: "skipped_no_connection" };

async function findConn(db: PrismaClient, provider: string, providerAccountId: string) {
  return db.deviceConnection.findFirst({ where: { provider, providerAccountId } });
}
async function markSynced(db: PrismaClient, connId: string) {
  await db.deviceConnection.update({ where: { id: connId }, data: { lastSyncedAt: new Date() } });
}

export async function dispatchWebhookEvent(args: {
  provider: "strava" | "garmin" | "oura" | "withings" | "polar";
  payload: unknown;
  db: PrismaClient;
}): Promise<DispatchOutcome> {
  const { provider, payload, db } = args;
  switch (provider) {
    case "strava": {
      const p = stravaWebhookSchema.parse(payload);
      const conn = await findConn(db, "strava", String(p.owner_id));
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      await importStravaActivity(p.object_id, conn, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "garmin": {
      const p = garminWebhookSchema.parse(payload);
      const activities = p.activityDetails ?? [];
      if (activities.length === 0) return { kind: "skipped_no_connection" };
      const connCache = new Map<string, any>();
      let dispatched = 0;
      const syncedIds = new Set<string>();
      for (const a of activities) {
        let conn = connCache.get(a.userId);
        if (conn === undefined) {
          conn = await findConn(db, "garmin", a.userId);
          connCache.set(a.userId, conn);
        }
        if (!conn || !conn.syncEnabled) continue;
        await importGarminActivity(a.activityId, conn, db);
        dispatched++;
        syncedIds.add(conn.id);
      }
      if (dispatched === 0) return { kind: "skipped_no_connection" };
      for (const id of syncedIds) await markSynced(db, id);
      return { kind: "succeeded" };
    }
    case "oura": {
      const p = ouraWebhookSchema.parse(payload);
      const conn = await findConn(db, "oura", p.user_id);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      if (p.data_type === "sleep") {
        await importOuraSleep(conn, db, p.event_date, p.event_date);
      } else if (p.data_type === "daily_readiness") {
        await importOuraReadiness(conn, db, p.event_date, p.event_date);
      } else {
        return { kind: "skipped_no_connection" };
      }
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "withings": {
      const p = withingsWebhookSchema.parse(payload);
      const conn = await findConn(db, "withings", p.userid);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      const accessToken = await ensureWithingsFreshToken(conn, db);
      const response = await fetchWithingsApi<{
        status: number;
        body: { measuregrps: Array<any> };
      }>("/measure", accessToken, {
        action: "getmeas",
        meastype: "1,6,8,76,88,77,10,9",
        startdate: p.startdate,
        enddate: p.enddate,
      });
      await importWithingsMeasures(response.body.measuregrps, conn.userId, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "polar": {
      const p = polarWebhookSchema.parse(payload);
      const conn = await findConn(db, "polar", p.user_id);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      await importPolarActivity(p.entity_id, conn, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
  }
}
```

- [ ] **Step 4: Run + pass**

```bash
pnpm --filter @zor/api exec vitest run webhook-dispatcher
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/webhook-dispatcher.ts packages/api/__tests__/webhook-dispatcher.test.ts
git commit -m "feat(api): webhook dispatcher across five providers"
```

---

### Task 6: Worker algorithm + integration test (real Postgres)

**Files:**
- Create: `packages/api/src/lib/webhook-worker.ts`
- Create: `packages/api/__tests__/webhook-worker.test.ts`

**Interfaces:**
- Consumes: Task 2 (`nextAttemptDelayMs`, `MAX_ATTEMPTS`), Task 5 (`dispatchWebhookEvent`), `@zor/db` PrismaClient, `captureError` from `./capture-error`.
- Produces:
  ```ts
  export async function runWebhookWorkerTick(args: {
    db: PrismaClient;
    ownerToken: string;
    batchSize?: number;      // default 5
    stalenessMs?: number;    // default 10 * 60_000
  }): Promise<{ reclaimed: number; processed: number; succeeded: number; skipped: number; failed: number; dlq: number }>;

  export async function getWebhookWorkerStatus(db: PrismaClient): Promise<{
    dueCount: number;              // pending AND next_attempt_at <= now()
    oldestDueAgeSec: number | null;// max(now - received_at) over due rows
    pendingCount: number;
    processingCount: number;
    dlqCount: number;
    oldestProcessingAgeSec: number | null;
  }>;
  ```
- Consumed by: Tasks 7 (cron route) and 8 (status route).

Algorithm (locked from spec + Codex reconciliation):

1. **Phase A — reclaim stale claims** (single UPDATE, no transaction needed).
2. **Phase B — claim + parallel dispatch**:
   a. In one short transaction, `UPDATE ... SET status='processing', last_attempt_at=now(), processing_started_at=now(), processing_owner=$owner ... RETURNING id, provider, external_id, payload, attempts` for up to `batchSize` (default 5) `pending` rows whose `next_attempt_at <= now()`, ordered by `received_at ASC, id ASC` (tie-breaker), using `FOR UPDATE SKIP LOCKED`. `attempts` is NOT incremented here.
   b. OUTSIDE the transaction, dispatch all claimed rows IN PARALLEL via `Promise.all(rows.map(...))`. Concurrency = batchSize = 5, so tick wall time ≈ single import duration (~30s p99), well under the 10-min stale threshold.
   c. Per row, wrap dispatch in one try/catch. Wrap the completion state write in a SEPARATE try/catch with 3× retry (100ms between). A completion-write failure is NOT counted as an import failure; it logs to `captureError` with `{provider, eventId, phase: "state-write"}` and leaves the row in `processing` for the next tick's stale-reclaim.
   d. On dispatch success → `status='succeeded'|'skipped_no_connection'`, `completed_at=now()`, `last_error=null`, ownership cleared. Guard the UPDATE with `WHERE id=$1 AND processing_owner=$owner` so a stale worker cannot overwrite a reclaimed row.
   e. On dispatch failure → increment `attempts` inside the failure UPDATE. If `attempts + 1 < MAX_ATTEMPTS` → `status='pending'`, `next_attempt_at=now() + nextAttemptDelayMs(attempts+1)`. Otherwise → `status='dlq'`, `completed_at=now()`, and AFTER the UPDATE commits, call `captureError(err, { provider, externalId, eventId, attempts: attempts+1 })`.

- [ ] **Step 1: Confirm real-DB test pattern (Task 0 §4)**

Re-read `packages/api/__tests__/retention.test.ts` for the `PrismaClient` construction pattern used in this repo and copy it verbatim; ensure `afterAll(async () => { await db.$disconnect(); })` is present.

- [ ] **Step 2: Write the failing integration tests**

Create `packages/api/__tests__/webhook-worker.test.ts`. Every case listed below is REQUIRED; do not skip.

```ts
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@zor/db";
import { runWebhookWorkerTick, getWebhookWorkerStatus } from "../src/lib/webhook-worker";

const dispatchers = vi.hoisted(() => ({ dispatchWebhookEvent: vi.fn() }));
vi.mock("../src/lib/webhook-dispatcher", () => ({ dispatchWebhookEvent: dispatchers.dispatchWebhookEvent }));

const capture = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock("../src/lib/capture-error", () => ({ captureError: capture.captureError }));

const db = new PrismaClient();
const OWNER = "test-owner-1";

async function insertPending(overrides: Partial<{ provider: string; externalId: string; payload: any; nextAttemptAt: Date; attempts: number }> = {}) {
  return db.webhookEvent.create({
    data: {
      provider: overrides.provider ?? "strava",
      externalId: overrides.externalId ?? `e_${Math.random().toString(36).slice(2)}`,
      payload: overrides.payload ?? {},
      nextAttemptAt: overrides.nextAttemptAt ?? new Date(),
      attempts: overrides.attempts ?? 0,
    },
  });
}

beforeEach(async () => {
  await db.webhookEvent.deleteMany({});
  dispatchers.dispatchWebhookEvent.mockReset();
  capture.captureError.mockReset();
});
afterEach(async () => { await db.webhookEvent.deleteMany({}); });
afterAll(async () => { await db.$disconnect(); });

describe("runWebhookWorkerTick — success paths", () => {
  it("succeeded outcome sets status, completedAt, and increments no attempt", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(1); expect(s.succeeded).toBe(1);
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("succeeded");
    expect(updated?.attempts).toBe(0); // succeeded path doesn't bump attempts
    expect(updated?.completedAt).not.toBeNull();
    expect(updated?.processingOwner).toBeNull();
  });

  it("skipped_no_connection outcome lands in terminal skipped state (replayable)", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "skipped_no_connection" });
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("skipped_no_connection");
    expect(updated?.attempts).toBe(0);
  });
});

describe("runWebhookWorkerTick — failure paths", () => {
  it("re-schedules with correct backoff on 1st failure (attempts=1, next=+60s)", async () => {
    const row = await insertPending();
    dispatchers.dispatchWebhookEvent.mockRejectedValue(new Error("boom"));
    const before = Date.now();
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("pending");
    expect(updated?.attempts).toBe(1);
    expect(updated?.lastError).toBe("boom");
    const dt = updated!.nextAttemptAt.getTime() - before;
    expect(dt).toBeGreaterThanOrEqual(58_000);
    expect(dt).toBeLessThanOrEqual(62_000);
  });

  it("moves to dlq on the sixth failure and posts exactly one Sentry incident with externalId", async () => {
    const row = await insertPending({ attempts: 5, externalId: "ext-x-1" });
    dispatchers.dispatchWebhookEvent.mockRejectedValue(new Error("terminal"));
    await runWebhookWorkerTick({ db, ownerToken: OWNER });
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("dlq");
    expect(updated?.attempts).toBe(6);
    expect(capture.captureError).toHaveBeenCalledTimes(1);
    expect(capture.captureError.mock.calls[0][1]).toMatchObject({
      provider: "strava",
      externalId: "ext-x-1",
      eventId: row.id,
      attempts: 6,
    });
  });
});

describe("runWebhookWorkerTick — stale reclaim + ownership", () => {
  it("reclaims a row stuck in processing older than stalenessMs (attempts preserved)", async () => {
    const row = await insertPending();
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "processing", processingStartedAt: new Date(Date.now() - 11 * 60_000), processingOwner: "dead-owner", attempts: 2 },
    });
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER, stalenessMs: 10 * 60_000 });
    expect(s.reclaimed).toBe(1);
    expect(s.processed).toBe(1);
    const updated = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("succeeded");
    expect(updated?.attempts).toBe(2); // preserved (success does not bump)
  });

  it("does NOT reclaim a fresh processing row (< stalenessMs)", async () => {
    const row = await insertPending();
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "processing", processingStartedAt: new Date(), processingOwner: "other-owner" },
    });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.reclaimed).toBe(0);
    expect(s.processed).toBe(0);
    const still = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(still?.processingOwner).toBe("other-owner");
  });

  it("ownership guard: stale worker's completion write is a no-op", async () => {
    // Simulate: worker A claims row, then row is reclaimed by phase A on tick 2 and completed by worker B.
    // Worker A returning late must not overwrite worker B's completion.
    const row = await insertPending();
    // Manually put the row into the state B would leave it after success:
    await db.webhookEvent.update({
      where: { id: row.id },
      data: { status: "succeeded", completedAt: new Date(), processingOwner: null, processingStartedAt: null },
    });
    // Attempt a stale success write with a mismatched owner token via raw SQL:
    const n = await db.$executeRaw`
      UPDATE webhook_events
         SET status = 'succeeded', completed_at = now(), processing_owner = NULL, processing_started_at = NULL
       WHERE id = ${row.id} AND processing_owner = ${"stale-owner"}
    `;
    expect(Number(n)).toBe(0);
    const still = await db.webhookEvent.findUnique({ where: { id: row.id } });
    expect(still?.status).toBe("succeeded");
  });
});

describe("runWebhookWorkerTick — batching + ordering + parallelism", () => {
  it("respects batchSize (default 5) and orders by receivedAt asc, id asc", async () => {
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push(await insertPending({ externalId: `e${i}` }));
    dispatchers.dispatchWebhookEvent.mockResolvedValue({ kind: "succeeded" });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(5);
    // Confirm the two youngest are still pending.
    const still = await db.webhookEvent.findMany({ where: { status: "pending" }, orderBy: { receivedAt: "asc" } });
    expect(still.map(r => r.externalId)).toEqual(["e5", "e6"]);
  });

  it("skips pending rows whose nextAttemptAt is in the future", async () => {
    await insertPending({ nextAttemptAt: new Date(Date.now() + 10 * 60_000) });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(0);
  });

  it("failure isolation: one row's dispatch failure does not abandon its peers", async () => {
    const a = await insertPending({ externalId: "a" });
    const b = await insertPending({ externalId: "b" });
    dispatchers.dispatchWebhookEvent.mockImplementation(async ({ payload }: any) => {
      // Arbitrary discrimination: a payload contains no marker; use insertion order via externalId isn't visible.
      // Instead, alternate outcomes deterministically per call.
      const call = dispatchers.dispatchWebhookEvent.mock.calls.length;
      if (call % 2 === 1) throw new Error("first-failed");
      return { kind: "succeeded" };
    });
    const s = await runWebhookWorkerTick({ db, ownerToken: OWNER });
    expect(s.processed).toBe(2);
    expect(s.failed + s.succeeded).toBe(2);
    // Both rows have terminal-for-this-tick state; neither is left in 'processing'.
    const processing = await db.webhookEvent.count({ where: { status: "processing" } });
    expect(processing).toBe(0);
  });
});

describe("getWebhookWorkerStatus", () => {
  it("returns zero counts on empty table", async () => {
    const s = await getWebhookWorkerStatus(db);
    expect(s.dueCount).toBe(0);
    expect(s.pendingCount).toBe(0);
    expect(s.processingCount).toBe(0);
    expect(s.dlqCount).toBe(0);
    expect(s.oldestDueAgeSec).toBeNull();
    expect(s.oldestProcessingAgeSec).toBeNull();
  });

  it("dueCount reflects pending AND next_attempt_at <= now(); a scheduled-future pending row is NOT due", async () => {
    await insertPending({ nextAttemptAt: new Date(Date.now() - 10_000) }); // due
    await insertPending({ nextAttemptAt: new Date(Date.now() + 60_000) }); // pending but not due
    const s = await getWebhookWorkerStatus(db);
    expect(s.pendingCount).toBe(2);
    expect(s.dueCount).toBe(1);
  });

  it("does NOT change queue state (invariant)", async () => {
    await insertPending();
    const before = await db.webhookEvent.count();
    await getWebhookWorkerStatus(db);
    const after = await db.webhookEvent.count();
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 3: Implement `packages/api/src/lib/webhook-worker.ts`**

```ts
import type { PrismaClient } from "@zor/db";
import { dispatchWebhookEvent } from "./webhook-dispatcher";
import { captureError } from "./capture-error";
import { nextAttemptDelayMs, MAX_ATTEMPTS } from "./webhook-backoff";

const DEFAULT_BATCH = 5;
const DEFAULT_STALENESS_MS = 10 * 60_000;

type ClaimedRow = { id: string; provider: string; external_id: string; payload: unknown; attempts: number };

async function writeCompletionWithRetry(
  db: PrismaClient,
  attemptFn: () => Promise<number>,
  ctx: { provider: string; eventId: string; phase: string },
): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try {
      const n = await attemptFn();
      return Number(n) > 0;
    } catch (err) {
      if (i === 2) {
        await captureError(err, { ...ctx });
        return false;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return false;
}

export async function runWebhookWorkerTick(args: {
  db: PrismaClient;
  ownerToken: string;
  batchSize?: number;
  stalenessMs?: number;
}) {
  const { db, ownerToken } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH;
  const stalenessMs = args.stalenessMs ?? DEFAULT_STALENESS_MS;

  // Phase A: reclaim stale claims.
  const staleCutoff = new Date(Date.now() - stalenessMs);
  const reclaimed = await db.$executeRaw`
    UPDATE webhook_events
       SET status = 'pending', processing_owner = NULL, processing_started_at = NULL
     WHERE status = 'processing' AND processing_started_at < ${staleCutoff}
  `;

  // Phase B: claim batch (no attempts increment here).
  const claimed = await db.$transaction(async (tx) => {
    return tx.$queryRaw<ClaimedRow[]>`
      WITH c AS (
        SELECT id FROM webhook_events
         WHERE status = 'pending' AND next_attempt_at <= now()
         ORDER BY received_at ASC, id ASC
         LIMIT ${batchSize}
         FOR UPDATE SKIP LOCKED
      )
      UPDATE webhook_events e
         SET status = 'processing',
             last_attempt_at = now(),
             processing_started_at = now(),
             processing_owner = ${ownerToken}
        FROM c
       WHERE e.id = c.id
       RETURNING e.id, e.provider, e.external_id, e.payload, e.attempts;
    `;
  });

  let succeeded = 0, skipped = 0, failed = 0, dlq = 0;
  await Promise.all(claimed.map(async (row) => {
    try {
      const outcome = await dispatchWebhookEvent({ provider: row.provider as any, payload: row.payload, db });
      const status = outcome.kind === "succeeded" ? "succeeded" : "skipped_no_connection";
      const wrote = await writeCompletionWithRetry(
        db,
        () => db.$executeRaw`
          UPDATE webhook_events
             SET status = ${status}::"WebhookEventStatus",
                 completed_at = now(), last_error = NULL,
                 processing_owner = NULL, processing_started_at = NULL
           WHERE id = ${row.id} AND processing_owner = ${ownerToken}
        `,
        { provider: row.provider, eventId: row.id, phase: `state-write:${status}` },
      );
      if (wrote) {
        if (outcome.kind === "succeeded") succeeded++;
        else skipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        const wrote = await writeCompletionWithRetry(
          db,
          () => db.$executeRaw`
            UPDATE webhook_events
               SET status = 'dlq', attempts = ${nextAttempts}, last_error = ${msg},
                   completed_at = now(),
                   processing_owner = NULL, processing_started_at = NULL
             WHERE id = ${row.id} AND processing_owner = ${ownerToken}
          `,
          { provider: row.provider, eventId: row.id, phase: "state-write:dlq" },
        );
        if (wrote) {
          dlq++;
          await captureError(err, {
            provider: row.provider,
            externalId: row.external_id,
            eventId: row.id,
            attempts: nextAttempts,
          });
        }
      } else {
        const delay = nextAttemptDelayMs(nextAttempts);
        // delay is non-null here because nextAttempts < MAX_ATTEMPTS.
        const next = new Date(Date.now() + (delay ?? 0));
        const wrote = await writeCompletionWithRetry(
          db,
          () => db.$executeRaw`
            UPDATE webhook_events
               SET status = 'pending', attempts = ${nextAttempts},
                   next_attempt_at = ${next}, last_error = ${msg},
                   processing_owner = NULL, processing_started_at = NULL
             WHERE id = ${row.id} AND processing_owner = ${ownerToken}
          `,
          { provider: row.provider, eventId: row.id, phase: "state-write:pending" },
        );
        if (wrote) failed++;
      }
    }
  }));

  return { reclaimed: Number(reclaimed), processed: claimed.length, succeeded, skipped, failed, dlq };
}

export async function getWebhookWorkerStatus(db: PrismaClient) {
  const [dueCount, pendingCount, processingCount, dlqCount, dueOldest, procOldest] = await Promise.all([
    db.webhookEvent.count({ where: { status: "pending", nextAttemptAt: { lte: new Date() } } }),
    db.webhookEvent.count({ where: { status: "pending" } }),
    db.webhookEvent.count({ where: { status: "processing" } }),
    db.webhookEvent.count({ where: { status: "dlq" } }),
    db.webhookEvent.findFirst({ where: { status: "pending", nextAttemptAt: { lte: new Date() } }, orderBy: { receivedAt: "asc" }, select: { receivedAt: true } }),
    db.webhookEvent.findFirst({ where: { status: "processing" }, orderBy: { processingStartedAt: "asc" }, select: { processingStartedAt: true } }),
  ]);
  const now = Date.now();
  return {
    dueCount,
    pendingCount,
    processingCount,
    dlqCount,
    oldestDueAgeSec: dueOldest ? Math.floor((now - dueOldest.receivedAt.getTime()) / 1000) : null,
    oldestProcessingAgeSec: procOldest?.processingStartedAt
      ? Math.floor((now - procOldest.processingStartedAt.getTime()) / 1000)
      : null,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @zor/api exec vitest run webhook-worker
```

If a test flakes on tight timing (±2s), widen the tolerance in the assertion (not in the worker).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/webhook-worker.ts packages/api/__tests__/webhook-worker.test.ts
git commit -m "feat(api): webhook worker tick with parallel dispatch + ownership guard"
```

---

### Task 7: Cron worker route

**Files:**
- Create: `apps/web/src/app/api/cron/webhook-worker/route.ts`
- Create: `apps/web/src/app/api/cron/webhook-worker/__tests__/route.test.ts`
- Reference: `apps/web/src/app/api/cron/cleanup-tokens/route.ts` (existing CRON_SECRET pattern)

**Interfaces:**
- Consumes: `runWebhookWorkerTick` from Task 6.
- Produces: `GET /api/cron/webhook-worker` → 200 + counts JSON on correct bearer; 401 otherwise. `maxDuration = 60`.

- [ ] **Step 1: Read the existing cron guard**

```bash
grep -n "CRON_SECRET\|authorization\|Bearer" apps/web/src/app/api/cron/cleanup-tokens/route.ts
```

Copy the header shape verbatim (case-insensitive `Bearer`, `Authorization` header, `CRON_SECRET` env).

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
const worker = vi.hoisted(() => ({ runWebhookWorkerTick: vi.fn(), getWebhookWorkerStatus: vi.fn() }));
vi.mock("@zor/db", () => ({ db: {} }));
vi.mock("@zor/api/src/lib/webhook-worker", () => worker);
import { GET } from "../route";

const SECRET = "test-cron-secret";
beforeEach(() => { process.env.CRON_SECRET = SECRET; worker.runWebhookWorkerTick.mockReset(); });

function req(headers: Record<string, string> = {}) {
  return new Request("https://x/api/cron/webhook-worker", { method: "GET", headers });
}

describe("GET /api/cron/webhook-worker", () => {
  it("401 without bearer", async () => {
    const r = await GET(req()); expect(r.status).toBe(401);
    expect(worker.runWebhookWorkerTick).not.toHaveBeenCalled();
  });
  it("401 with wrong bearer", async () => {
    const r = await GET(req({ Authorization: "Bearer wrong" })); expect(r.status).toBe(401);
  });
  it("200 + counts with correct bearer", async () => {
    worker.runWebhookWorkerTick.mockResolvedValue({ reclaimed: 0, processed: 2, succeeded: 2, skipped: 0, failed: 0, dlq: 0 });
    const r = await GET(req({ Authorization: `Bearer ${SECRET}` }));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toEqual({ reclaimed: 0, processed: 2, succeeded: 2, skipped: 0, failed: 0, dlq: 0 });
  });
});
```

- [ ] **Step 3: Implement**

```ts
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@zor/db";
import { runWebhookWorkerTick } from "@zor/api/src/lib/webhook-worker";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ownerToken = `${process.pid}-${randomUUID()}`;
  const counts = await runWebhookWorkerTick({ db, ownerToken });
  return NextResponse.json(counts);
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run cron/webhook-worker
git add apps/web/src/app/api/cron/webhook-worker/route.ts apps/web/src/app/api/cron/webhook-worker/__tests__/route.test.ts
git commit -m "feat(web): cron endpoint /api/cron/webhook-worker"
```

---

### Task 8: Status endpoint

**Files:**
- Create: `apps/web/src/app/api/cron/webhook-worker/status/route.ts`
- Create: `apps/web/src/app/api/cron/webhook-worker/status/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getWebhookWorkerStatus` from Task 6.
- Produces: `GET /api/cron/webhook-worker/status` — same CRON_SECRET guard, returns status JSON. MUST NOT advance queue state.

Kuma probe uses THIS endpoint. Threshold recommendations for the runbook: `oldestDueAgeSec > 300` warn (worker is behind on due work); `dlqCount` change alert (transition to DLQ).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
const worker = vi.hoisted(() => ({ runWebhookWorkerTick: vi.fn(), getWebhookWorkerStatus: vi.fn() }));
vi.mock("@zor/db", () => ({ db: {} }));
vi.mock("@zor/api/src/lib/webhook-worker", () => worker);
import { GET } from "../route";

const SECRET = "test-cron-secret";
beforeEach(() => { process.env.CRON_SECRET = SECRET; worker.getWebhookWorkerStatus.mockReset(); worker.runWebhookWorkerTick.mockReset(); });

describe("GET /api/cron/webhook-worker/status", () => {
  it("401 without bearer", async () => {
    const r = await GET(new Request("https://x/api/cron/webhook-worker/status"));
    expect(r.status).toBe(401);
  });
  it("returns status JSON with correct bearer and does not advance queue", async () => {
    worker.getWebhookWorkerStatus.mockResolvedValue({
      dueCount: 1, oldestDueAgeSec: 42, pendingCount: 3, processingCount: 0, dlqCount: 1, oldestProcessingAgeSec: null,
    });
    const r = await GET(new Request("https://x/api/cron/webhook-worker/status", { headers: { Authorization: `Bearer ${SECRET}` } }));
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({ dueCount: 1, dlqCount: 1 });
    expect(worker.runWebhookWorkerTick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run + fail**

```bash
pnpm --filter @zor/web exec vitest run cron/webhook-worker/status
```

- [ ] **Step 3: Implement**

```ts
import { NextResponse } from "next/server";
import { db } from "@zor/db";
import { getWebhookWorkerStatus } from "@zor/api/src/lib/webhook-worker";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getWebhookWorkerStatus(db));
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run cron/webhook-worker/status
git add apps/web/src/app/api/cron/webhook-worker/status
git commit -m "feat(web): webhook-worker status endpoint for kuma probe"
```

---

### Task 9: Admin list + replay endpoints

**Files:**
- Create: `apps/web/src/app/api/admin/webhook-events/route.ts`
- Create: `apps/web/src/app/api/admin/webhook-events/[id]/replay/route.ts`
- Create: both `__tests__/route.test.ts` files.

**Interfaces:**
- Consumes: `@zor/db` PrismaClient, `CRON_SECRET`.
- Produces:
  - `GET /api/admin/webhook-events?status=<s>&limit=<n>&cursor=<id>` — 400 on bad status/limit/cursor (integer 1–200 only); default `status=dlq`, `limit=50`. Returns `{ items, nextCursor }` where cursor pages `receivedAt DESC, id DESC`.
  - `POST /api/admin/webhook-events/[id]/replay` — resets a `dlq` or `skipped_no_connection` row to `pending` with `attempts=0`, `nextAttemptAt=now()`, cleared error/owner. Returns updated row or 404. Update+return is ONE atomic raw SQL statement (no `updateMany + findUnique` race).

- [ ] **Step 1: Write the failing tests**

List (`apps/web/src/app/api/admin/webhook-events/__tests__/route.test.ts`):
- 401 without bearer.
- 400 for `status=nonsense`.
- 400 for `limit=abc`.
- 400 for `limit=0` and `limit=201`.
- 200 with default; results filtered to `status=dlq`.
- Cursor pagination round-trip.

Replay (`apps/web/src/app/api/admin/webhook-events/[id]/replay/__tests__/route.test.ts`):
- 401 without bearer.
- 404 for missing id.
- 404 for `status=succeeded` row (not eligible).
- 200 for `dlq` row → returned row has `status="pending"`, `attempts=0`, `lastError=null`.
- 200 for `skipped_no_connection` row → same reset shape.

Because the update+return is one raw SQL, mock `db.$queryRaw` for the update path and `db` for the list.

- [ ] **Step 2: Run + fail**

- [ ] **Step 3: Implement**

List (`apps/web/src/app/api/admin/webhook-events/route.ts`):

```ts
import { NextResponse } from "next/server";
import { WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";

const ELIGIBLE_STATUSES = new Set<string>(Object.values(WebhookEventStatus));

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status") ?? "dlq";
  if (!ELIGIBLE_STATUSES.has(rawStatus)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const rawLimit = url.searchParams.get("limit") ?? "50";
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  const cursor = url.searchParams.get("cursor");
  if (cursor && !/^[A-Za-z0-9_-]{20,}$/.test(cursor)) return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });

  const items = await db.webhookEvent.findMany({
    where: { status: rawStatus as WebhookEventStatus },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return NextResponse.json({ items: page, nextCursor: hasMore ? page[page.length - 1].id : null });
}
```

Replay (`apps/web/src/app/api/admin/webhook-events/[id]/replay/route.ts`):

```ts
import { NextResponse } from "next/server";
import { db } from "@zor/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rows = await db.$queryRaw<Array<any>>`
    UPDATE webhook_events
       SET status = 'pending', attempts = 0, next_attempt_at = now(),
           last_error = NULL, processing_owner = NULL, processing_started_at = NULL,
           completed_at = NULL
     WHERE id = ${id} AND status IN ('dlq', 'skipped_no_connection')
     RETURNING id, provider, external_id, status, attempts, next_attempt_at, received_at
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found or not eligible" }, { status: 404 });
  return NextResponse.json({ item: rows[0] });
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run admin/webhook-events
git add apps/web/src/app/api/admin/webhook-events
git commit -m "feat(web): admin list + replay endpoints for webhook events"
```

---

### Task 10: Rewrite Strava webhook route

**Files:**
- Modify: `apps/web/src/app/api/strava/webhook/route.ts`
- Create: `apps/web/src/app/api/strava/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `stravaWebhookSchema`, `stravaEventKey`, `@zor/db`.
- Produces: `POST` inserts one row per legitimate `activity`/`create` event; 200 for filtered no-ops; 400 for zod failure; 500 for non-duplicate DB insert failure; 200 for `P2002` on the `provider_external_id_unique` constraint (duplicate delivery is expected). `GET` (hub.challenge handshake) unchanged.

- [ ] **Step 1: Write the failing tests**

Cases (all required):
- Valid `activity`/`create` payload → 200; one row: `provider="strava"`, `externalId="42"`, `payload=<parsed>`, `status="pending"`, `userId` filled when a matching DeviceConnection exists (null otherwise).
- `aspect_type="update"` → 200, zero rows.
- `object_type="athlete"` → 200, zero rows.
- Missing `owner_id` → 400, zero rows.
- DB insert throws a NON-P2002 error → 500.
- Duplicate delivery: two identical POSTs → both 200; exactly one row.
- GET with valid `hub.verify_token` → returns challenge; invalid → 403.

- [ ] **Step 2: Run + fail**

- [ ] **Step 3: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma, WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";
import { stravaWebhookSchema, stravaEventKey } from "@zor/api/src/lib/webhook-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");
  if (mode === "subscribe" && verifyToken === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = stravaWebhookSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (parsed.object_type !== "activity" || parsed.aspect_type !== "create") {
    return NextResponse.json({ ok: true });
  }
  const { providerAccountId, externalId } = stravaEventKey(parsed);
  const conn = await db.deviceConnection.findFirst({
    where: { provider: "strava", providerAccountId }, select: { userId: true },
  });
  try {
    await db.webhookEvent.create({
      data: {
        provider: "strava",
        externalId,
        payload: parsed as unknown as Prisma.InputJsonValue,
        userId: conn?.userId ?? null,
        status: WebhookEventStatus.pending,
        nextAttemptAt: new Date(),
      },
    });
  } catch (err) {
    const p = err as Prisma.PrismaClientKnownRequestError;
    if (p?.code === "P2002" && Array.isArray(p.meta?.target) &&
        (p.meta.target as string[]).includes("provider_external_id_unique")) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run strava/webhook
git add apps/web/src/app/api/strava/webhook
git commit -m "feat(web): strava webhook enqueues to webhook_events"
```

---

### Task 11: Rewrite Garmin webhook route

**Files:**
- Modify: `apps/web/src/app/api/garmin/webhook/route.ts`
- Modify: `apps/web/src/app/api/garmin/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: existing `signaturesMatch` (KEEP), `garminWebhookSchema`, `garminEventKey`, `hashPayload`, `@zor/db`.
- Produces: `POST` verifies HMAC on the RAW body first; then parses, filters empty batches, inserts ONE row per request (per-activity dispatch happens later in the worker via Task 5 Garmin branch); 200 on success; 401 for bad signature; 503 if `GARMIN_WEBHOOK_SECRET` missing; 400 for zod failure; 500 for non-duplicate DB insert failure. Duplicate identical POSTs → 200 + no second row.

- [ ] **Step 1: Update the existing test**

Rewrite the existing test to assert the new behaviour. Include:
- Valid signed batch → 200, one row, `importGarminActivity` NOT called.
- Invalid signature → 401, no row.
- Missing secret → 503, no row.
- Empty `activityDetails` → 200, no row.
- Malformed body → 400, no row.
- Duplicate delivery (identical raw body) → 200 twice, one row (hash externalId is deterministic).

Preserve `signedRequest` helper.

- [ ] **Step 2: Run + fail**

- [ ] **Step 3: Implement**

Keep the existing secret check + `signaturesMatch` block verbatim. Replace the post-verify section with:

```ts
let parsed;
try {
  parsed = garminWebhookSchema.parse(JSON.parse(rawBody));
} catch {
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
if (!parsed.activityDetails || parsed.activityDetails.length === 0) {
  return NextResponse.json({ ok: true });
}
const externalId = hashPayload(parsed);
// A batch may span multiple users; do not attribute the queue row to any one user.
// The worker's Garmin branch resolves connection per activity at dispatch time.
try {
  await db.webhookEvent.create({
    data: {
      provider: "garmin",
      externalId,
      payload: parsed as unknown as Prisma.InputJsonValue,
      userId: null,
      status: WebhookEventStatus.pending,
      nextAttemptAt: new Date(),
    },
  });
} catch (err) {
  const p = err as Prisma.PrismaClientKnownRequestError;
  if (p?.code === "P2002" && Array.isArray(p.meta?.target) &&
      (p.meta.target as string[]).includes("provider_external_id_unique")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
return NextResponse.json({ ok: true });
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run garmin/webhook
git add apps/web/src/app/api/garmin/webhook
git commit -m "feat(web): garmin webhook enqueues signed batches to webhook_events"
```

---

### Task 12: Rewrite Oura webhook route

**Files:**
- Modify: `apps/web/src/app/api/oura/webhook/route.ts`
- Create: `apps/web/src/app/api/oura/webhook/__tests__/route.test.ts`

**Interfaces:** parallel to Task 10. Use `ouraWebhookSchema`, `ouraEventKey`. External id = `ouraEventKey(parsed).externalId` (deterministic composed string; no hash needed).

Filter: preserve today's `!["sleep", "daily_readiness"].includes(body.data_type)` — return 200 with no row for anything else.

- [ ] **Step 1: Tests** — required cases mirroring Task 10 plus:
  - `data_type="activity"` → 200, no row.
  - `data_type="sleep"` with matching connection → row inserted with `userId` set.
  - `data_type="daily_readiness"` with no connection → row inserted with `userId=null`.
- [ ] **Step 2: Fail.**
- [ ] **Step 3: Implement.** Preserve GET verification handler exactly.
- [ ] **Step 4: Commit.**

```bash
pnpm --filter @zor/web exec vitest run oura/webhook
git add apps/web/src/app/api/oura/webhook
git commit -m "feat(web): oura webhook enqueues to webhook_events"
```

---

### Task 13: Rewrite Withings webhook route

**Files:**
- Modify: `apps/web/src/app/api/withings/webhook/route.ts`
- Create: `apps/web/src/app/api/withings/webhook/__tests__/route.test.ts`

**Interfaces:** parallel to Task 10 with three Withings-specific concerns:
1. Body is `application/x-www-form-urlencoded`. Parse via `request.formData()`, materialize the object with string values (schema uses `z.coerce.number()` to numeric).
2. Filter: `appli === 1 || appli === 4` — return 200 with no row otherwise.
3. External id = `hashPayload(parsed)` (no native event id).
4. Preserve the existing `HEAD` and `GET` handlers unchanged.

- [ ] **Step 1: Tests** — required cases:
  - `appli=1`, matching connection → row inserted with `userId` set.
  - `appli=4`, no connection → row inserted with `userId=null`.
  - `appli=44` (sleep, out of scope today) → 200, no row.
  - Missing `userid` → 400, no row.
  - HEAD returns 200 with empty body (assert status only).
  - GET returns 200 with empty body.
  - Duplicate identical POSTs → one row.
- [ ] **Step 2: Fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Commit.**

```bash
pnpm --filter @zor/web exec vitest run withings/webhook
git add apps/web/src/app/api/withings/webhook
git commit -m "feat(web): withings webhook enqueues to webhook_events"
```

---

### Task 14: Rewrite Polar webhook route

**Files:**
- Modify: `apps/web/src/app/api/polar/webhook/route.ts`
- Create: `apps/web/src/app/api/polar/webhook/__tests__/route.test.ts`

**Interfaces:** parallel to Task 10. Use `polarWebhookSchema`, `polarEventKey`. External id = `entity_id`. Filter: `event === "EXERCISE"` — return 200 with no row for anything else (including `PING`).

- [ ] **Step 1: Tests** — required cases:
  - `event="EXERCISE"` with matching connection → row with `userId` set, `externalId=entity_id`.
  - `event="PING"` → 200, no row.
  - Missing `entity_id` → 400, no row.
  - Duplicate → one row.
- [ ] **Step 2: Fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Commit.**

```bash
pnpm --filter @zor/web exec vitest run polar/webhook
git add apps/web/src/app/api/polar/webhook
git commit -m "feat(web): polar webhook enqueues to webhook_events"
```

---

### Task 15: Retention lines in cleanup cron

**Files:**
- Modify: `apps/web/src/app/api/cron/cleanup-tokens/route.ts`
- Modify: `apps/web/src/app/api/cron/cleanup-tokens/__tests__/route.test.ts`

**Interfaces:** none new. The existing route's `Promise.allSettled` list AND the parallel `tableNames as const` array are BOTH updated. Two entries added:
- succeeded webhook_events older than 30 days.
- skipped_no_connection webhook_events older than 30 days.

- [ ] **Step 1: Extend the existing test**

Add three cases:
- `status="succeeded"` and `completedAt = now() - 40 days` → deleted; label `webhookEventSucceeded` in the result.
- `status="skipped_no_connection"` and `completedAt = now() - 40 days` → deleted; label `webhookEventSkipped`.
- `status="dlq"` and `completedAt = now() - 90 days` → kept.

Also mock `db.webhookEvent.deleteMany` (the existing test file uses `getDb` returning a mocked delegate map — grow that map).

- [ ] **Step 2: Run + fail**

- [ ] **Step 3: Modify the route**

Add two entries to the `Promise.allSettled` array (positions matter):

```ts
db.webhookEvent.deleteMany({ where: { status: "succeeded", completedAt: { lt: thirtyDaysAgo } } }),
db.webhookEvent.deleteMany({ where: { status: "skipped_no_connection", completedAt: { lt: thirtyDaysAgo } } }),
```

Add the matching two entries to `tableNames` in the SAME order:

```ts
"webhookEventSucceeded",
"webhookEventSkipped",
```

Declare `thirtyDaysAgo` next to the existing `now` constant:

```ts
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @zor/web exec vitest run cron/cleanup-tokens
git add apps/web/src/app/api/cron/cleanup-tokens
git commit -m "chore(web): retention of succeeded + skipped webhook_events after 30 days"
```

---

### Task 16: Full-suite regression check

**Files:** none.

**Interfaces:** none.

- [ ] **Step 1: Typecheck + lint (which is `tsc --noEmit && eslint`)**

```bash
pnpm --filter @zor/api lint
pnpm --filter @zor/web lint
pnpm --filter @zor/db lint
```

Expected: no errors. If `@zor/db` types are stale, `pnpm --filter @zor/db db:generate` and retry.

- [ ] **Step 2: Run full API + web vitest suites**

```bash
pnpm --filter @zor/api test
pnpm --filter @zor/web test
```

Expected: green.

- [ ] **Step 3: Repo-wide lint / turbo**

```bash
pnpm lint
```

(Runs `turbo lint`, which fans out across packages.)

- [ ] **Step 4: Commit (only if any auto-fix landed)**

```bash
git add -A && git commit -m "chore: lint fixups after task-4"
```

Otherwise skip.

---

### Task 17: BookStack runbook + deployment cron wiring (explicit ordering)

**Files:** none in-repo (documentation + deploy).

**Interfaces:** operator-facing docs + external cron config.

Ordering is REQUIRED (Codex flagged the previous draft as too loose): migration deploy → app deploy → staging cron tick + soak (≥30 min with real traffic) → prod cron tick + Kuma monitor. Do not add prod tick until staging soak is green.

- [ ] **Step 1: Deploy the migration + app to staging**

Merge the PR to the staging branch. Staging deploy (`docker/remote-deploy.sh`) runs `prisma migrate deploy` before starting the app. Verify:

```bash
ssh staging 'cd stack && docker compose exec zor pnpm --filter @zor/db exec prisma migrate status'
```

Expected: `webhook_events_queue` marked applied.

- [ ] **Step 2: Register the staging cron tick**

On the staging host's crontab (host per `~/.claude/projects/-home-ubuntu-dev-IronPulse/memory/reference_deploy_topology.md`):

```cron
* * * * * curl -fsS -o /dev/null -H "Authorization: Bearer $CRON_SECRET" https://staging.mettlelift.hiten-patel.co.uk/api/cron/webhook-worker
```

Verify one fire in the cron log; confirm `GET /api/cron/webhook-worker` returned 200 in the app log.

- [ ] **Step 3: Soak staging for ≥30 min**

Send a synthetic legitimate payload to each of the five webhook routes on staging using known-good fixtures (extracted from a prior successful production delivery — do NOT invent fixtures here). Confirm:
- Row inserted for each.
- Worker picks it up within ~60s.
- Successful ones land as `succeeded`.
- Corrupt one payload deliberately in the DB (`payload = jsonb_set(...)`) to induce dispatch failure; confirm it retries per backoff schedule, then DLQs on the 6th failure with a Sentry incident.
- Replay via curl:
  ```bash
  curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" \
    "https://staging.mettlelift.hiten-patel.co.uk/api/admin/webhook-events/<id>/replay" | jq
  ```
  Confirm the row resets and processes; no new Sentry incident fires on a fresh success.

- [ ] **Step 4: Register the prod cron tick + Kuma probe**

Same cron line on the prod host, pointing at the prod hostname (consult deploy topology memory for the real prod host).

Kuma HTTP monitor:
- URL: `<prod-host>/api/cron/webhook-worker/status`
- Header: `Authorization: Bearer $CRON_SECRET`
- Interval: 60s
- Assertion: HTTP 200
- (Optional) keyword-in-body assertion on `oldestDueAgeSec` exceeding a documented threshold, once the JSON shape has been observed in the wild.

- [ ] **Step 5: BookStack runbook**

Under Iron Pulse book (id 19), create "Webhook event replay" with the sections listed in the spec §3.6:

1. What lives here.
2. Find the failing event (Sentry search + SQL).
3. Fix the underlying cause first (checklist).
4. Replay (curl example — see below).
5. Bulk operations (retention SQL, DLQ triage queries).
6. Monitoring (Kuma probe on `/api/cron/webhook-worker/status`, thresholds).
7. When to escalate.

Curl example to include verbatim:

```bash
# List DLQ events
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "<PROD_HOST>/api/admin/webhook-events?status=dlq&limit=50" | jq

# Replay one
curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "<PROD_HOST>/api/admin/webhook-events/<id>/replay" | jq
```

Use the BookStack API pattern from `~/.claude/CLAUDE.md` global instructions (POST `/api/pages` with `book_id: 19`).

- [ ] **Step 6: Close the ticket**

```bash
backlog task edit 4 --plain --status Done --notes "Implemented per docs/superpowers/plans/2026-09-06-provider-webhook-retry-queue.md. Verified in staging: worker ticks under parallel dispatch, DLQ transition posts one Sentry incident with externalId, admin replay resets and re-drives. BookStack runbook 'Webhook event replay' created under book 19. Cron ticks registered in staging + prod; Uptime Kuma monitor on /api/cron/webhook-worker/status."
git add backlog/tasks/task-4*
git commit -m "chore(backlog): close task-4 provider webhook retry queue"
```
