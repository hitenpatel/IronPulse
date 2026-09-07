# Injury & Recovery Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give athletes a structured way to log injuries, log recovery activities against them, and see injury-driven exercise restrictions while building a workout.

**Architecture:** Three new Prisma models (`InjuryLog`, `RecoveryActivity`, `ExerciseRestriction`) hanging off `User` with cascade delete, one new tRPC router (`injury`) exposed through the root router, and a new "Recovery" surface on both clients. Restrictions are matched to exercises by muscle group using the existing `Exercise.primaryMuscles` / `secondaryMuscles` arrays, so no exercise-table changes are needed. The feature is tRPC-only — it is deliberately NOT added to PowerSync (see Global Constraints).

**Tech Stack:** Prisma + PostgreSQL, tRPC v11 + zod (schemas live in `@zor/shared`), vitest (API + shared unit tests), React Native + React Navigation (mobile), Next.js App Router + shadcn-style UI + Playwright (web).

## Global Constraints

- Backlog task: **TASK-13**. Scope is exactly its five acceptance criteria; anything else is out of scope.
- Explicitly out of scope: automatic injury detection / ML, integration with Apple Health / Strava / Oura, any medical advice, diagnosis or treatment recommendation, and coach-to-athlete injury visibility.
- **No medical-advice copy anywhere in the UI.** Labels are descriptive only ("Restricted", "Log recovery activity"). Never render text that recommends treatment, diagnoses a condition, or advises whether to train.
- Prisma model conventions (copy them exactly): `id String @id @default(uuid()) @db.Uuid`, `userId String @map("user_id") @db.Uuid`, `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`, snake_case `@map` on every column, `@@map("table_name")`, `createdAt DateTime @default(now()) @map("created_at")`.
- This repo uses **real migrations**, not `db:push`. Every schema change ships a `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql`.
- Status/type value sets are `String` columns with a trailing comment plus a zod `z.enum` in `@zor/shared` — do NOT add native Prisma enums (the only one in the schema, `WebhookEventStatus`, is the exception, not the pattern).
- Every new schema file in `packages/shared/src/schemas/` must be re-exported from `packages/shared/src/index.ts`.
- Every new router must be registered in `packages/api/src/root.ts`.
- API procedures use `rateLimitedProcedure` from `packages/api/src/trpc.ts` (protected + rate limited) and scope every query with `where: { userId: ctx.user.id }`. Return named objects (`{ injury }`, `{ data }`), never bare arrays.
- API tests use the real Postgres harness: `createCallerFactory(<subRouter>)`, `createTestUser` / `cleanupTestData` from `packages/api/__tests__/helpers.ts`, `beforeEach` cleanup. No new mocking patterns. `vitest.config.ts` sets `fileParallelism: false` — the DB is shared, so never assume an empty table without cleaning it.
- Mobile has **no expo-router** despite the `app/(tabs)` directory naming. Screens are registered in `apps/mobile/App.tsx` in three places: the import block, `RootStackParamList`, and a `<RootStack.Screen>` entry.
- Mobile screens call tRPC imperatively (`trpc.x.y.query(...)` inside `useFocusEffect` + `useState`), NOT React Query hooks. Web pages use the React Query hooks (`trpc.x.y.useQuery`).
- **Do not run Maestro, adb, or any device command.** The Android phone is a shared resource owned by another process. Author flow files only.

## Amendments after cross-model review (2026-09-07)

These override anything later in the plan that contradicts them.

- **Muscle vocabulary is the feature's weak point and must be constrained.** `Exercise.primaryMuscles` is free text (`packages/shared/src/schemas/exercise.ts:14`), and nothing forces a restriction's `muscleGroups` to use the same spellings. A user who types "quads" or "Hamstring " gets a restriction that silently matches nothing. Therefore: the restriction editor MUST offer options drawn from the distinct muscle strings that actually exist on `Exercise` rows (add a `exercise.muscleVocabulary` query returning the distinct values, or derive them from the already-fetched exercise list) — never a free text field. The matcher additionally trims and lower-cases on both sides. Body parts on injuries are stored lower-cased for the same reason.
- **`injury.getById` is required and is currently missing.** Both detail screens (Tasks 4 and 5) load one injury by id; neither `list` nor `listRecovery` provides that. Add `getById` to Task 2 alongside `log`/`list`/`update`/`delete`, scoped by `userId`, returning `{ injury }`, throwing `NOT_FOUND` for another user's id — with a test for the foreign-id case.
- **`export.allData` must include the new data.** `packages/api/src/routers/export.ts:101` claims to export everything under GDPR Article 20. Adding three user-owned tables without extending it makes that claim false. Task 3 must extend `allData` with injuries, recovery activities and restrictions, and `packages/api/__tests__/export.test.ts` must assert they appear and stay scoped to the calling user.
- **Do NOT add Recovery to the web bottom nav.** `apps/web/src/components/layout/bottom-nav.tsx:8` places a FAB positionally at `i === 2`; a sixth entry breaks that layout. Add the sidebar entry only. Whether Recovery earns a bottom-nav slot is an information-architecture decision for the product owner, not this plan.
- **Dates are stored as `@db.Date` and truncated in UTC.** A client picker submitting local midnight can land on the wrong day for users east or west of UTC. Both forms must normalise to UTC midnight before submitting, and the tests must include a non-UTC timezone case rather than only UTC-midnight literals.
- **`injury.update` is not atomic** (`updateMany` then `findUniqueOrThrow`). A concurrent delete between the two surfaces as `INTERNAL`, not `NOT_FOUND`. Either wrap both in `db.$transaction`, or accept it and say so in a comment — do not leave it undecided.
- **Task 6 covers only half its acceptance criterion.** TASK-13 asks that workout creation "shows past injuries AND allows marking exercises as restricted". Badges alone do not show past injuries. Task 6 must also surface an injury-aware affordance in the exercise picker (at minimum, the active restrictions' source injuries, reachable from the picker), or the criterion must be explicitly renegotiated with the product owner before Task 6 starts.
- **Restriction editing stays web-only in this plan**; mobile displays restrictions but does not create them. That is defensible against the acceptance criteria, which require logging, history and the recovery timeline on both clients — but it is a deliberate asymmetry, called out here so it is not mistaken for an oversight.
- **Deliberate deviations from the "copy the model file exactly" instruction:** writes use scoped `updateMany`/`deleteMany` + count rather than the sleep router's `findFirst`-then-delete, because that makes ownership atomic. Do not "fix" this back to match sleep.
- **Kept despite the reviewer suggesting they were scope creep:** `delete` (a mis-logged injury must be removable), the `active`/`recovering`/`resolved` lifecycle (the recovery timeline is meaningless without it), and `deleteRestriction` (the web restriction editor needs it). Severity/notes editing is retained for the same reason as delete.
- **Softened claim:** the no-medical-advice constraint binds app-authored copy. User-authored restriction notes are user content and are rendered as-is; the app must not add advice of its own.
- **`cleanupTestData` in `packages/api/__tests__/helpers.ts`**: the three new tables cascade from `user.deleteMany()`, so cleanup works unchanged — but update its comment to list them, or a future reader will assume they leak.

---

### Task 1: Data model and shared schemas

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (add three models; add three back-relations to `model User`, alongside `sleepLogs SleepLog[]` around line 71)
- Create: `packages/db/prisma/migrations/<generated-timestamp>_injury_recovery/migration.sql` (do NOT invent the timestamp — `prisma migrate dev` stamps its own)
- Create: `packages/shared/src/schemas/injury.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from "./schemas/injury";` next to the other schema exports)
- Test: `packages/shared/src/__tests__/injury-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma models `InjuryLog`, `RecoveryActivity`, `ExerciseRestriction`; zod schemas `injuryTypeEnum`, `recoveryModalityEnum`, `logInjurySchema`, `updateInjurySchema`, `listInjuriesSchema`, `deleteInjurySchema`, `logRecoveryActivitySchema`, `listRecoveryActivitiesSchema`, `createRestrictionSchema`, `listRestrictionsSchema`, and their inferred types.

- [ ] **Step 1: Write the failing schema test**

Create `packages/shared/src/__tests__/injury-schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  logInjurySchema,
  logRecoveryActivitySchema,
  createRestrictionSchema,
  listInjuriesSchema,
} from "../schemas/injury";

describe("logInjurySchema", () => {
  it("accepts a minimal valid injury", () => {
    const parsed = logInjurySchema.parse({
      injuredAt: new Date("2026-09-01"),
      injuryType: "strain",
      severity: 4,
      bodyParts: ["hamstrings"],
    });
    expect(parsed.bodyParts).toEqual(["hamstrings"]);
  });

  it("rejects severity outside 1-10", () => {
    const base = { injuredAt: new Date(), injuryType: "strain", bodyParts: ["knee"] };
    expect(logInjurySchema.safeParse({ ...base, severity: 0 }).success).toBe(false);
    expect(logInjurySchema.safeParse({ ...base, severity: 11 }).success).toBe(false);
    expect(logInjurySchema.safeParse({ ...base, severity: 5.5 }).success).toBe(false);
  });

  it("rejects an unknown injury type", () => {
    const result = logInjurySchema.safeParse({
      injuredAt: new Date(),
      injuryType: "banana",
      severity: 3,
      bodyParts: ["knee"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one body part and caps the list", () => {
    const base = { injuredAt: new Date(), injuryType: "soreness", severity: 2 };
    expect(logInjurySchema.safeParse({ ...base, bodyParts: [] }).success).toBe(false);
    expect(
      logInjurySchema.safeParse({ ...base, bodyParts: Array(21).fill("knee") }).success
    ).toBe(false);
  });
});

describe("logRecoveryActivitySchema", () => {
  it("accepts a physio session logged against an injury", () => {
    const parsed = logRecoveryActivitySchema.parse({
      injuryId: "3f1c2b7e-1c9a-4f5e-9a1b-2c3d4e5f6a7b",
      performedAt: new Date("2026-09-03"),
      modality: "physical_therapy",
      durationMins: 45,
    });
    expect(parsed.modality).toBe("physical_therapy");
  });

  it("rejects a non-uuid injuryId", () => {
    expect(
      logRecoveryActivitySchema.safeParse({
        injuryId: "not-a-uuid",
        performedAt: new Date(),
        modality: "rest_day",
      }).success
    ).toBe(false);
  });
});

describe("createRestrictionSchema", () => {
  it("requires expiresAt to be in the future relative to startsAt", () => {
    const result = createRestrictionSchema.safeParse({
      injuryId: "3f1c2b7e-1c9a-4f5e-9a1b-2c3d4e5f6a7b",
      muscleGroups: ["quadriceps"],
      startsAt: new Date("2026-09-10"),
      expiresAt: new Date("2026-09-01"),
    });
    expect(result.success).toBe(false);
  });
});

describe("listInjuriesSchema", () => {
  it("defaults to an unfiltered query", () => {
    const parsed = listInjuriesSchema.parse({});
    expect(parsed.bodyPart).toBeUndefined();
    expect(parsed.from).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @zor/shared test injury-schema`
Expected: FAIL — cannot resolve `../schemas/injury`.

- [ ] **Step 3: Write the shared schemas**

Create `packages/shared/src/schemas/injury.ts`:

```ts
import { z } from "zod";

export const injuryTypeEnum = z.enum([
  "strain",
  "sprain",
  "fracture",
  "tendinopathy",
  "soreness",
  "impact",
  "other",
]);
export type InjuryType = z.infer<typeof injuryTypeEnum>;

export const injuryStatusEnum = z.enum(["active", "recovering", "resolved"]);
export type InjuryStatus = z.infer<typeof injuryStatusEnum>;

export const recoveryModalityEnum = z.enum([
  "physical_therapy",
  "rest_day",
  "mobility",
  "massage",
  "ice",
  "heat",
  "other",
]);
export type RecoveryModality = z.infer<typeof recoveryModalityEnum>;

const bodyPartsSchema = z
  .array(z.string().min(1).max(40))
  .min(1)
  .max(20);

export const logInjurySchema = z.object({
  injuredAt: z.date(),
  injuryType: injuryTypeEnum,
  severity: z.number().int().min(1).max(10),
  bodyParts: bodyPartsSchema,
  notes: z.string().max(2000).optional(),
});
export type LogInjuryInput = z.infer<typeof logInjurySchema>;

export const updateInjurySchema = z.object({
  id: z.string().uuid(),
  severity: z.number().int().min(1).max(10).optional(),
  status: injuryStatusEnum.optional(),
  resolvedAt: z.date().nullable().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateInjuryInput = z.infer<typeof updateInjurySchema>;

export const listInjuriesSchema = z.object({
  bodyPart: z.string().min(1).max(40).optional(),
  status: injuryStatusEnum.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().positive().max(100).default(50),
});
export type ListInjuriesInput = z.infer<typeof listInjuriesSchema>;

export const deleteInjurySchema = z.object({ id: z.string().uuid() });
export type DeleteInjuryInput = z.infer<typeof deleteInjurySchema>;

export const logRecoveryActivitySchema = z.object({
  injuryId: z.string().uuid(),
  performedAt: z.date(),
  modality: recoveryModalityEnum,
  durationMins: z.number().int().positive().max(1440).optional(),
  notes: z.string().max(2000).optional(),
});
export type LogRecoveryActivityInput = z.infer<typeof logRecoveryActivitySchema>;

export const listRecoveryActivitiesSchema = z.object({
  injuryId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(200).default(100),
});
export type ListRecoveryActivitiesInput = z.infer<typeof listRecoveryActivitiesSchema>;

export const createRestrictionSchema = z
  .object({
    injuryId: z.string().uuid(),
    // max(50) matches Exercise.primaryMuscles in packages/shared/src/schemas/exercise.ts:14.
    // A shorter cap would make 41-50 character muscle names permanently unrestrictable.
    muscleGroups: z.array(z.string().min(1).max(50)).min(1).max(20),
    note: z.string().max(200).optional(),
    startsAt: z.date(),
    expiresAt: z.date(),
  })
  .refine((v) => v.expiresAt > v.startsAt, {
    message: "expiresAt must be after startsAt",
    path: ["expiresAt"],
  });
export type CreateRestrictionInput = z.infer<typeof createRestrictionSchema>;

export const listRestrictionsSchema = z.object({
  activeOn: z.date().optional(),
});
export type ListRestrictionsInput = z.infer<typeof listRestrictionsSchema>;

export const deleteRestrictionSchema = z.object({ id: z.string().uuid() });
export type DeleteRestrictionInput = z.infer<typeof deleteRestrictionSchema>;
```

Add to `packages/shared/src/index.ts`, next to the other schema exports:

```ts
export * from "./schemas/injury";
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @zor/shared test injury-schema`
Expected: PASS, 8 tests.

- [ ] **Step 5: Add the Prisma models**

In `packages/db/prisma/schema.prisma`, after the Sleep section:

```prisma
// ─── Injury & Recovery ──────────────────────────────────

model InjuryLog {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  injuredAt  DateTime  @map("injured_at") @db.Date
  injuryType String    @map("injury_type") // strain, sprain, fracture, tendinopathy, soreness, impact, other
  severity   Int // 1-10
  bodyParts  String[]  @map("body_parts")
  status     String    @default("active") // active, recovering, resolved
  resolvedAt DateTime? @map("resolved_at") @db.Date
  notes      String?
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  user       User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  activities RecoveryActivity[]
  restrictions ExerciseRestriction[]

  @@index([userId, injuredAt])
  @@index([userId, status])
  @@map("injury_logs")
}

model RecoveryActivity {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  injuryId     String   @map("injury_id") @db.Uuid
  performedAt  DateTime @map("performed_at") @db.Date
  modality     String // physical_therapy, rest_day, mobility, massage, ice, heat, other
  durationMins Int?     @map("duration_mins")
  notes        String?
  createdAt    DateTime @default(now()) @map("created_at")

  user   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  injury InjuryLog @relation(fields: [injuryId], references: [id], onDelete: Cascade)

  @@index([userId, performedAt])
  @@index([injuryId])
  @@map("recovery_activities")
}

model ExerciseRestriction {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  injuryId     String   @map("injury_id") @db.Uuid
  muscleGroups String[] @map("muscle_groups")
  note         String?
  startsAt     DateTime @map("starts_at") @db.Date
  expiresAt    DateTime @map("expires_at") @db.Date
  createdAt    DateTime @default(now()) @map("created_at")

  user   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  injury InjuryLog @relation(fields: [injuryId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@map("exercise_restrictions")
}
```

And in `model User`, next to `sleepLogs SleepLog[]`:

```prisma
  injuryLogs           InjuryLog[]
  recoveryActivities   RecoveryActivity[]
  exerciseRestrictions ExerciseRestriction[]
```

- [ ] **Step 6: Generate the migration and the client**

Run: `pnpm --filter @zor/db exec prisma migrate dev --name injury_recovery`
Expected: a new `packages/db/prisma/migrations/<timestamp>_injury_recovery/migration.sql` creating `injury_logs`, `recovery_activities` and `exercise_restrictions`, and `prisma generate` succeeding. Confirm the SQL contains all three `CREATE TABLE` statements and the cascade foreign keys.

- [ ] **Step 7: Verify the sync guard tests still pass**

Run: `pnpm --filter @zor/db test && pnpm --filter @zor/sync test`
Expected: PASS. These new tables are intentionally NOT added to `packages/sync/src/schema.ts` or `docker/sync-rules.yaml` — the feature is online-only, matching how sleep, meal, goal and notification are already excluded at `docker/sync-rules.yaml:11`.

- [ ] **Step 8: Commit**

```bash
git add packages/db/prisma packages/shared/src/schemas/injury.ts packages/shared/src/index.ts packages/shared/src/__tests__/injury-schema.test.ts
git commit -m "feat(db): add injury, recovery activity and exercise restriction models"
```

---

### Task 2: Injury router — log, list, update, delete

**Files:**
- Create: `packages/api/src/routers/injury.ts`
- Modify: `packages/api/src/root.ts` (import + register `injury: injuryRouter`)
- Test: `packages/api/__tests__/injury.test.ts`

**Interfaces:**
- Consumes: schemas from Task 1; `createTRPCRouter`, `rateLimitedProcedure` from `../trpc`.
- Produces: `injuryRouter` with `log`, `list`, `update`, `delete`. `log` returns `{ injury }`, `list` returns `{ data }`, `update` returns `{ injury }`, `delete` returns `{ id }`.

- [ ] **Step 1: Write the failing test**

Create `packages/api/__tests__/injury.test.ts`, following `body-metric.test.ts` exactly:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { injuryRouter } from "../src/routers/injury";

const db = new PrismaClient();
const createCaller = createCallerFactory(injuryRouter);

function injuryCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let otherUser: ReturnType<typeof createTestUser>;

beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "injury@test.com" });
  otherUser = createTestUser({ email: "other-injury@test.com" });
  await db.user.createMany({
    data: [
      { id: testUser.id, email: testUser.email, name: testUser.name },
      { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    ],
  });
});

describe("injury.log", () => {
  it("logs an injury with type, severity and body parts", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({
      injuredAt: new Date("2026-09-01"),
      injuryType: "strain",
      severity: 6,
      bodyParts: ["hamstrings", "glutes"],
      notes: "felt it on the second set",
    });
    expect(injury.userId).toBe(testUser.id);
    expect(injury.injuryType).toBe("strain");
    expect(injury.severity).toBe(6);
    expect(injury.bodyParts).toEqual(["hamstrings", "glutes"]);
    expect(injury.status).toBe("active");
  });

  it("rejects an unauthenticated caller", async () => {
    const caller = injuryCaller(null);
    await expect(
      caller.log({
        injuredAt: new Date(),
        injuryType: "soreness",
        severity: 2,
        bodyParts: ["calves"],
      })
    ).rejects.toThrow();
  });
});

describe("injury.list", () => {
  beforeEach(async () => {
    const caller = injuryCaller({ user: testUser });
    await caller.log({ injuredAt: new Date("2026-06-01"), injuryType: "sprain", severity: 5, bodyParts: ["ankle"] });
    await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 3, bodyParts: ["hamstrings"] });
    await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date("2026-08-02"), injuryType: "impact", severity: 9, bodyParts: ["shoulder"] },
    });
  });

  it("returns only the caller's injuries, newest first", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({});
    expect(data).toHaveLength(2);
    expect(data.every((i) => i.userId === testUser.id)).toBe(true);
    expect(data[0].injuryType).toBe("strain");
  });

  it("filters by body part", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({ bodyPart: "ankle" });
    expect(data).toHaveLength(1);
    expect(data[0].bodyParts).toContain("ankle");
  });

  it("filters by date range", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({
      from: new Date("2026-07-01"),
      to: new Date("2026-09-01"),
    });
    expect(data).toHaveLength(1);
    expect(data[0].injuryType).toBe("strain");
  });
});

describe("injury.update", () => {
  it("marks an injury resolved", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 4, bodyParts: ["quadriceps"] });
    const { injury: updated } = await caller.update({
      id: injury.id,
      status: "resolved",
      resolvedAt: new Date("2026-09-01"),
    });
    expect(updated.status).toBe("resolved");
    expect(updated.resolvedAt).toEqual(new Date("2026-09-01"));
  });

  it("cannot update another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 8, bodyParts: ["shoulder"] },
    });
    await expect(
      injuryCaller({ user: testUser }).update({ id: foreign.id, severity: 1 })
    ).rejects.toThrow();
    const untouched = await db.injuryLog.findUnique({ where: { id: foreign.id } });
    expect(untouched?.severity).toBe(8);
  });
});

describe("injury.delete", () => {
  it("deletes the caller's injury", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date(), injuryType: "soreness", severity: 2, bodyParts: ["lats"] });
    await caller.delete({ id: injury.id });
    expect(await db.injuryLog.findUnique({ where: { id: injury.id } })).toBeNull();
  });

  it("cannot delete another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 8, bodyParts: ["shoulder"] },
    });
    await expect(injuryCaller({ user: testUser }).delete({ id: foreign.id })).rejects.toThrow();
    expect(await db.injuryLog.findUnique({ where: { id: foreign.id } })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @zor/api test injury`
Expected: FAIL — cannot resolve `../src/routers/injury`.

- [ ] **Step 3: Implement the router**

Create `packages/api/src/routers/injury.ts`. Ownership is enforced by making every write a scoped `updateMany` / `deleteMany` and throwing `NOT_FOUND` when zero rows match — never by fetching then trusting the id.

```ts
import { TRPCError } from "@trpc/server";
import {
  logInjurySchema,
  updateInjurySchema,
  listInjuriesSchema,
  deleteInjurySchema,
} from "@zor/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const injuryRouter = createTRPCRouter({
  log: rateLimitedProcedure
    .input(logInjurySchema)
    .mutation(async ({ ctx, input }) => {
      const injury = await ctx.db.injuryLog.create({
        data: {
          userId: ctx.user.id,
          injuredAt: input.injuredAt,
          injuryType: input.injuryType,
          severity: input.severity,
          bodyParts: input.bodyParts,
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      return { injury };
    }),

  list: rateLimitedProcedure
    .input(listInjuriesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.injuryLog.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
          // NOTE: `has` is case-sensitive. Both the logging form and this
          // filter must submit body parts already lower-cased (see the
          // vocabulary amendment in Global Constraints).
          ...(input.bodyPart && { bodyParts: { has: input.bodyPart.toLowerCase() } }),
          ...((input.from || input.to) && {
            injuredAt: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }),
        },
        orderBy: { injuredAt: "desc" },
        take: input.limit,
      });
      return { data };
    }),

  update: rateLimitedProcedure
    .input(updateInjurySchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.injuryLog.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: {
          ...(input.severity !== undefined && { severity: input.severity }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.resolvedAt !== undefined && { resolvedAt: input.resolvedAt }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const injury = await ctx.db.injuryLog.findUniqueOrThrow({ where: { id: input.id } });
      return { injury };
    }),

  delete: rateLimitedProcedure
    .input(deleteInjurySchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.injuryLog.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
```

Register it in `packages/api/src/root.ts` — add `import { injuryRouter } from "./routers/injury";` with the other imports and `injury: injuryRouter,` in the router map.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @zor/api test injury`
Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @zor/api lint
git add packages/api/src/routers/injury.ts packages/api/src/root.ts packages/api/__tests__/injury.test.ts
git commit -m "feat(api): add injury router with log, list, update and delete"
```

---

### Task 3: Recovery activities and exercise restrictions

**Files:**
- Modify: `packages/api/src/routers/injury.ts` (add five procedures)
- Test: `packages/api/__tests__/injury-recovery.test.ts`

**Interfaces:**
- Consumes: `injuryRouter` from Task 2.
- Produces: `logRecovery` → `{ activity }`, `listRecovery` → `{ data }`, `addRestriction` → `{ restriction }`, `listRestrictions` → `{ data }` (each row `{ id, injuryId, muscleGroups, note, startsAt, expiresAt }`), `deleteRestriction` → `{ id }`. Task 6 depends on `listRestrictions`.

- [ ] **Step 1: Write the failing test**

Create `packages/api/__tests__/injury-recovery.test.ts` with the same harness preamble as Task 2 (`db`, `createCaller`, `injuryCaller`, `beforeEach` creating `testUser` and `otherUser`), then:

```ts
describe("injury.logRecovery", () => {
  it("logs a recovery activity against the caller's injury", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    const { activity } = await caller.logRecovery({
      injuryId: injury.id,
      performedAt: new Date("2026-08-03"),
      modality: "physical_therapy",
      durationMins: 45,
    });
    expect(activity.injuryId).toBe(injury.id);
    expect(activity.userId).toBe(testUser.id);
    expect(activity.modality).toBe("physical_therapy");
  });

  it("refuses to attach recovery to another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 7, bodyParts: ["shoulder"] },
    });
    await expect(
      injuryCaller({ user: testUser }).logRecovery({
        injuryId: foreign.id,
        performedAt: new Date(),
        modality: "rest_day",
      })
    ).rejects.toThrow();
    expect(await db.recoveryActivity.count()).toBe(0);
  });
});

describe("injury.listRecovery", () => {
  it("returns the caller's activities for one injury, newest first", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date("2026-08-02"), modality: "ice" });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date("2026-08-05"), modality: "mobility" });
    const { data } = await caller.listRecovery({ injuryId: injury.id });
    expect(data).toHaveLength(2);
    expect(data[0].modality).toBe("mobility");
  });
});

describe("injury.addRestriction / listRestrictions", () => {
  it("creates a restriction and returns it as active on a date inside its window", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 6, bodyParts: ["quadriceps"] });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["quadriceps"],
      note: "no squats",
      startsAt: new Date("2026-08-01"),
      expiresAt: new Date("2026-08-15"),
    });
    const { data } = await caller.listRestrictions({ activeOn: new Date("2026-08-10") });
    expect(data).toHaveLength(1);
    expect(data[0].muscleGroups).toEqual(["quadriceps"]);
    expect(data[0].note).toBe("no squats");
  });

  it("excludes restrictions whose window has passed", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-06-01"), injuryType: "sprain", severity: 4, bodyParts: ["ankle"] });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["calves"],
      startsAt: new Date("2026-06-01"),
      expiresAt: new Date("2026-06-15"),
    });
    const { data } = await caller.listRestrictions({ activeOn: new Date("2026-09-01") });
    expect(data).toHaveLength(0);
  });

  it("never returns another user's restrictions", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date("2026-08-01"), injuryType: "impact", severity: 7, bodyParts: ["shoulder"] },
    });
    await db.exerciseRestriction.create({
      data: {
        userId: otherUser.id,
        injuryId: foreign.id,
        muscleGroups: ["deltoids"],
        startsAt: new Date("2026-08-01"),
        expiresAt: new Date("2026-12-01"),
      },
    });
    const { data } = await injuryCaller({ user: testUser }).listRestrictions({ activeOn: new Date("2026-09-01") });
    expect(data).toHaveLength(0);
  });
});

describe("injury.delete cascade", () => {
  it("removes the injury's recovery activities and restrictions", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date(), modality: "massage" });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["hamstrings"],
      startsAt: new Date("2026-08-01"),
      expiresAt: new Date("2026-09-30"),
    });
    await caller.delete({ id: injury.id });
    expect(await db.recoveryActivity.count()).toBe(0);
    expect(await db.exerciseRestriction.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @zor/api test injury-recovery`
Expected: FAIL — `caller.logRecovery is not a function`.

- [ ] **Step 3: Add the procedures**

Append to the `injuryRouter` map in `packages/api/src/routers/injury.ts` (import the four extra schemas from `@zor/shared`, and add a private helper above the router):

```ts
import type { PrismaClient } from "@zor/db";

async function assertOwnsInjury(
  db: PrismaClient,
  injuryId: string,
  userId: string
) {
  const owned = await db.injuryLog.count({ where: { id: injuryId, userId } });
  if (owned === 0) throw new TRPCError({ code: "NOT_FOUND" });
}
```

```ts
  logRecovery: rateLimitedProcedure
    .input(logRecoveryActivitySchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnsInjury(ctx.db, input.injuryId, ctx.user.id);
      const activity = await ctx.db.recoveryActivity.create({
        data: {
          userId: ctx.user.id,
          injuryId: input.injuryId,
          performedAt: input.performedAt,
          modality: input.modality,
          ...(input.durationMins !== undefined && { durationMins: input.durationMins }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      return { activity };
    }),

  listRecovery: rateLimitedProcedure
    .input(listRecoveryActivitiesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.recoveryActivity.findMany({
        where: { userId: ctx.user.id, ...(input.injuryId && { injuryId: input.injuryId }) },
        orderBy: { performedAt: "desc" },
        take: input.limit,
      });
      return { data };
    }),

  addRestriction: rateLimitedProcedure
    .input(createRestrictionSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnsInjury(ctx.db, input.injuryId, ctx.user.id);
      const restriction = await ctx.db.exerciseRestriction.create({
        data: {
          userId: ctx.user.id,
          injuryId: input.injuryId,
          muscleGroups: input.muscleGroups,
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
          ...(input.note !== undefined && { note: input.note }),
        },
      });
      return { restriction };
    }),

  listRestrictions: rateLimitedProcedure
    .input(listRestrictionsSchema)
    .query(async ({ ctx, input }) => {
      const activeOn = input.activeOn ?? new Date();
      const data = await ctx.db.exerciseRestriction.findMany({
        where: {
          userId: ctx.user.id,
          startsAt: { lte: activeOn },
          expiresAt: { gte: activeOn },
        },
        // Explicit select: the documented row shape must be the actual row
        // shape, and userId must not travel to the client.
        select: {
          id: true,
          injuryId: true,
          muscleGroups: true,
          note: true,
          startsAt: true,
          expiresAt: true,
        },
        orderBy: { expiresAt: "asc" },
        take: 200,
      });
      return { data };
    }),

  deleteRestriction: rateLimitedProcedure
    .input(deleteRestrictionSchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.exerciseRestriction.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
```

- [ ] **Step 4: Run both API test files and confirm they pass**

Run: `pnpm --filter @zor/api test injury`
Expected: PASS — `injury.test.ts` 9 tests, `injury-recovery.test.ts` 7 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @zor/api lint
git add packages/api/src/routers/injury.ts packages/api/__tests__/injury-recovery.test.ts
git commit -m "feat(api): log recovery activities and exercise restrictions against injuries"
```

---

### Task 4: Mobile Recovery section

**Files:**
- Create: `apps/mobile/app/recovery/index.tsx` (injury list + "Log injury" entry)
- Create: `apps/mobile/app/recovery/log-injury.tsx` (form: date, type, severity 1-10, body parts, notes)
- Create: `apps/mobile/app/recovery/[injury]-detail.tsx` — name it `apps/mobile/app/recovery/injury-detail.tsx`, taking the injury id via route params (recovery timeline + "Log recovery activity")
- Modify: `apps/mobile/App.tsx` (import the three screens; add `Recovery: undefined; RecoveryLogInjury: undefined; RecoveryInjuryDetail: { injuryId: string };` to `RootStackParamList`; add three `<RootStack.Screen>` entries beside the Nutrition/Sleep group)
- Modify: `apps/mobile/app/(tabs)/profile.tsx:215` (add `{ label: "Recovery", screen: "Recovery", icon: HeartPulse, tone: "purple" }` to the link list)
- Test: screen/component tests go under `apps/mobile/components/**/__tests__/` (jest picks these up) and pure-logic tests under `apps/mobile/lib/__tests__/` (vitest picks these up). A file at `apps/mobile/__tests__/` matches NEITHER runner and will silently never execute — verify against `apps/mobile/jest.config.cjs:17` and `apps/mobile/vitest.config.ts:5` before choosing the path.

**Interfaces:**
- Consumes: `trpc.injury.log` / `list` / `update` / `logRecovery` / `listRecovery` from Tasks 2-3.
- Produces: registered route names `Recovery`, `RecoveryLogInjury`, `RecoveryInjuryDetail`.

- [ ] **Step 1: Read the model screen first**

Read `apps/mobile/app/sleep/index.tsx` end to end. Copy its structure: imperative `trpc.<router>.<proc>.query(...)` inside `useFocusEffect`, `useState` for data/loading/error, `EmptyState` / `ErrorState` / `Skeleton` from `apps/mobile/components/ui`, theme tokens from `apps/mobile/lib/theme.ts`. Do not introduce React Query.

- [ ] **Step 2: Write the failing screen test**

The test renders the injury list screen with `trpc.injury.list.query` mocked to resolve two injuries and asserts: both injury types render, the severity is shown, and the empty state renders instead when the list is empty. Mock the tRPC client the same way the existing mobile screen tests do — read one first and copy its mocking approach exactly.

- [ ] **Step 3: Run it and confirm it fails**

Run the mobile unit test script from `apps/mobile/package.json` (check the exact name) filtered to `recovery-screen`.
Expected: FAIL — module not found.

- [ ] **Step 4: Build the three screens**

Requirements, all of which come straight from the acceptance criteria:
- List screen: injuries newest first, each row showing type, severity, body parts and status; filter control for body part; tap navigates to the detail screen; "Log injury" button navigates to the form.
- Log-injury form: date picker, injury type picker sourced from `injuryTypeEnum`, severity 1-10 selector, multi-select body parts, optional notes; submits `trpc.injury.log.mutate` and navigates back on success; renders the server error on failure.
- Detail screen: injury summary, a chronological recovery timeline from `trpc.injury.listRecovery.query({ injuryId })`, a "Log recovery activity" form (modality from `recoveryModalityEnum`, optional duration and notes) and a control to mark the injury `recovering` or `resolved` via `trpc.injury.update.mutate`.
- Give every interactive element a stable `testID` (`recovery-injury-list`, `recovery-log-injury-button`, `injury-type-picker`, `injury-severity`, `recovery-activity-modality`, `injury-status-control`) — the Maestro flow in Step 6 depends on them.
- No medical-advice copy (Global Constraints).

- [ ] **Step 5: Wire navigation and the Profile entry**

Three edits in `apps/mobile/App.tsx` (import, `RootStackParamList`, `<RootStack.Screen>`) plus the Profile link-list entry at `apps/mobile/app/(tabs)/profile.tsx:215`.

- [ ] **Step 6: Author the Maestro flow (do not run it)**

Create `apps/mobile/e2e/recovery-log-injury.yaml` in the style of the existing passing flows (`apps/mobile/e2e/goals.yaml` is a good model): open Profile → Recovery, tap `recovery-log-injury-button`, fill the form, assert the new injury appears in `recovery-injury-list`. Verify every selector you use exists in the screens you just wrote. **Do not invoke Maestro or adb** — the device is a shared resource; execution is verified separately.

- [ ] **Step 7: Run the unit tests and typecheck**

Run, from `apps/mobile`: `npx vitest run`, `npx jest --config jest.config.cjs --runInBand`, and `npx tsc --noEmit`. There is no `typecheck` script in `apps/mobile/package.json` — invoke tsc directly. One pre-existing TS7016 error in `lib/__tests__/android-e2e-bundle-plugin.test.ts` is the known baseline.
Expected: PASS, and no new TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): add Recovery section for injury and recovery logging"
```

---

### Task 5: Web Recovery section

**Files:**
- Create: `apps/web/src/app/(app)/recovery/page.tsx` (injury list + log form)
- Create: `apps/web/src/app/(app)/recovery/[id]/page.tsx` (injury detail + recovery timeline)
- Create: `apps/web/src/app/(app)/recovery/log-injury-form.tsx` (co-located client component)
- Modify: `apps/web/src/components/layout/sidebar-nav.tsx:27-40` and `apps/web/src/components/layout/bottom-nav.tsx:9-13` (add the Recovery entry)
- Test: `apps/web/src/app/(app)/recovery/__tests__/log-injury-form.test.tsx`
- Test: `apps/web/e2e/recovery.spec.ts`

**Interfaces:**
- Consumes: `trpc.injury.*` from Tasks 2-3 via the React Query hooks in `@/lib/trpc/client`.
- Produces: routes `/recovery` and `/recovery/[id]`.

- [ ] **Step 1: Read the model page first**

Read `apps/web/src/app/(app)/sleep/page.tsx` and its co-located component. Copy the pattern: `"use client"`, `trpc.x.y.useQuery` / `useMutation`, `trpc.useUtils()` for invalidation after a mutation, shadcn-style primitives from `@/components/ui`, `lucide-react` icons.

- [ ] **Step 2: Write the failing component test**

In `apps/web/src/app/(app)/recovery/__tests__/log-injury-form.test.tsx`, assert that the form: renders every injury type option, refuses to submit with no body part selected, refuses a severity outside 1-10, and calls the mutation once with the exact payload on a valid submit. Follow the mocking style used by the existing tests in `apps/web/src/app/(app)/nutrition/__tests__/`.

- [ ] **Step 3: Run it and confirm it fails**

Run the web unit test script from `apps/web/package.json` filtered to `log-injury-form`.
Expected: FAIL — module not found.

- [ ] **Step 4: Build the pages**

- `/recovery`: injury list (newest first) with body-part and status filters, each row linking to the detail page, plus the log-injury form.
- `/recovery/[id]`: injury summary, recovery timeline, "log recovery activity" form, status control, and the restriction editor (`addRestriction` / `deleteRestriction`, showing muscle groups and the active window).
- Add the nav entry to both `sidebar-nav.tsx` and `bottom-nav.tsx`.
- No medical-advice copy (Global Constraints).

- [ ] **Step 5: Write the Playwright spec**

`apps/web/e2e/recovery.spec.ts`, following the conventions in the existing specs: log an injury, assert it appears in the list, open its detail page, log a recovery activity, assert it appears on the timeline. Also assert the page has no serious axe violations, matching the pattern in `apps/web/e2e/a11y.spec.ts`.

- [ ] **Step 6: Run unit tests, typecheck and the new Playwright spec**

Run the web unit test and lint scripts, then the Playwright spec alone (not the full suite).
Expected: PASS. If the Playwright run needs a dev server or seeded auth that is not available in this environment, report that instead of skipping the assertion silently.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add Recovery section for injury and recovery logging"
```

---

### Task 6: Surface restrictions during workout building

**Files:**
- Modify: `apps/web/src/components/workout/add-exercise-sheet.tsx` (restriction badge on matching rows; `trpc.exercise.list.useQuery` is at :42-44)
- Modify: `apps/mobile/components/workout/exercise-multi-picker.tsx` (same badge)
- Modify: `apps/mobile/app/workout/add-exercise.tsx` (fetch active restrictions and pass them to the picker)
- Create: `packages/shared/src/restrictions.ts` (pure matcher, so both clients share one implementation)
- Modify: `packages/shared/src/index.ts` (export it)
- Test: `packages/shared/src/__tests__/restrictions.test.ts`

**Interfaces:**
- Consumes: `trpc.injury.listRestrictions` from Task 3; `Exercise.primaryMuscles` / `secondaryMuscles` (`packages/db/prisma/schema.prisma:163-186`, mirrored in `packages/sync/src/schema.ts:128-138`).
- Produces: `isExerciseRestricted(exercise: { primaryMuscles: string[]; secondaryMuscles: string[] }, restrictions: { muscleGroups: string[]; note?: string | null }[]): { restricted: boolean; reasons: string[] }`.

- [ ] **Step 1: Write the failing matcher test**

Create `packages/shared/src/__tests__/restrictions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isExerciseRestricted } from "../restrictions";

const squat = { primaryMuscles: ["quadriceps"], secondaryMuscles: ["glutes", "hamstrings"] };

describe("isExerciseRestricted", () => {
  it("flags an exercise whose primary muscle is restricted", () => {
    const result = isExerciseRestricted(squat, [{ muscleGroups: ["quadriceps"], note: "no squats" }]);
    expect(result.restricted).toBe(true);
    expect(result.reasons).toEqual(["no squats"]);
  });

  it("flags an exercise whose secondary muscle is restricted", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["hamstrings"], note: null }]).restricted).toBe(true);
  });

  it("does not flag an unrelated exercise", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["deltoids"], note: null }]).restricted).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isExerciseRestricted(squat, [{ muscleGroups: ["Quadriceps"], note: null }]).restricted).toBe(true);
  });

  it("returns one reason per matching restriction and skips noteless ones", () => {
    const result = isExerciseRestricted(squat, [
      { muscleGroups: ["quadriceps"], note: "no squats" },
      { muscleGroups: ["glutes"], note: null },
      { muscleGroups: ["deltoids"], note: "no press" },
    ]);
    expect(result.restricted).toBe(true);
    expect(result.reasons).toEqual(["no squats"]);
  });

  it("is not restricted when there are no restrictions", () => {
    expect(isExerciseRestricted(squat, []).restricted).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @zor/shared test restrictions`
Expected: FAIL — cannot resolve `../restrictions`.

- [ ] **Step 3: Implement the matcher**

Create `packages/shared/src/restrictions.ts`:

```ts
export interface RestrictionLike {
  muscleGroups: string[];
  note?: string | null;
}

export interface ExerciseMuscles {
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export function isExerciseRestricted(
  exercise: ExerciseMuscles,
  restrictions: RestrictionLike[]
): { restricted: boolean; reasons: string[] } {
  const muscles = new Set(
    [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map((m) => m.toLowerCase())
  );
  const matched = restrictions.filter((r) =>
    r.muscleGroups.some((g) => muscles.has(g.toLowerCase()))
  );
  return {
    restricted: matched.length > 0,
    reasons: matched.map((r) => r.note).filter((n): n is string => Boolean(n)),
  };
}
```

Export it from `packages/shared/src/index.ts`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @zor/shared test restrictions`
Expected: PASS, 6 tests.

- [ ] **Step 5: Surface it in both exercise pickers**

Each picker fetches active restrictions once (`trpc.injury.listRestrictions` — `useQuery` on web, imperative `.query()` on mobile) and renders a "Restricted" badge on any row where `isExerciseRestricted` returns true, with the reason as supporting text when present. The exercise stays selectable — this is information, not a block. Give the badge a stable `testID` / `data-testid` of `exercise-restricted-badge`.

- [ ] **Step 6: Extend the client tests**

Add one web component test asserting the badge renders for a matching exercise and not for a non-matching one, and one mobile test doing the same for the multi-picker. Run both suites plus the typechecks.

- [ ] **Step 7: Commit**

```bash
git add packages/shared apps/web/src/components/workout apps/mobile/components/workout apps/mobile/app/workout
git commit -m "feat: flag injury-restricted exercises while building a workout"
```

---

## Acceptance criteria coverage

| TASK-13 acceptance criterion | Covered by |
|---|---|
| Log injury with date, type, severity 1-10, body parts | Tasks 1, 2, 4, 5 |
| Injury history with body-part and date-range filtering | Task 2 (`injury.list`), Tasks 4-5 (UI filters) |
| Log recovery activities against injuries | Tasks 1, 3, 4, 5 |
| Workout building shows past injuries and marks exercises restricted | Tasks 3, 6 |
| Mobile and web expose logging, history and recovery timeline in a "Recovery" section | Tasks 4, 5 |

## Known verification gaps

- The Maestro flow from Task 4 is authored but not executed — the Android device is a shared resource. It runs in the nightly device pipeline.
- Task 5's Playwright spec needs a running web dev server and seeded auth; if unavailable, that step reports rather than silently passing.
