# Workout Completion Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make direct and PowerSync-delivered workout completion produce one durable, recoverable set of logical side effects while preserving offline mobile completion.

**Architecture:** A server-owned `WorkoutFinalization` record is the durable source of processing state and finalized PR results. Direct completion and the PowerSync completion transition register the same record; an idempotent finalizer and authenticated cron sweep process pending/stale work. Database effects use stable uniqueness keys, while push delivery uses one logical outbox intent with documented at-least-once provider semantics.

**Tech Stack:** TypeScript, tRPC 11, Prisma 6, PostgreSQL 16, Next.js 15 route handlers, Vitest, PowerSync.

## Global Constraints

- Land TASK-23.1 as an isolated local-only completion slice, restore the test gate in TASK-23.7, and only then begin TASK-23.2.
- Preserve the first accepted `completedAt` and derived duration on every retry.
- Local mobile workout completion must never wait for network finalization.
- Logical PR, feed, achievement, in-app-notification, and notification-outbox records must be idempotent.
- Push-provider delivery is at-least-once; do not claim exactly-once delivery after an ambiguous provider timeout.
- The final mobile architecture observes finalization status after PowerSync; it does not race a second completion mutation against the upload queue.
- Upload one PowerSync CRUD transaction through one server mutation and register completion only after the full batch commits.
- Use migration history; do not use `prisma db push` for this change.
- Do not stage or commit unrelated rebrand/assets/worktree changes already present in the primary checkout.

---

### Task 1: Remove the unsafe mobile completion side call (TASK-23.1)

**Files:**
- Create: `apps/mobile/lib/workout-local-completion.ts`
- Create: `apps/mobile/lib/__tests__/workout-local-completion.test.ts`
- Create: `apps/mobile/lib/__tests__/workout-no-direct-completion.test.ts`
- Modify: `apps/mobile/app/workout/active.tsx`
- Modify: `apps/mobile/app/workout/complete.tsx`
- Modify: `apps/mobile/App.tsx`

**Interfaces:**
- Produces: `completeWorkoutLocally(db, { workoutId, startedAt, completedAt }): Promise<{ completedAt: string; durationSeconds: number }>`.
- Changes `WorkoutComplete` navigation params to `{ workoutId: string }`; PR results are no longer serialized into navigation state.

- [ ] **Step 1: Write the failing local-completion test**

```ts
import { describe, expect, it, vi } from "vitest";
import { completeWorkoutLocally } from "../workout-local-completion";

it("commits the canonical timestamp locally without a network mutation", async () => {
  const execute = vi.fn().mockResolvedValue(undefined);
  const getOptional = vi.fn().mockResolvedValue({
    completed_at: "2026-08-09T03:00:00.000Z",
    duration_seconds: 3600,
  });
  const writeTransaction = vi.fn(
    async (run: (tx: {
      execute: typeof execute;
      getOptional: typeof getOptional;
    }) => Promise<unknown>) => run({ execute, getOptional }),
  );

  const result = await completeWorkoutLocally(
    { writeTransaction },
    {
      workoutId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-08-09T02:00:00.000Z",
      completedAt: new Date("2026-08-09T03:00:00.000Z"),
    },
  );

  expect(execute).toHaveBeenCalledWith(
    "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ? AND completed_at IS NULL",
    ["2026-08-09T03:00:00.000Z", 3600, "11111111-1111-4111-8111-111111111111"],
  );
  expect(getOptional).toHaveBeenCalledWith(
    "SELECT completed_at, duration_seconds FROM workouts WHERE id = ?",
    ["11111111-1111-4111-8111-111111111111"],
  );
  expect(result).toEqual({
    completedAt: "2026-08-09T03:00:00.000Z",
    durationSeconds: 3600,
  });
});
```

Add a rejection test proving a failed local transaction does not navigate. In `workout-no-direct-completion.test.ts`, read `apps/mobile/app/workout/active.tsx` and assert it contains neither `workout.complete.mutate` nor `requestWorkoutCompletion`; this is a temporary static regression guard until TASK-23.7 enables the screen-level component test.

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `pnpm --filter @zor/mobile test -- lib/__tests__/workout-local-completion.test.ts`

Expected: FAIL because `workout-local-completion.ts` does not exist.

- [ ] **Step 3: Implement the local-only completion boundary**

Use `db.writeTransaction`, clamp duration to a nonnegative integer, and update only an incomplete row. In the same transaction, read back `completed_at` and `duration_seconds`; return those canonical stored values so a replay cannot report a newer attempted timestamp, and throw if the workout row is missing. In `active.tsx`, await this helper, then navigate immediately to `WorkoutComplete` with `{ workoutId }`. Delete the direct tRPC completion call, its catch, its `as any`, and the serialized `prs` route parameter.

In `complete.tsx`, remove the route-param PR parser. Keep local duration, volume, set count, and exercise summary. Until the finalization-status integration lands, render a neutral “Records will appear after syncing” status instead of an empty or malformed PR callout.

- [ ] **Step 4: Verify the safe interim behavior**

Run:

```bash
pnpm --filter @zor/mobile test -- lib/__tests__/workout-local-completion.test.ts lib/__tests__/workout-no-direct-completion.test.ts
```

Expected: the focused test exits 0. The currently broken project-wide TypeScript command is repaired and run by TASK-23.7 before TASK-23.2 begins.

- [ ] **Step 5: Commit only the safe client slice**

```bash
git add apps/mobile/lib/workout-local-completion.ts apps/mobile/lib/__tests__/workout-local-completion.test.ts apps/mobile/lib/__tests__/workout-no-direct-completion.test.ts apps/mobile/app/workout/active.tsx apps/mobile/app/workout/complete.tsx apps/mobile/App.tsx
git commit -m "fix(mobile): keep workout completion on PowerSync path"
```

This change intentionally does not call the correctly shaped direct RPC: doing so can outrun queued set/exercise writes. Finalize TASK-23.1 through the Backlog CLI, then implement TASK-23.2 so synchronized completion creates durable server effects.

---

### Task 2: Add durable finalization and notification-outbox models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260809040000_workout_finalization/migration.sql`

**Interfaces:**
- Produces Prisma delegates `workoutFinalization` and `notificationOutbox`.
- Produces unique selectors for `(setId, type)`, `(userId, type, referenceId)`, notification `dedupeKey`, and outbox `dedupeKey`.

- [ ] **Step 1: Add the finalization integration-test fixture and schema expectation**

Create `packages/api/__tests__/workout-finalization.test.ts` using the same real-database lifecycle as `workout.test.ts`. Its `beforeEach` creates `testUser`, a Bench Press exercise, and this completed graph:

```ts
async function createCompletedWorkout() {
  const startedAt = new Date("2026-08-09T02:00:00.000Z");
  const completedAt = new Date("2026-08-09T03:00:00.000Z");
  return db.workout.create({
    data: {
      userId: testUser.id,
      name: "Finalization fixture",
      startedAt,
      completedAt,
      durationSeconds: 3600,
      workoutExercises: {
        create: {
          exerciseId: testExercise.id,
          order: 0,
          sets: {
            create: {
              setNumber: 1,
              type: "working",
              weightKg: 100,
              reps: 5,
              completed: true,
            },
          },
        },
      },
    },
  });
}
```

The first test attempts to create two finalization records for one workout and expects the second create to reject with Prisma unique error `P2002`.

```ts
it("allows one durable finalization record per workout", async () => {
  const workout = await createCompletedWorkout();
  const data = {
    workoutId: workout.id,
    userId: testUser.id,
    completedAt: workout.completedAt!,
    durationSeconds: workout.durationSeconds!,
  };
  await db.workoutFinalization.create({ data });
  await expect(db.workoutFinalization.create({ data })).rejects.toMatchObject({
    code: "P2002",
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing delegate failure**

Run: `pnpm --filter @zor/api test -- workout-finalization.test.ts`

Expected: FAIL because `workoutFinalization` is absent from the generated client.

- [ ] **Step 3: Add the Prisma models and relations**

Add these fields, retaining the project's string-status convention:

```prisma
model WorkoutFinalization {
  workoutId       String    @id @map("workout_id") @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  completedAt     DateTime  @map("completed_at")
  durationSeconds Int       @map("duration_seconds")
  status          String    @default("pending")
  availableAt     DateTime  @default(now()) @map("available_at")
  attempts        Int       @default(0)
  lockedAt        DateTime? @map("locked_at")
  lockToken       String?   @map("lock_token") @db.Uuid
  processedAt     DateTime? @map("processed_at")
  result          Json?
  lastError       String?   @map("last_error")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  workout Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, availableAt, lockedAt])
  @@map("workout_finalizations")
}

model NotificationOutbox {
  id        String    @id @default(uuid()) @db.Uuid
  dedupeKey String    @unique @map("dedupe_key")
  userId    String    @map("user_id") @db.Uuid
  type      String
  title     String
  body      String?
  linkPath  String?   @map("link_path")
  data      Json?
  status    String    @default("pending")
  availableAt DateTime @default(now()) @map("available_at")
  attempts  Int       @default(0)
  lockedAt  DateTime? @map("locked_at")
  lockToken String?   @map("lock_token") @db.Uuid
  sentAt    DateTime? @map("sent_at")
  lastError String?   @map("last_error")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, availableAt, lockedAt])
  @@map("notification_outbox")
}
```

Add `finalization WorkoutFinalization?` to `Workout`, `workoutFinalizations WorkoutFinalization[]` and `notificationOutbox NotificationOutbox[]` to `User`, plus nullable unique `dedupeKey String? @unique @map("dedupe_key")` to `Notification`.

Add `@@unique([setId, type])` to `PersonalRecord` and `@@unique([userId, type, referenceId])` to `ActivityFeedItem`.

- [ ] **Step 4: Create and inspect the exact migration**

Run:

```bash
pnpm --filter @zor/db exec prisma validate
pnpm --filter @zor/db db:generate
```

Create the exact migration file listed above with the new tables, columns, foreign keys, and indexes. Before adding the unique constraints, include these deterministic cleanup statements:

```sql
DELETE FROM personal_records AS target
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY set_id, type
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
    FROM personal_records
    WHERE set_id IS NOT NULL
  ) AS ranked
  WHERE duplicate_rank > 1
) AS duplicates
WHERE target.id = duplicates.id;

DELETE FROM activity_feed_items AS target
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, reference_id
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
    FROM activity_feed_items
  ) AS ranked
  WHERE duplicate_rank > 1
) AS duplicates
WHERE target.id = duplicates.id;
```

PostgreSQL's composite unique constraint already permits multiple rows whose `set_id` is null; verify that the `(set_id, type)` constraint has that behavior and do not replace it with an index Prisma cannot represent. Apply and test the migration only against the disposable database in the next step, then run `pnpm --filter @zor/db db:generate` again.

- [ ] **Step 5: Re-run the schema test**

Use an isolated database; do not point the cleanup-heavy API test helpers at a shared development database:

```bash
docker run --detach --rm --name zor-finalization-test-db --publish 127.0.0.1:55434:5432 --env POSTGRES_USER=zor_test --env POSTGRES_PASSWORD=zor_test --env POSTGRES_DB=zor_finalization_test imresamu/postgis:16-3.4-alpine
for attempt in $(seq 1 30); do docker exec zor-finalization-test-db pg_isready -U zor_test -d zor_finalization_test && break; test "$attempt" -eq 30 && exit 1; sleep 1; done
export ZOR_FINALIZATION_TEST_DB_URL='postgresql://zor_test:zor_test@127.0.0.1:55434/zor_finalization_test'
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/db exec prisma migrate deploy
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/api test -- workout-finalization.test.ts
docker stop zor-finalization-test-db
```

Expected: the one-record-per-workout test passes.

- [ ] **Step 6: Commit the schema slice**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260809040000_workout_finalization/migration.sql packages/api/__tests__/workout-finalization.test.ts
git commit -m "feat(db): add workout finalization state"
```

---

### Task 3: Make logical side-effect helpers idempotent

**Files:**
- Modify: `packages/api/src/lib/pr-detection.ts`
- Modify: `packages/api/src/lib/feed.ts`
- Modify: `packages/api/src/lib/notifications.ts`
- Modify: `packages/api/src/routers/achievement.ts`
- Test: `packages/api/__tests__/workout-finalization.test.ts`
- Modify: `packages/api/__tests__/feed.test.ts`
- Modify: `packages/api/__tests__/notifications.test.ts`

**Interfaces:**
- Produces: `createFeedItem(db, userId, type, referenceId, visibility)` as an upsert with no-op conflict update.
- Produces: `enqueueNotification(db, { dedupeKey, ...notification }): Promise<NotificationOutbox>`.
- Produces: PR detection safe to repeat for the same completed set.

- [ ] **Step 1: Add failing duplicate-effect tests**

Add four tests against the completed fixture:

1. Run PR detection twice and assert one `1rm` and one `volume` row for the fixture set.
2. Create the workout feed item twice and assert one row for `(userId, "workout", workoutId)`.
3. Enqueue the same two PR intents twice and assert exactly the two named keys exist.
4. Run `checkAndUnlock` twice and assert one `first_workout` achievement and one `achievement:${testUser.id}:first_workout` outbox row.

Use concrete assertions:

```ts
expect(await db.personalRecord.count({
  where: { setId, type: { in: ["1rm", "volume"] } },
})).toBe(2);
expect(await db.activityFeedItem.count({
  where: { userId: testUser.id, type: "workout", referenceId: workout.id },
})).toBe(1);
expect(await db.notificationOutbox.count({
  where: {
    dedupeKey: {
      in: [
        `workout:${workout.id}:pr:${setId}:1rm`,
        `workout:${workout.id}:pr:${setId}:volume`,
      ],
    },
  },
})).toBe(2);
```

- [ ] **Step 2: Run the duplicate tests and observe current overproduction**

Run: `pnpm --filter @zor/api test -- workout-finalization.test.ts`

Expected: at least the feed/outbox assertions fail.

- [ ] **Step 3: Convert helpers to stable keys**

Use composite-key upserts for feed records and `createMany({ skipDuplicates: true })` or upsert for PR candidates. Add:

```ts
export interface NotificationIntent {
  dedupeKey: string;
  userId: string;
  type: NotificationKind;
  title: string;
  body?: string;
  linkPath?: string;
  data?: Record<string, unknown>;
}

export async function enqueueNotification(db: DbClient, intent: NotificationIntent) {
  return db.notificationOutbox.upsert({
    where: { dedupeKey: intent.dedupeKey },
    create: intent,
    update: {},
  });
}
```

Derive keys from immutable identifiers, for example `workout:{workoutId}:pr:{setId}:{type}`, `workout:{workoutId}:coach:{coachId}`, and `achievement:{userId}:{achievementType}`.

Define `DbClient` as the structural subset shared by `PrismaClient` and `Prisma.TransactionClient`; the finalizer calls these helpers inside a transaction. Existing notification callers outside workout finalization may continue through the old best-effort helper until they are intentionally migrated, but workout and achievement effects must enqueue stable intents.

Update `feed.test.ts` to mock/assert the composite-key upsert instead of `.create`. Update `notifications.test.ts` only where achievement notification timing changes; retain its coverage for immediate best-effort notifications that remain outside this outbox migration.

- [ ] **Step 4: Make PR results reconstructable**

After conflict-safe insertion, query records whose `setId` belongs to the workout and return a normalized result:

```ts
export interface FinalizedPR {
  exerciseId: string;
  exerciseName: string;
  type: "1rm" | "volume";
  value: number;
  setId: string;
}
```

This lets a retry return the same PR result even when it did not perform the original insert.

- [ ] **Step 5: Verify helper idempotency**

Run: `pnpm --filter @zor/api test -- workout-finalization.test.ts workout.test.ts feed.test.ts notifications.test.ts`

Expected: all focused tests exit 0.

- [ ] **Step 6: Commit the helper slice**

```bash
git add packages/api/src/lib/pr-detection.ts packages/api/src/lib/feed.ts packages/api/src/lib/notifications.ts packages/api/src/routers/achievement.ts packages/api/__tests__/workout-finalization.test.ts packages/api/__tests__/feed.test.ts packages/api/__tests__/notifications.test.ts
git commit -m "refactor(api): make workout effects idempotent"
```

---

### Task 4: Implement durable finalization registration and processing

**Files:**
- Create: `packages/api/src/lib/workout-finalization.ts`
- Modify: `packages/api/src/index.ts`
- Test: `packages/api/__tests__/workout-finalization.test.ts`

**Interfaces:**
- Produces: `registerWorkoutFinalization(tx, input)` for use inside the same transaction that accepts completion.
- Produces: `processWorkoutFinalization(db, workoutId, now?)`.
- Produces: `processPendingWorkoutFinalizations(db, options?)`.
- Produces statuses `pending | processing | completed | failed` and a stable `newPRs` result whose entries are `{ exerciseId, exerciseName, type, value, setId }`.

- [ ] **Step 1: Add failing registration tests**

Create an initially incomplete workout and run two registrations concurrently in separate database transactions with `2026-08-09T03:00:00.000Z` and `2026-08-09T04:00:00.000Z`. Assert one database winner becomes canonical and both callers subsequently observe that same timestamp/duration. Add a fixture whose `completedAt` is already `2026-08-09T03:00:00.000Z` but whose `durationSeconds` is null; assert registration derives `3600` from `startedAt` without changing the existing timestamp.

- [ ] **Step 2: Add failing claim/recovery tests**

Cover concurrent `Promise.all` processing, a fresh processing lock that cannot be stolen, and a stale lock older than five minutes that can be reclaimed. Assert `attempts` increments only for successful claims.

- [ ] **Step 3: Implement atomic, immutable registration**

`registerWorkoutFinalization` receives a `Prisma.TransactionClient`. Within the caller's transaction, issue a parameterized conditional update equivalent to:

```sql
UPDATE workouts
SET completed_at = $1,
    duration_seconds = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ($1 - started_at))))::int
WHERE id = $2::uuid
  AND user_id = $3::uuid
  AND completed_at IS NULL
RETURNING id;
```

Then read the owner-scoped canonical workout row regardless of whether the update won. If a legacy completed row has null duration, repair only `duration_seconds` from its preserved timestamp before continuing. `Upsert` the finalization by `workoutId` with the canonical timestamp/duration and an empty update. If no owned workout exists, throw `NOT_FOUND`. This conditional write makes concurrent timestamps converge on the first database winner, and keeping the finalization insert in the same transaction prevents a completed workout from being committed without its durable recovery record.

- [ ] **Step 4: Implement an atomic claim**

Use one parameterized PostgreSQL `UPDATE ... WHERE ... RETURNING` statement through Prisma. The predicate permits `pending`, `failed`, or `processing` with `locked_at < staleBefore`, requires `available_at <= now`, and writes `processing`, `locked_at = now`, a fresh UUID `lock_token`, and `attempts = attempts + 1`. Return that token with the claim. Define `LOCK_STALE_MS = 5 * 60_000`, `RETRY_BASE_MS = 30_000`, `RETRY_MAX_MS = 15 * 60_000`, and `MAX_ERROR_CHARS = 1_000`; retry delay is `Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (attempts - 1))`.

- [ ] **Step 5: Process logical effects and persist stable results**

Inside one database transaction, re-read the owned completed workout graph including exercise names, run idempotent PR/feed/achievement/notification-intent helpers, and conditionally update the claim only where `status = "processing"` and `lockToken` still matches:

```ts
{
  status: "completed",
  processedAt: now,
  lockedAt: null,
  lockToken: null,
  lastError: null,
  result: { newPRs },
}
```

Require that conditional update to affect exactly one row; otherwise throw so the entire effect transaction rolls back and a stale worker cannot commit after a newer claim. On an exception, release the lock, set `failed`, store `String(error).slice(0, MAX_ERROR_CHARS)`, and advance `availableAt` using the constants above only when the same `lockToken` still owns the row. Do not erase a prior completed result. The effect transaction includes the fenced completed-finalization update, so a crash commits either all logical database/outbox effects and the stable result or none of them.

- [ ] **Step 6: Implement bounded batch retry**

`processPendingWorkoutFinalizations` selects at most 25 eligible IDs ordered by `availableAt`, invokes the single-record processor, and returns `{ processed, skipped, failed }` counts without letting one record abort the batch.

- [ ] **Step 7: Verify the service**

Run: `pnpm --filter @zor/api test -- workout-finalization.test.ts`

Expected: registration, concurrency, stale-lock, partial-failure, and result-replay tests pass.

- [ ] **Step 8: Commit the finalizer service**

```bash
git add packages/api/src/lib/workout-finalization.ts packages/api/src/index.ts packages/api/__tests__/workout-finalization.test.ts
git commit -m "feat(api): add durable workout finalizer"
```

---

### Task 5: Add notification-outbox delivery and server retry sweep

**Files:**
- Create: `packages/api/src/lib/notification-outbox.ts`
- Create: `apps/web/src/app/api/cron/workout-finalizations/route.ts`
- Create: `apps/web/src/app/api/cron/workout-finalizations/__tests__/route.test.ts`
- Create: `docs/runbooks/workout-finalization.md`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Produces: `deliverPendingNotifications(db, options?)`.
- Cron: authenticated `POST /api/cron/workout-finalizations` returning finalization and delivery counts.

- [ ] **Step 1: Write failing route authentication and result tests**

Mirror the existing cleanup-token cron tests: missing/wrong `CRON_SECRET` returns 401; a valid call invokes both processors and returns their count objects.

- [ ] **Step 2: Write failing outbox deduplication tests**

Test that a logical intent creates one in-app `Notification` by `dedupeKey`; all successful/dead-token outcomes mark the outbox sent; no-token delivery marks it sent after the in-app record exists; and any transient or ambiguous live-token failure leaves it retryable. Add a stale-worker test proving a superseded lock token cannot mark the row sent or failed. Assert the ambiguous-timeout test name documents that a provider may deliver twice.

- [ ] **Step 3: Implement outbox claiming and delivery**

Claim pending/failed/stale records whose `availableAt` is due with the same UUID lock-token pattern and retry/error constants as finalization. Upsert the in-app notification by `dedupeKey`, load each push token, and inspect the existing push helper's `{ delivered, deadToken, error }` result. Prune dead tokens and treat them as terminal; treat `delivered: true` as terminal; treat `delivered: false` for a live token as retryable even when the promise resolved. Mark the outbox sent only if every live token delivered or was pruned, or if there were no tokens. If any live-token outcome is transient or ambiguous, keep the row retryable and advance `availableAt` with the defined exponential formula. Every sent/failed update must match the claim's `lockToken`; a zero-row update means the worker lost ownership and must not overwrite newer state. Preserve at-least-once semantics in comments and docs: a retry can duplicate delivery to tokens that succeeded before a sibling token failed.

- [ ] **Step 4: Implement the authenticated cron route**

The route uses one cached Prisma client, checks `Authorization: Bearer ${CRON_SECRET}`, processes finalizations before notifications, caps each batch at 25, and returns 207 only when one processor reports failures.

Document an every-minute production/staging scheduler call in `docs/runbooks/workout-finalization.md`, including the authenticated `curl -X POST` form, alerting on every non-200 response (including 207 partial failure), pending/failed/oldest-age queries, safe replay behavior, and the at-least-once push caveat. A deployed schedule—not merely the route—is required evidence before TASK-23.2 can be closed; if the scheduler is managed outside this repository, record its owner and job identifier in the Backlog implementation notes.

- [ ] **Step 5: Verify API and web tests**

Run:

```bash
pnpm --filter @zor/api test -- workout-finalization.test.ts
pnpm --filter @zor/web test -- src/app/api/cron/workout-finalizations/__tests__/route.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit the retry infrastructure**

```bash
git add packages/api/src/lib/notification-outbox.ts packages/api/src/index.ts apps/web/src/app/api/cron/workout-finalizations docs/runbooks/workout-finalization.md
git commit -m "feat(api): retry workout finalization jobs"
```

Record the production/staging scheduler evidence in TASK-23.2 implementation notes.

---

### Task 6: Integrate atomic PowerSync upload, direct completion, and status reads

**Files:**
- Modify: `packages/shared/src/schemas/sync.ts`
- Modify: `packages/sync/src/connector.ts`
- Modify: `packages/sync/src/__tests__/connector.test.ts`
- Modify: `packages/api/src/routers/workout.ts`
- Modify: `packages/api/src/routers/sync.ts`
- Modify: `packages/api/__tests__/workout.test.ts`
- Modify: `packages/api/__tests__/sync.test.ts`
- Test: `packages/api/__tests__/workout-finalization.test.ts`
- Modify: `apps/web/src/components/workout/active-workout.tsx`
- Modify: `apps/web/src/components/workout/set-row.tsx`
- Create: `apps/web/src/components/workout/workout-draft-registry.ts`
- Create: `apps/web/src/components/workout/__tests__/active-workout.test.tsx`
- Create: `apps/web/src/components/workout/__tests__/workout-draft-registry.test.ts`

**Interfaces:**
- `sync.applyTransaction({ operations })` atomically applies one ordered PowerSync CRUD transaction.
- `workout.complete({ workoutId, completedAt? })` preserves the first timestamp and returns `{ workout, status, newPRs }`.
- `workout.finalizationStatus({ workoutId })` returns `{ status, newPRs, message }` for the owner; `message` is a fixed user-safe delay string rather than the stored internal error.
- PowerSync registration occurs in the same database transaction that first accepts `workouts.completed_at`, after all operations in the batch have been applied.
- Web PowerSync mode writes completion locally and observes status; only web tRPC mode invokes `workout.complete`.

- [ ] **Step 1: Define and test the ordered batch contract**

Add `syncTransactionSchema` as an object with a non-empty `operations` array whose discriminated entries are:

```ts
type SyncOperation =
  | { op: "PUT"; table: SyncedTable; id: string; data: Record<string, unknown> }
  | { op: "PATCH"; table: SyncedTable; id: string; data: Record<string, unknown> }
  | { op: "DELETE"; table: SyncedTable; id: string };
```

In `connector.test.ts`, inject a mock tRPC client and a fake PowerSync transaction containing a set `PATCH` followed by a workout completion `PATCH`. Assert one `applyTransaction.mutate` call receives both operations in order and `transaction.complete()` runs only after the mutation resolves. Add rejection coverage proving transient failures do not call `complete`, while `FORBIDDEN`/`BAD_REQUEST` preserve the existing permanent-error discard behavior.

- [ ] **Step 2: Implement connector batching**

Map the current `transaction.crud` entries to the schema above and call `sync.applyTransaction` once. Keep `applyChange`, `update`, and `delete` endpoints for older clients, but the updated connector must not call them.

Run:

```bash
pnpm --filter @zor/sync test -- connector.test.ts
```

Expected: the ordered-success, transient-retry, and permanent-discard tests pass.

- [ ] **Step 3: Write failing API atomicity and graph-readiness tests**

In `sync.test.ts`, submit a batch that creates/updates the workout graph and ends with `workouts.completed_at`. Assert:

- all earlier set values are visible when the finalizer reads the graph;
- the finalization row exists after the batch commits;
- invalid operation 2 rolls back operation 1 and creates no finalization row;
- a simulated failure after accepting completion rolls back both the workout timestamp and finalization registration;
- replaying the batch preserves the first timestamp and one finalization row.
- a PUT cannot upsert over an existing row owned by another user;
- a new child PUT cannot reference a workout or workout-exercise owned by another user;
- `duration_seconds` supplied by a client is ignored in favor of the duration derived from the canonical completion timestamp.

Also retain focused compatibility tests for the legacy single-operation endpoints, including the same existing-ID hijack and cross-owner-child cases. Their workout-completion branches must wrap the row mutation and registration in one database transaction; they may attempt processing only after that transaction commits.

- [ ] **Step 4: Implement `sync.applyTransaction`**

Extract the current table mapping, column conversion, ownership checks, and CRUD execution into transaction-client-compatible helpers. A PUT first verifies the existing row when the ID already exists; a new child PUT resolves and authorizes its parent chain before insertion. Inside `ctx.db.$transaction`, apply every operation sequentially.

For workout PUT/PATCH operations, intercept and remove mapped `completedAt` and `durationSeconds` before generic upsert/update. Remember the requested completion timestamp, apply every other field, then call `registerWorkoutFinalization(tx, ...)` only after the final batch operation. This prevents the generic updater from overwriting the first timestamp before registration and derives duration server-side. Return the registered workout IDs from the transaction and attempt `processWorkoutFinalization` only after commit. If immediate processing fails, return sync success because the durable record is already registered and the sweep owns retries.

- [ ] **Step 5: Write failing direct-completion replay tests**

Call `complete` twice with different timestamps and concurrently. Assert the workout timestamp/duration and finalized result remain identical and logical effect counts remain one.

- [ ] **Step 6: Write failing status authorization tests**

Assert the owner sees stable state/result, a different user receives NOT_FOUND, and a locally completed workout awaiting processing returns pending rather than an empty completed result.

- [ ] **Step 7: Refactor `workout.complete` through the finalizer**

Remove direct PR/feed/notification logic from the router. In one `ctx.db.$transaction`, invoke atomic registration and return the canonical workout ID; after commit, attempt processing, then return the stored workout and finalization state/result. Add the owner-scoped `finalizationStatus` query. Normalize `newPRs` to the documented `{ exerciseId, exerciseName, type, value, setId }` shape in both endpoints.

- [ ] **Step 8: Remove the PowerSync/direct-RPC race from web**

The current web set row also has a 500ms draft race. Add a draft registry whose rows register a flush callback backed by synchronous weight/reps refs. Test that Finish immediately after a keystroke cancels row debounces and flushes the final raw values before completion.

Add component tests for both data modes. In `powersync` mode, one `db.writeTransaction` invokes every registered set flush in stable set-ID order and writes `completed_at`/derived `duration_seconds` last. It then opens the local completion summary immediately and enables foreground status polling; assert `workout.complete.mutate` is never called. In `trpc` mode, await every registered `updateSet.mutateAsync` flush before invoking the direct `workout.complete({ workoutId })` mutation. A flush failure aborts completion in either mode. The completion summary updates PR callouts when status becomes completed and shows a fixed delayed message for pending/processing/failed states.

- [ ] **Step 9: Verify integration**

Run:

```bash
pnpm --filter @zor/sync test -- connector.test.ts
pnpm --filter @zor/api test -- workout.test.ts sync.test.ts workout-finalization.test.ts
pnpm --filter @zor/web test -- src/components/workout/__tests__/active-workout.test.tsx src/components/workout/__tests__/workout-draft-registry.test.ts
pnpm --filter @zor/api lint
```

Expected: all commands exit 0.

- [ ] **Step 10: Commit protocol and router integration**

```bash
git add packages/shared/src/schemas/sync.ts packages/sync/src/connector.ts packages/sync/src/__tests__/connector.test.ts packages/api/src/routers/workout.ts packages/api/src/routers/sync.ts packages/api/__tests__/workout.test.ts packages/api/__tests__/sync.test.ts packages/api/__tests__/workout-finalization.test.ts apps/web/src/components/workout/active-workout.tsx apps/web/src/components/workout/set-row.tsx apps/web/src/components/workout/workout-draft-registry.ts apps/web/src/components/workout/__tests__/active-workout.test.tsx apps/web/src/components/workout/__tests__/workout-draft-registry.test.ts
git commit -m "feat(sync): finalize completed workout batches"
```

---

### Task 7: Run migration and finalization verification

**Files:**
- Modify only if verification exposes a defect in files already owned by TASK-23.2.

**Interfaces:**
- Consumes all TASK-23.2 outputs.
- Produces verification evidence for Backlog finalization.

- [ ] **Step 1: Verify the migration on a fresh test database**

Start the same explicit disposable container used in Task 2 and verify the entire migration chain:

```bash
docker run --detach --rm --name zor-finalization-test-db --publish 127.0.0.1:55434:5432 --env POSTGRES_USER=zor_test --env POSTGRES_PASSWORD=zor_test --env POSTGRES_DB=zor_finalization_test imresamu/postgis:16-3.4-alpine
for attempt in $(seq 1 30); do docker exec zor-finalization-test-db pg_isready -U zor_test -d zor_finalization_test && break; test "$attempt" -eq 30 && exit 1; sleep 1; done
export ZOR_FINALIZATION_TEST_DB_URL='postgresql://zor_test:zor_test@127.0.0.1:55434/zor_finalization_test'
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/db exec prisma migrate deploy
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/db exec prisma migrate status
```

Expected: no pending or failed migration.

- [ ] **Step 2: Run focused suites**

```bash
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/api test -- workout.test.ts sync.test.ts workout-finalization.test.ts
pnpm --filter @zor/web test -- src/app/api/cron/workout-finalizations/__tests__/route.test.ts
pnpm --filter @zor/web test -- src/components/workout/__tests__/active-workout.test.tsx src/components/workout/__tests__/workout-draft-registry.test.ts
pnpm --filter @zor/sync test -- connector.test.ts
```

- [ ] **Step 3: Run package-wide checks**

```bash
DATABASE_URL="$ZOR_FINALIZATION_TEST_DB_URL" pnpm --filter @zor/api test
pnpm --filter @zor/api lint
pnpm --filter @zor/sync test
pnpm exec tsc -p packages/sync/tsconfig.json --noEmit
pnpm exec tsc -p packages/shared/tsconfig.json --noEmit
pnpm --filter @zor/shared test
pnpm --filter @zor/shared lint
pnpm --filter @zor/web lint
pnpm exec tsc -p apps/mobile/tsconfig.json --noEmit
```

Expected: every command exits 0 with no failed tests.

- [ ] **Step 4: Exercise the retry contract manually against a local stack**

Complete a workout offline, reconnect, verify one finalization row reaches `completed`, invoke the cron route twice, and query counts for finalization, PR, feed, notification, and outbox records. Save the exact commands/counts in TASK-23.2 implementation notes.

- [ ] **Step 5: Verify the deployed retry owner**

Confirm the staging and production scheduler job identifiers, one-minute cadence, secret source, and alert destination. Trigger the staging job once and record its HTTP response plus oldest-pending age before/after in TASK-23.2 notes. If the scheduler cannot be verified, leave TASK-23.2 open and record the external blocker.

- [ ] **Step 6: Finalize TASK-23.2**

Stop the explicit disposable database with `docker stop zor-finalization-test-db`. Then read `backlog instructions task-finalization`, verify each acceptance criterion with the evidence above, update the task through the CLI, and only then move it to Done.
