# Core Data Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement exercise seed data, five tRPC routers (exercise, workout, cardio, bodyMetric, analytics), PR detection, GPX import, and supporting Zod schemas — the full API layer needed before UI development.

**Architecture:** New Zod schemas in `@ironpulse/shared`, new routers in `@ironpulse/api`, seed infrastructure in `@ironpulse/db`. All routers follow existing patterns (publicProcedure/protectedProcedure, Zod input validation, explicit select fields). TDD against real PostgreSQL.

**Tech Stack:** tRPC v11, Prisma, Zod, Vitest, fast-xml-parser (GPX), tsx (seed script)

**Spec:** `docs/superpowers/specs/2026-03-12-core-data-layer-design.md`

---

## File Structure

```
packages/
├── shared/src/
│   ├── schemas/
│   │   ├── pagination.ts          # Shared cursor pagination schema
│   │   ├── exercise.ts            # createExerciseSchema, listExercisesSchema
│   │   ├── workout.ts             # createWorkout, updateWorkout, addExercise, addSet, updateSet, deleteSet, completeWorkout
│   │   ├── cardio.ts              # createCardio, completeGpsSession, importGpx
│   │   ├── body-metric.ts         # createBodyMetric, listBodyMetrics
│   │   └── analytics.ts           # weeklyVolume, personalRecords, bodyWeightTrend
│   ├── enums.ts                   # (modify) Add GPX to CardioSource
│   └── index.ts                   # (modify) Export new schemas
├── api/
│   ├── src/
│   │   ├── routers/
│   │   │   ├── exercise.ts        # exercise.list, exercise.getById, exercise.create
│   │   │   ├── workout.ts         # Full workout CRUD + complete
│   │   │   ├── cardio.ts          # Manual, GPS, GPX import
│   │   │   ├── body-metric.ts     # create (upsert), list
│   │   │   └── analytics.ts       # weeklyVolume, personalRecords, bodyWeightTrend
│   │   ├── lib/
│   │   │   ├── pr-detection.ts    # Epley 1RM + volume PR detection
│   │   │   └── gpx.ts             # GPX parsing + Haversine distance
│   │   ├── root.ts                # (modify) Add all new routers
│   │   └── index.ts               # (modify) if needed
│   ├── __tests__/
│   │   ├── helpers.ts             # (modify) Add cleanupTestData helper
│   │   ├── exercise.test.ts       # Exercise router tests
│   │   ├── workout.test.ts        # Workout router + PR detection tests
│   │   ├── cardio.test.ts         # Cardio router + GPX tests
│   │   ├── body-metric.test.ts    # Body metric tests
│   │   └── analytics.test.ts      # Analytics tests
│   └── package.json               # (modify) Add fast-xml-parser
├── db/
│   ├── seeds/
│   │   ├── download-exercises.ts  # One-time script to fetch from wrkout repo
│   │   ├── exercises.json         # Consolidated exercise data (generated)
│   │   └── seed.ts                # Prisma seed script
│   └── package.json               # (modify) Add tsx, prisma.seed config
```

---

## Chunk 1: Schemas, Seed Data, and Test Infrastructure

### Task 1: Zod Schemas and Enum Update

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/pagination.ts`
- Create: `packages/shared/src/schemas/exercise.ts`
- Create: `packages/shared/src/schemas/workout.ts`
- Create: `packages/shared/src/schemas/cardio.ts`
- Create: `packages/shared/src/schemas/body-metric.ts`
- Create: `packages/shared/src/schemas/analytics.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add GPX to CardioSource enum**

In `packages/shared/src/enums.ts`, add `GPX` to the `CardioSource` object:

```typescript
export const CardioSource = {
  MANUAL: "manual",
  GPS: "gps",
  GPX: "gpx",
  GARMIN: "garmin",
  STRAVA: "strava",
} as const;
```

- [ ] **Step 2: Create cursor pagination schema**

Create `packages/shared/src/schemas/pagination.ts`:

```typescript
import { z } from "zod";

// Cursor is a UUID (record ID). Used with Prisma's cursor + skip: 1 pattern.
// Ordering is set per-query (e.g. startedAt desc). Prisma handles cursor positioning
// correctly with orderBy — the cursor identifies the starting record, not the sort value.
export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
```

- [ ] **Step 3: Create exercise schemas**

Create `packages/shared/src/schemas/exercise.ts`:

```typescript
import { z } from "zod";
import { ExerciseCategory, Equipment } from "../enums";
import { cursorPaginationSchema } from "./pagination";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    ExerciseCategory.COMPOUND,
    ExerciseCategory.ISOLATION,
    ExerciseCategory.CARDIO,
    ExerciseCategory.STRETCHING,
    ExerciseCategory.PLYOMETRIC,
  ]),
  primaryMuscles: z.array(z.string()).min(1),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z
    .enum([
      Equipment.BARBELL,
      Equipment.DUMBBELL,
      Equipment.KETTLEBELL,
      Equipment.MACHINE,
      Equipment.CABLE,
      Equipment.BODYWEIGHT,
      Equipment.BAND,
      Equipment.OTHER,
    ])
    .nullable()
    .optional(),
  instructions: z.string().optional(),
});
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export const listExercisesSchema = cursorPaginationSchema.extend({
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});
export type ListExercisesInput = z.infer<typeof listExercisesSchema>;
```

- [ ] **Step 4: Create workout schemas**

Create `packages/shared/src/schemas/workout.ts`:

```typescript
import { z } from "zod";
import { SetType } from "../enums";

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  templateId: z.string().uuid().optional(),
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  notes: z.string().optional(),
});
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export const addExerciseSchema = z.object({
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type AddExerciseInput = z.infer<typeof addExerciseSchema>;

export const addSetSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  weight: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  type: z
    .enum([SetType.WORKING, SetType.WARMUP, SetType.DROPSET, SetType.FAILURE])
    .optional(),
  rpe: z.number().min(1).max(10).optional(),
});
export type AddSetInput = z.infer<typeof addSetSchema>;

export const updateSetSchema = z.object({
  setId: z.string().uuid(),
  weight: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  rpe: z.number().min(1).max(10).optional(),
  type: z
    .enum([SetType.WORKING, SetType.WARMUP, SetType.DROPSET, SetType.FAILURE])
    .optional(),
  completed: z.boolean().optional(),
});
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const deleteSetSchema = z.object({
  setId: z.string().uuid(),
});
export type DeleteSetInput = z.infer<typeof deleteSetSchema>;

export const completeWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  completedAt: z.date().optional(),
});
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;
```

- [ ] **Step 5: Create cardio schemas**

Create `packages/shared/src/schemas/cardio.ts`:

```typescript
import { z } from "zod";
import { CardioType } from "../enums";

const cardioTypeEnum = z.enum([
  CardioType.RUN,
  CardioType.CYCLE,
  CardioType.SWIM,
  CardioType.HIKE,
  CardioType.WALK,
  CardioType.ROW,
  CardioType.ELLIPTICAL,
  CardioType.OTHER,
]);

export const createCardioSchema = z.object({
  type: cardioTypeEnum,
  startedAt: z.date(),
  durationSeconds: z.number().int().positive(),
  distanceMeters: z.number().nonnegative().optional(),
  elevationGainM: z.number().nonnegative().optional(),
  avgHeartRate: z.number().int().positive().optional(),
  maxHeartRate: z.number().int().positive().optional(),
  calories: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type CreateCardioInput = z.infer<typeof createCardioSchema>;

const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
  timestamp: z.date(),
});

export const completeGpsSessionSchema = z.object({
  type: cardioTypeEnum,
  startedAt: z.date(),
  routePoints: z.array(routePointSchema).min(1).max(50000),
});
export type CompleteGpsSessionInput = z.infer<typeof completeGpsSessionSchema>;

export const importGpxSchema = z.object({
  gpxContent: z.string().max(10_000_000),
  type: cardioTypeEnum.optional(),
});
export type ImportGpxInput = z.infer<typeof importGpxSchema>;
```

- [ ] **Step 6: Create body metric schemas**

Create `packages/shared/src/schemas/body-metric.ts`:

```typescript
import { z } from "zod";

export const createBodyMetricSchema = z.object({
  date: z.date(),
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  measurements: z.record(z.number()).optional(),
});
export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;

export const listBodyMetricsSchema = z.object({
  from: z.date(),
  to: z.date(),
});
export type ListBodyMetricsInput = z.infer<typeof listBodyMetricsSchema>;
```

- [ ] **Step 7: Create analytics schemas**

Create `packages/shared/src/schemas/analytics.ts`:

```typescript
import { z } from "zod";

export const weeklyVolumeSchema = z.object({
  weeks: z.number().int().min(1).max(52).default(4),
});
export type WeeklyVolumeInput = z.infer<typeof weeklyVolumeSchema>;

export const personalRecordsSchema = z.object({
  exerciseId: z.string().uuid(),
});
export type PersonalRecordsInput = z.infer<typeof personalRecordsSchema>;

export const bodyWeightTrendSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});
export type BodyWeightTrendInput = z.infer<typeof bodyWeightTrendSchema>;
```

- [ ] **Step 8: Update shared index.ts exports**

Add new exports to `packages/shared/src/index.ts`:

```typescript
export * from "./enums";
export * from "./types";
export * from "./schemas/auth";
export * from "./schemas/user";
export * from "./schemas/pagination";
export * from "./schemas/exercise";
export * from "./schemas/workout";
export * from "./schemas/cardio";
export * from "./schemas/body-metric";
export * from "./schemas/analytics";
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `pnpm --filter @ironpulse/shared lint`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add packages/shared/
git commit -m "add core data layer Zod schemas and GPX CardioSource enum"
```

---

### Task 2: Exercise Seed Data

**Files:**
- Modify: `packages/db/package.json`
- Create: `packages/db/seeds/download-exercises.ts`
- Create: `packages/db/seeds/exercises.json` (generated)
- Create: `packages/db/seeds/seed.ts`

- [ ] **Step 1: Install tsx and add prisma.seed config**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/db add -D tsx
```

Then add the `prisma.seed` config to `packages/db/package.json`:

```json
{
  "prisma": {
    "seed": "tsx seeds/seed.ts"
  }
}
```

- [ ] **Step 2: Create download script**

Create `packages/db/seeds/download-exercises.ts`:

```typescript
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GITHUB_TREE_API =
  "https://api.github.com/repos/wrkout/exercises.json/git/trees/master?recursive=1";
const RAW_BASE =
  "https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises";

interface WrkoutExercise {
  name: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface MappedExercise {
  name: string;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string | null;
  imageUrls: string[];
  videoUrls: string[];
  isCustom: boolean;
  createdById: null;
}

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  kettlebells: "kettlebell",
  machine: "machine",
  cable: "cable",
  "body only": "bodyweight",
  bands: "band",
  "exercise ball": "other",
  "medicine ball": "other",
  "foam roll": "other",
  "e-z curl bar": "barbell",
  other: "other",
};

const MECHANIC_MAP: Record<string, string> = {
  compound: "compound",
  isolation: "isolation",
};

async function download() {
  console.log("Fetching repo tree...");
  const treeRes = await fetch(GITHUB_TREE_API);
  const tree = (await treeRes.json()) as {
    tree: Array<{ path: string; type: string }>;
  };

  // Find all exercise.json paths
  const exercisePaths = tree.tree
    .filter(
      (f) =>
        f.type === "blob" && /^exercises\/[^/]+\/exercise\.json$/.test(f.path)
    )
    .map((f) => f.path);

  console.log(`Found ${exercisePaths.length} exercises`);

  const exercises: MappedExercise[] = [];
  let failed = 0;

  for (const exPath of exercisePaths) {
    const dirName = exPath.split("/")[1]!;
    try {
      const res = await fetch(
        `${RAW_BASE}/${encodeURIComponent(dirName)}/exercise.json`
      );
      if (!res.ok) {
        failed++;
        continue;
      }
      const raw = (await res.json()) as WrkoutExercise;

      const imageUrls = [0, 1].map(
        (i) =>
          `${RAW_BASE}/${encodeURIComponent(dirName)}/images/${i}.jpg`
      );

      exercises.push({
        name: raw.name,
        category: raw.mechanic
          ? MECHANIC_MAP[raw.mechanic] ?? "compound"
          : "compound",
        primaryMuscles: raw.primaryMuscles ?? [],
        secondaryMuscles: raw.secondaryMuscles ?? [],
        equipment: raw.equipment
          ? EQUIPMENT_MAP[raw.equipment.toLowerCase()] ?? null
          : null,
        instructions: raw.instructions?.join("\n") ?? null,
        imageUrls,
        videoUrls: [],
        isCustom: false,
        createdById: null,
      });

      process.stdout.write(".");
    } catch {
      failed++;
    }
  }

  console.log(`\nConverted ${exercises.length} exercises (${failed} failed)`);

  fs.writeFileSync(
    path.join(__dirname, "exercises.json"),
    JSON.stringify(exercises, null, 2)
  );
  console.log("Written to seeds/exercises.json");
}

download();
```

- [ ] **Step 3: Run download script**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse/packages/db
npx tsx seeds/download-exercises.ts
```

Expected: `exercises.json` created with 800+ exercises. Verify with:

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('seeds/exercises.json')).length)"
```

- [ ] **Step 4: Create seed script**

Create `packages/db/seeds/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new PrismaClient();

interface SeedExercise {
  name: string;
  category: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string | null;
  imageUrls: string[];
  videoUrls: string[];
  isCustom: boolean;
  createdById: null;
}

async function seed() {
  const raw = fs.readFileSync(path.join(__dirname, "exercises.json"), "utf-8");
  const exercises: SeedExercise[] = JSON.parse(raw);

  console.log(`Seeding ${exercises.length} exercises...`);

  let created = 0;
  let updated = 0;

  for (const ex of exercises) {
    const existing = await db.exercise.findFirst({
      where: { name: ex.name, isCustom: false },
    });

    if (existing) {
      await db.exercise.update({
        where: { id: existing.id },
        data: {
          category: ex.category,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles,
          equipment: ex.equipment,
          instructions: ex.instructions,
          imageUrls: ex.imageUrls,
          videoUrls: ex.videoUrls,
        },
      });
      updated++;
    } else {
      await db.exercise.create({ data: ex });
      created++;
    }
  }

  console.log(`Seed complete: ${created} created, ${updated} updated`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 5: Run seed**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/db db:seed
```

Expected: `Seed complete: N created, 0 updated`

Re-run to verify idempotency:

```bash
pnpm --filter @ironpulse/db db:seed
```

Expected: `Seed complete: 0 created, N updated`

- [ ] **Step 6: Commit**

```bash
git add packages/db/
git commit -m "add exercise seed data from wrkout/exercises.json"
```

---

### Task 3: Test Infrastructure and Dependencies

**Files:**
- Modify: `packages/api/__tests__/helpers.ts`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Install fast-xml-parser**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm --filter @ironpulse/api add fast-xml-parser
```

- [ ] **Step 2: Add cleanupTestData helper**

Add to `packages/api/__tests__/helpers.ts`:

```typescript
export async function cleanupTestData(db: PrismaClient) {
  // User cascade handles: workouts (→ workout exercises → sets),
  // cardio sessions (→ route points, laps), body metrics, personal records,
  // workout templates (→ template exercises → template sets), accounts
  await db.user.deleteMany();
  // Global exercises (isCustom=false) aren't cascade-deleted
  await db.exercise.deleteMany();
}
```

The `PrismaClient` type is already imported in helpers.ts.

- [ ] **Step 3: Commit**

```bash
git add packages/api/
git commit -m "add fast-xml-parser and test cleanup helper"
```

---

## Chunk 2: Exercise and Workout Routers

### Task 4: Exercise Router and Tests

**Files:**
- Create: `packages/api/__tests__/exercise.test.ts`
- Create: `packages/api/src/routers/exercise.ts`

- [ ] **Step 1: Write exercise tests**

Create `packages/api/__tests__/exercise.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { exerciseRouter } from "../src/routers/exercise";

const db = new PrismaClient();
const createCaller = createCallerFactory(exerciseRouter);

function exerciseCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
});

describe("exercise.list", () => {
  it("returns paginated exercises", async () => {
    // Seed two exercises directly
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ limit: 10 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeNull();
  });

  it("filters by muscle group", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Squat", category: "compound", primaryMuscles: ["quads", "glutes"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ muscleGroup: "chest" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("filters by equipment", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "barbell", isCustom: false },
        { name: "Push Up", category: "compound", primaryMuscles: ["chest"], equipment: "bodyweight", isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ equipment: "barbell" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("filters by category", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ category: "isolation" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bicep Curl");
  });

  it("searches by name (case insensitive)", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ search: "bench" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("combines multiple filters", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Barbell Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "barbell", isCustom: false },
        { name: "Dumbbell Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "dumbbell", isCustom: false },
        { name: "Barbell Curl", category: "isolation", primaryMuscles: ["biceps"], equipment: "barbell", isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ equipment: "barbell", muscleGroup: "chest" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Barbell Bench Press");
  });

  it("paginates with cursor", async () => {
    await db.exercise.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        name: `Exercise ${String(i).padStart(2, "0")}`,
        category: "compound",
        primaryMuscles: ["chest"],
        isCustom: false,
      })),
    });

    const caller = exerciseCaller();
    const page1 = await caller.list({ limit: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await caller.list({ limit: 2, cursor: page1.nextCursor! });
    expect(page2.data.length).toBe(2);
    expect(page2.data[0]!.name).not.toBe(page1.data[0]!.name);
  });
});

describe("exercise.getById", () => {
  it("returns a single exercise", async () => {
    const ex = await db.exercise.create({
      data: { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
    });

    const caller = exerciseCaller();
    const result = await caller.getById({ id: ex.id });

    expect(result.exercise.name).toBe("Bench Press");
    expect(result.exercise.primaryMuscles).toEqual(["chest"]);
  });

  it("throws for non-existent exercise", async () => {
    const caller = exerciseCaller();
    await expect(
      caller.getById({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
  });
});

describe("exercise.create", () => {
  it("creates a custom exercise for authenticated user", async () => {
    const user = createTestUser();
    await db.user.create({ data: { id: user.id, email: user.email, name: user.name } });

    const caller = exerciseCaller({ user });
    const result = await caller.create({
      name: "My Custom Exercise",
      category: "compound",
      primaryMuscles: ["chest"],
    });

    expect(result.exercise.name).toBe("My Custom Exercise");
    expect(result.exercise.isCustom).toBe(true);
    expect(result.exercise.createdById).toBe(user.id);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = exerciseCaller();
    await expect(
      caller.create({
        name: "Nope",
        category: "compound",
        primaryMuscles: ["chest"],
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- __tests__/exercise.test.ts`
Expected: FAIL — module `../src/routers/exercise` not found

- [ ] **Step 3: Implement exercise router**

Create `packages/api/src/routers/exercise.ts`:

```typescript
import { z } from "zod";
import {
  createExerciseSchema,
  listExercisesSchema,
} from "@ironpulse/shared";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";

export const exerciseRouter = createTRPCRouter({
  list: publicProcedure
    .input(listExercisesSchema)
    .query(async ({ ctx, input }) => {
      const exercises = await ctx.db.exercise.findMany({
        where: {
          ...(input.muscleGroup && {
            primaryMuscles: { has: input.muscleGroup },
          }),
          ...(input.equipment && { equipment: input.equipment }),
          ...(input.category && { category: input.category }),
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" as const },
          }),
        },
        orderBy: { name: "asc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          imageUrls: true,
          isCustom: true,
        },
      });

      const hasMore = exercises.length > input.limit;
      const data = hasMore ? exercises.slice(0, -1) : exercises;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const exercise = await ctx.db.exercise.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          instructions: true,
          imageUrls: true,
          videoUrls: true,
          isCustom: true,
          createdById: true,
        },
      });

      return { exercise };
    }),

  create: protectedProcedure
    .input(createExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      const exercise = await ctx.db.exercise.create({
        data: {
          name: input.name,
          category: input.category,
          primaryMuscles: input.primaryMuscles,
          secondaryMuscles: input.secondaryMuscles,
          equipment: input.equipment ?? null,
          instructions: input.instructions ?? null,
          isCustom: true,
          createdById: ctx.user.id,
        },
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          instructions: true,
          isCustom: true,
          createdById: true,
        },
      });

      return { exercise };
    }),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ironpulse/api test -- __tests__/exercise.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/exercise.ts packages/api/__tests__/exercise.test.ts
git commit -m "add exercise router with list, getById, and create"
```

---

### Task 5: Workout Router and Tests

**Files:**
- Create: `packages/api/src/lib/pr-detection.ts`
- Create: `packages/api/src/routers/workout.ts`
- Create: `packages/api/__tests__/workout.test.ts`

- [ ] **Step 1: Create PR detection utility**

Create `packages/api/src/lib/pr-detection.ts`:

```typescript
import type { PrismaClient, Prisma } from "@ironpulse/db";

interface CompletedSet {
  id: string;
  weightKg: Prisma.Decimal | null;
  reps: number | null;
  workoutExercise: {
    exerciseId: string;
  };
}

interface NewPR {
  exerciseId: string;
  type: "1rm" | "volume";
  value: number;
  setId: string;
}

function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export async function detectPRs(
  db: PrismaClient,
  userId: string,
  workoutId: string,
  achievedAt: Date
): Promise<NewPR[]> {
  // Fetch completed sets with weight > 0
  const sets = await db.exerciseSet.findMany({
    where: {
      workoutExercise: { workoutId },
      completed: true,
      reps: { gt: 0 },
      weightKg: { gt: 0 },
    },
    select: {
      id: true,
      weightKg: true,
      reps: true,
      workoutExercise: { select: { exerciseId: true } },
    },
  });

  // Group by exerciseId
  const byExercise = new Map<string, typeof sets>();
  for (const set of sets) {
    const exId = set.workoutExercise.exerciseId;
    if (!byExercise.has(exId)) byExercise.set(exId, []);
    byExercise.get(exId)!.push(set);
  }

  const newPRs: NewPR[] = [];

  for (const [exerciseId, exerciseSets] of byExercise) {
    // Calculate best 1RM (only sets with reps <= 10)
    let best1RM = { value: 0, setId: "" };
    let bestVolume = { value: 0, setId: "" };

    for (const set of exerciseSets) {
      const weight = Number(set.weightKg);
      const reps = set.reps!;

      // 1RM: only for reps <= 10
      if (reps <= 10) {
        const estimated = epley1RM(weight, reps);
        if (estimated > best1RM.value) {
          best1RM = { value: estimated, setId: set.id };
        }
      }

      // Volume: weight × reps
      const volume = weight * reps;
      if (volume > bestVolume.value) {
        bestVolume = { value: volume, setId: set.id };
      }
    }

    // Compare against existing best for 1RM
    if (best1RM.value > 0) {
      const existing1RM = await db.personalRecord.findFirst({
        where: { userId, exerciseId, type: "1rm" },
        orderBy: { value: "desc" },
      });

      if (!existing1RM || best1RM.value > Number(existing1RM.value)) {
        await db.personalRecord.create({
          data: {
            userId,
            exerciseId,
            type: "1rm",
            value: best1RM.value,
            achievedAt,
            setId: best1RM.setId,
          },
        });
        newPRs.push({
          exerciseId,
          type: "1rm",
          value: best1RM.value,
          setId: best1RM.setId,
        });
      }
    }

    // Compare against existing best for volume
    if (bestVolume.value > 0) {
      const existingVolume = await db.personalRecord.findFirst({
        where: { userId, exerciseId, type: "volume" },
        orderBy: { value: "desc" },
      });

      if (!existingVolume || bestVolume.value > Number(existingVolume.value)) {
        await db.personalRecord.create({
          data: {
            userId,
            exerciseId,
            type: "volume",
            value: bestVolume.value,
            achievedAt,
            setId: bestVolume.setId,
          },
        });
        newPRs.push({
          exerciseId,
          type: "volume",
          value: bestVolume.value,
          setId: bestVolume.setId,
        });
      }
    }
  }

  return newPRs;
}
```

- [ ] **Step 2: Write workout tests**

Create `packages/api/__tests__/workout.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { workoutRouter } from "../src/routers/workout";

const db = new PrismaClient();
const createCaller = createCallerFactory(workoutRouter);

function workoutCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let testExerciseId: string;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  // Create a test user and exercise for all tests
  testUser = createTestUser({ email: "workout@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
  const ex = await db.exercise.create({
    data: {
      name: "Test Bench Press",
      category: "compound",
      primaryMuscles: ["chest"],
      isCustom: false,
    },
  });
  testExerciseId = ex.id;
});

describe("workout.create", () => {
  it("creates a new workout", async () => {
    const caller = workoutCaller({ user: testUser });
    const result = await caller.create({ name: "Push Day" });

    expect(result.workout.name).toBe("Push Day");
    expect(result.workout.userId).toBe(testUser.id);
    expect(result.workout.completedAt).toBeNull();
  });

  it("creates workout from template", async () => {
    // Create a template with exercises
    const template = await db.workoutTemplate.create({
      data: {
        userId: testUser.id,
        name: "Push Template",
        templateExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            templateSets: {
              create: [
                { setNumber: 1, targetReps: 10, targetWeightKg: 60, type: "working" },
                { setNumber: 2, targetReps: 8, targetWeightKg: 65, type: "working" },
              ],
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.create({ templateId: template.id });

    // Verify workout has copied exercises and sets
    const workout = await db.workout.findUnique({
      where: { id: result.workout.id },
      include: { workoutExercises: { include: { sets: true } } },
    });

    expect(workout!.workoutExercises.length).toBe(1);
    expect(workout!.workoutExercises[0]!.sets.length).toBe(2);
    expect(Number(workout!.workoutExercises[0]!.sets[0]!.weightKg)).toBe(60);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = workoutCaller();
    await expect(caller.create({})).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("workout.getById", () => {
  it("returns workout with exercises and sets", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        name: "Test Workout",
        startedAt: new Date(),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 60, reps: 10, type: "working" },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.getById({ workoutId: workout.id });

    expect(result.workout.name).toBe("Test Workout");
    expect(result.workout.workoutExercises.length).toBe(1);
    expect(result.workout.workoutExercises[0]!.sets.length).toBe(1);
  });

  it("rejects access to another user's workout", async () => {
    const otherUser = createTestUser({ email: "other@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    const workout = await db.workout.create({
      data: { userId: otherUser.id, name: "Other's Workout", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    await expect(caller.getById({ workoutId: workout.id })).rejects.toThrow();
  });
});

describe("workout.list", () => {
  it("returns paginated workout history", async () => {
    for (let i = 0; i < 3; i++) {
      await db.workout.create({
        data: {
          userId: testUser.id,
          name: `Workout ${i}`,
          startedAt: new Date(2026, 0, i + 1),
          completedAt: new Date(2026, 0, i + 1),
          durationSeconds: 3600,
          workoutExercises: {
            create: {
              exerciseId: testExerciseId,
              order: 0,
              sets: {
                create: { setNumber: 1, weightKg: 60, reps: 10, type: "working", completed: true },
              },
            },
          },
        },
      });
    }

    const caller = workoutCaller({ user: testUser });
    const result = await caller.list({ limit: 2 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeTruthy();
  });

  it("only returns current user's workouts", async () => {
    const otherUser = createTestUser({ email: "other2@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    await db.workout.create({
      data: { userId: otherUser.id, name: "Other's", startedAt: new Date() },
    });
    await db.workout.create({
      data: { userId: testUser.id, name: "Mine", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.list({});

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Mine");
  });
});

describe("workout.update", () => {
  it("updates workout metadata", async () => {
    const workout = await db.workout.create({
      data: { userId: testUser.id, name: "Old Name", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.update({
      workoutId: workout.id,
      name: "New Name",
      notes: "Great workout",
    });

    expect(result.workout.name).toBe("New Name");
    expect(result.workout.notes).toBe("Great workout");
  });
});

describe("workout.addExercise", () => {
  it("appends an exercise to the workout", async () => {
    const workout = await db.workout.create({
      data: { userId: testUser.id, startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.addExercise({
      workoutId: workout.id,
      exerciseId: testExerciseId,
    });

    expect(result.workoutExercise.exerciseId).toBe(testExerciseId);
    expect(result.workoutExercise.order).toBe(0);
  });
});

describe("workout.addSet / updateSet / deleteSet", () => {
  it("adds, updates, and deletes a set", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(),
        workoutExercises: {
          create: { exerciseId: testExerciseId, order: 0 },
        },
      },
      include: { workoutExercises: true },
    });
    const weId = workout.workoutExercises[0]!.id;

    const caller = workoutCaller({ user: testUser });

    // Add set
    const addResult = await caller.addSet({
      workoutExerciseId: weId,
      weight: 60,
      reps: 10,
    });
    expect(addResult.set.weightKg).toBeDefined();
    expect(addResult.set.reps).toBe(10);

    // Update set
    const updateResult = await caller.updateSet({
      setId: addResult.set.id,
      weight: 65,
      completed: true,
    });
    expect(Number(updateResult.set.weightKg)).toBe(65);
    expect(updateResult.set.completed).toBe(true);

    // Delete set
    await caller.deleteSet({ setId: addResult.set.id });
    const deleted = await db.exerciseSet.findUnique({
      where: { id: addResult.set.id },
    });
    expect(deleted).toBeNull();
  });
});

describe("workout.complete", () => {
  it("marks workout complete and detects PRs", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 100, reps: 5, type: "working", completed: true },
                { setNumber: 2, weightKg: 80, reps: 10, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.complete({ workoutId: workout.id });

    expect(result.workout.completedAt).toBeDefined();
    expect(result.workout.durationSeconds).toBeGreaterThan(0);
    expect(result.newPRs.length).toBeGreaterThan(0);

    // Verify PRs in database
    const prs = await db.personalRecord.findMany({
      where: { userId: testUser.id, exerciseId: testExerciseId },
    });
    expect(prs.length).toBeGreaterThan(0);
  });

  it("does not create duplicate PRs on second completion", async () => {
    // First workout with PRs
    const w1 = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 7200_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 100, reps: 5, type: "working", completed: true },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    await caller.complete({ workoutId: w1.id });

    // Second workout with lower weight — should not create new PRs
    const w2 = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 80, reps: 5, type: "working", completed: true },
            },
          },
        },
      },
    });

    const result2 = await caller.complete({ workoutId: w2.id });
    expect(result2.newPRs.length).toBe(0);
  });

  it("skips bodyweight-only sets for PR detection", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 0, reps: 20, type: "working", completed: true },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.complete({ workoutId: workout.id });
    expect(result.newPRs.length).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- __tests__/workout.test.ts`
Expected: FAIL — module `../src/routers/workout` not found

- [ ] **Step 4: Implement workout router**

Create `packages/api/src/routers/workout.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  addExerciseSchema,
  addSetSchema,
  updateSetSchema,
  deleteSetSchema,
  completeWorkoutSchema,
  cursorPaginationSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { detectPRs } from "../lib/pr-detection";

export const workoutRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      // If templateId provided, copy template exercises and sets
      if (input.templateId) {
        const template = await ctx.db.workoutTemplate.findUnique({
          where: { id: input.templateId, userId: ctx.user.id },
          include: {
            templateExercises: {
              orderBy: { order: "asc" },
              include: { templateSets: { orderBy: { setNumber: "asc" } } },
            },
          },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        const workout = await ctx.db.workout.create({
          data: {
            userId: ctx.user.id,
            name: input.name ?? template.name,
            startedAt: now,
            templateId: template.id,
            workoutExercises: {
              create: template.templateExercises.map((te) => ({
                exerciseId: te.exerciseId,
                order: te.order,
                notes: te.notes,
                sets: {
                  create: te.templateSets.map((ts) => ({
                    setNumber: ts.setNumber,
                    type: ts.type,
                    weightKg: ts.targetWeightKg,
                    reps: ts.targetReps,
                  })),
                },
              })),
            },
          },
          select: { id: true, name: true, userId: true, startedAt: true, completedAt: true, templateId: true },
        });

        return { workout };
      }

      const workout = await ctx.db.workout.create({
        data: {
          userId: ctx.user.id,
          name: input.name ?? null,
          startedAt: now,
        },
        select: { id: true, name: true, userId: true, startedAt: true, completedAt: true },
      });

      return { workout };
    }),

  getById: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        include: {
          workoutExercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: { select: { id: true, name: true, category: true, equipment: true } },
              sets: { orderBy: { setNumber: "asc" } },
            },
          },
        },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      return { workout };
    }),

  list: protectedProcedure
    .input(cursorPaginationSchema)
    .query(async ({ ctx, input }) => {
      const workouts = await ctx.db.workout.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          name: true,
          startedAt: true,
          completedAt: true,
          durationSeconds: true,
          _count: { select: { workoutExercises: true } },
        },
      });

      const hasMore = workouts.length > input.limit;
      const data = hasMore ? workouts.slice(0, -1) : workouts;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  update: protectedProcedure
    .input(updateWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.updateMany({
        where: { id: input.workoutId, userId: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });

      if (workout.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const updated = await ctx.db.workout.findUniqueOrThrow({
        where: { id: input.workoutId },
        select: { id: true, name: true, notes: true, startedAt: true, completedAt: true },
      });

      return { workout: updated };
    }),

  addExercise: protectedProcedure
    .input(addExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify workout belongs to user
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      // Get next order
      const lastExercise = await ctx.db.workoutExercise.findFirst({
        where: { workoutId: input.workoutId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const workoutExercise = await ctx.db.workoutExercise.create({
        data: {
          workoutId: input.workoutId,
          exerciseId: input.exerciseId,
          order: (lastExercise?.order ?? -1) + 1,
        },
        select: { id: true, exerciseId: true, order: true },
      });

      return { workoutExercise };
    }),

  addSet: protectedProcedure
    .input(addSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through workout exercise → workout → user
      const we = await ctx.db.workoutExercise.findFirst({
        where: {
          id: input.workoutExerciseId,
          workout: { userId: ctx.user.id },
        },
        select: { id: true },
      });
      if (!we) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout exercise not found" });
      }

      // Get next set number
      const lastSet = await ctx.db.exerciseSet.findFirst({
        where: { workoutExerciseId: input.workoutExerciseId },
        orderBy: { setNumber: "desc" },
        select: { setNumber: true },
      });

      const set = await ctx.db.exerciseSet.create({
        data: {
          workoutExerciseId: input.workoutExerciseId,
          setNumber: (lastSet?.setNumber ?? 0) + 1,
          ...(input.weight !== undefined && { weightKg: input.weight }),
          ...(input.reps !== undefined && { reps: input.reps }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.rpe !== undefined && { rpe: input.rpe }),
        },
        select: { id: true, setNumber: true, weightKg: true, reps: true, type: true, rpe: true, completed: true },
      });

      return { set };
    }),

  updateSet: protectedProcedure
    .input(updateSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.exerciseSet.findFirst({
        where: {
          id: input.setId,
          workoutExercise: { workout: { userId: ctx.user.id } },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });
      }

      const set = await ctx.db.exerciseSet.update({
        where: { id: input.setId },
        data: {
          ...(input.weight !== undefined && { weightKg: input.weight }),
          ...(input.reps !== undefined && { reps: input.reps }),
          ...(input.rpe !== undefined && { rpe: input.rpe }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.completed !== undefined && { completed: input.completed }),
        },
        select: { id: true, setNumber: true, weightKg: true, reps: true, type: true, rpe: true, completed: true },
      });

      return { set };
    }),

  deleteSet: protectedProcedure
    .input(deleteSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.exerciseSet.findFirst({
        where: {
          id: input.setId,
          workoutExercise: { workout: { userId: ctx.user.id } },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });
      }

      await ctx.db.exerciseSet.delete({ where: { id: input.setId } });
      return { success: true };
    }),

  complete: protectedProcedure
    .input(completeWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true, startedAt: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const completedAt = input.completedAt ?? new Date();
      const durationSeconds = Math.round(
        (completedAt.getTime() - existing.startedAt.getTime()) / 1000
      );

      const workout = await ctx.db.workout.update({
        where: { id: input.workoutId },
        data: { completedAt, durationSeconds },
        select: { id: true, name: true, startedAt: true, completedAt: true, durationSeconds: true },
      });

      // PR detection
      const newPRs = await detectPRs(
        ctx.db,
        ctx.user.id,
        input.workoutId,
        completedAt
      );

      return { workout, newPRs };
    }),
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @ironpulse/api test -- __tests__/workout.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/workout.ts packages/api/src/lib/pr-detection.ts packages/api/__tests__/workout.test.ts
git commit -m "add workout router with CRUD, PR detection, and template support"
```

---

## Chunk 3: Cardio and Body Metric Routers

### Task 6: Cardio Router, GPX Utilities, and Tests

**Files:**
- Create: `packages/api/src/lib/gpx.ts`
- Create: `packages/api/src/routers/cardio.ts`
- Create: `packages/api/__tests__/cardio.test.ts`

- [ ] **Step 1: Create GPX parsing and Haversine utilities**

Create `packages/api/src/lib/gpx.ts`:

```typescript
import { XMLParser } from "fast-xml-parser";

interface ParsedPoint {
  lat: number;
  lng: number;
  elevation: number | null;
  timestamp: Date;
}

interface GpxStats {
  points: ParsedPoint[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseGpx(gpxContent: string): GpxStats {
  const parser = new XMLParser({
    processEntities: false,
    allowBooleanAttributes: false,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(gpxContent);

  // Navigate to track points — GPX can have nested structure
  const gpx = parsed.gpx;
  if (!gpx) throw new Error("Invalid GPX: missing <gpx> root element");

  const trk = gpx.trk;
  if (!trk) throw new Error("Invalid GPX: missing <trk> element");

  // trk can be an array or single object
  const tracks = Array.isArray(trk) ? trk : [trk];

  const allPoints: ParsedPoint[] = [];

  for (const track of tracks) {
    const trkseg = track.trkseg;
    if (!trkseg) continue;
    const segments = Array.isArray(trkseg) ? trkseg : [trkseg];

    for (const seg of segments) {
      const trkpts = seg.trkpt;
      if (!trkpts) continue;
      const points = Array.isArray(trkpts) ? trkpts : [trkpts];

      for (const pt of points) {
        const lat = parseFloat(pt["@_lat"]);
        const lng = parseFloat(pt["@_lon"]);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          continue; // Silently drop invalid points
        }

        const rawEle = pt.ele != null ? parseFloat(pt.ele) : null;
        const elevation = rawEle !== null && !isNaN(rawEle) ? rawEle : null;
        const timestamp = pt.time ? new Date(pt.time) : null;

        if (!timestamp || isNaN(timestamp.getTime())) continue;

        allPoints.push({ lat, lng, elevation, timestamp });
      }
    }
  }

  if (allPoints.length === 0) {
    throw new Error("GPX file contains no valid track points");
  }

  // Cap at 50,000 points
  const points = allPoints.slice(0, 50_000);

  // Calculate stats
  let distanceMeters = 0;
  let elevationGainM = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;

    distanceMeters += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);

    if (prev.elevation != null && curr.elevation != null) {
      const delta = curr.elevation - prev.elevation;
      if (delta > 0) elevationGainM += delta;
    }
  }

  const startedAt = points[0]!.timestamp;
  const endedAt = points[points.length - 1]!.timestamp;
  const durationSeconds = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 1000
  );

  return {
    points,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
    elevationGainM: Math.round(elevationGainM * 100) / 100,
    durationSeconds,
    startedAt,
  };
}
```

- [ ] **Step 2: Write cardio tests**

Create `packages/api/__tests__/cardio.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { cardioRouter } from "../src/routers/cardio";
import { haversineDistance } from "../src/lib/gpx";

const db = new PrismaClient();
const createCaller = createCallerFactory(cardioRouter);

function cardioCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "cardio@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("haversineDistance", () => {
  it("calculates distance between two known points", () => {
    // London to Paris ≈ 343.5 km
    const d = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(340_000);
    expect(d).toBeLessThan(350_000);
  });

  it("returns 0 for same point", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });
});

describe("cardio.create", () => {
  it("creates a manual cardio session", async () => {
    const caller = cardioCaller({ user: testUser });
    const result = await caller.create({
      type: "run",
      startedAt: new Date("2026-03-01T08:00:00Z"),
      durationSeconds: 1800,
      distanceMeters: 5000,
    });

    expect(result.session.type).toBe("run");
    expect(result.session.source).toBe("manual");
    expect(result.session.durationSeconds).toBe(1800);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = cardioCaller();
    await expect(
      caller.create({
        type: "run",
        startedAt: new Date(),
        durationSeconds: 1800,
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("cardio.list", () => {
  it("returns paginated cardio history", async () => {
    for (let i = 0; i < 3; i++) {
      await db.cardioSession.create({
        data: {
          userId: testUser.id,
          type: "run",
          source: "manual",
          startedAt: new Date(2026, 0, i + 1),
          durationSeconds: 1800,
        },
      });
    }

    const caller = cardioCaller({ user: testUser });
    const result = await caller.list({ limit: 2 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeTruthy();
  });
});

describe("cardio.getById", () => {
  it("returns session details without route points", async () => {
    const session = await db.cardioSession.create({
      data: {
        userId: testUser.id,
        type: "hike",
        source: "manual",
        startedAt: new Date(),
        durationSeconds: 7200,
        distanceMeters: 10000,
      },
    });

    const caller = cardioCaller({ user: testUser });
    const result = await caller.getById({ sessionId: session.id });

    expect(result.session.type).toBe("hike");
    expect(result.session.distanceMeters).toBeDefined();
  });
});

describe("cardio.getRoutePoints", () => {
  it("returns route points for a session", async () => {
    const session = await db.cardioSession.create({
      data: {
        userId: testUser.id,
        type: "run",
        source: "gps",
        startedAt: new Date(),
        durationSeconds: 1800,
        routePoints: {
          create: [
            { latitude: 40.7128, longitude: -74.006, timestamp: new Date() },
            { latitude: 40.7138, longitude: -74.005, timestamp: new Date() },
          ],
        },
      },
    });

    const caller = cardioCaller({ user: testUser });
    const result = await caller.getRoutePoints({ sessionId: session.id });

    expect(result.points.length).toBe(2);
  });
});

describe("cardio ownership scoping", () => {
  it("rejects access to another user's session", async () => {
    const otherUser = createTestUser({ email: "other-cardio@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    const session = await db.cardioSession.create({
      data: { userId: otherUser.id, type: "run", source: "manual", startedAt: new Date(), durationSeconds: 1800 },
    });

    const caller = cardioCaller({ user: testUser });
    await expect(caller.getById({ sessionId: session.id })).rejects.toThrow();
    await expect(caller.getRoutePoints({ sessionId: session.id })).rejects.toThrow();
  });
});

describe("cardio.completeGpsSession", () => {
  it("creates session from buffered GPS points", async () => {
    const now = new Date();
    const caller = cardioCaller({ user: testUser });
    const result = await caller.completeGpsSession({
      type: "run",
      startedAt: now,
      routePoints: [
        { lat: 40.7128, lng: -74.006, elevation: 10, timestamp: now },
        { lat: 40.7138, lng: -74.005, elevation: 12, timestamp: new Date(now.getTime() + 60_000) },
        { lat: 40.7148, lng: -74.004, elevation: 11, timestamp: new Date(now.getTime() + 120_000) },
      ],
    });

    expect(result.session.source).toBe("gps");
    expect(result.session.durationSeconds).toBe(120);
    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);

    // Verify route points stored
    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(3);
  });
});

describe("cardio.importGpx", () => {
  it("parses GPX and creates session with route points", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <ele>10</ele>
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <ele>15</ele>
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
      <trkpt lat="40.7148" lon="-74.0040">
        <ele>12</ele>
        <time>2026-03-01T08:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent, type: "hike" });

    expect(result.session.type).toBe("hike");
    expect(result.session.source).toBe("gpx");
    expect(result.session.durationSeconds).toBe(120);
    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);
    expect(Number(result.session.elevationGainM)).toBe(5); // 10→15 = +5, 15→12 = -3

    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(3);
  });

  it("handles missing elevation gracefully", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent });

    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);
    expect(Number(result.session.elevationGainM)).toBe(0); // No elevation data = 0 gain
  });

  it("silently drops invalid coordinates", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="999" lon="-74.0050">
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
      <trkpt lat="40.7148" lon="-74.0040">
        <time>2026-03-01T08:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent });

    // Only 2 valid points should be stored (the invalid lat=999 one is dropped)
    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(2);
  });

  it("rejects empty GPX", async () => {
    const caller = cardioCaller({ user: testUser });
    await expect(
      caller.importGpx({ gpxContent: "<gpx><trk><trkseg></trkseg></trk></gpx>" })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- __tests__/cardio.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement cardio router**

Create `packages/api/src/routers/cardio.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createCardioSchema,
  completeGpsSessionSchema,
  importGpxSchema,
  cursorPaginationSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { parseGpx, haversineDistance } from "../lib/gpx";

export const cardioRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createCardioSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          source: "manual",
          startedAt: input.startedAt,
          durationSeconds: input.durationSeconds,
          ...(input.distanceMeters !== undefined && { distanceMeters: input.distanceMeters }),
          ...(input.elevationGainM !== undefined && { elevationGainM: input.elevationGainM }),
          ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
          ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
          ...(input.calories !== undefined && { calories: input.calories }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
          avgHeartRate: true, maxHeartRate: true, calories: true, notes: true,
        },
      });

      return { session };
    }),

  list: protectedProcedure
    .input(cursorPaginationSchema)
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.cardioSession.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          type: true,
          source: true,
          startedAt: true,
          durationSeconds: true,
          distanceMeters: true,
          calories: true,
        },
      });

      const hasMore = sessions.length > input.limit;
      const data = hasMore ? sessions.slice(0, -1) : sessions;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  getById: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.cardioSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
          avgHeartRate: true, maxHeartRate: true, calories: true, notes: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return { session };
    }),

  getRoutePoints: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const session = await ctx.db.cardioSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const points = await ctx.db.routePoint.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { timestamp: "asc" },
        select: {
          latitude: true,
          longitude: true,
          elevationM: true,
          heartRate: true,
          timestamp: true,
        },
      });

      return { points };
    }),

  completeGpsSession: protectedProcedure
    .input(completeGpsSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const points = input.routePoints;

      // Calculate stats
      let distanceMeters = 0;
      let elevationGainM = 0;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!;
        const curr = points[i]!;
        distanceMeters += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);

        if (prev.elevation != null && curr.elevation != null) {
          const delta = curr.elevation - prev.elevation;
          if (delta > 0) elevationGainM += delta;
        }
      }

      const lastPoint = points[points.length - 1]!;
      const durationSeconds = Math.round(
        (lastPoint.timestamp.getTime() - input.startedAt.getTime()) / 1000
      );

      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          source: "gps",
          startedAt: input.startedAt,
          durationSeconds,
          distanceMeters: Math.round(distanceMeters * 100) / 100,
          elevationGainM: Math.round(elevationGainM * 100) / 100,
          routePoints: {
            createMany: {
              data: points.map((p) => ({
                latitude: p.lat,
                longitude: p.lng,
                elevationM: p.elevation ?? null,
                timestamp: p.timestamp,
              })),
            },
          },
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
        },
      });

      return { session };
    }),

  importGpx: protectedProcedure
    .input(importGpxSchema)
    .mutation(async ({ ctx, input }) => {
      const gpxData = parseGpx(input.gpxContent);

      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type ?? "hike",
          source: "gpx",
          startedAt: gpxData.startedAt,
          durationSeconds: gpxData.durationSeconds,
          distanceMeters: gpxData.distanceMeters,
          elevationGainM: gpxData.elevationGainM,
          routePoints: {
            createMany: {
              data: gpxData.points.map((p) => ({
                latitude: p.lat,
                longitude: p.lng,
                elevationM: p.elevation,
                timestamp: p.timestamp,
              })),
            },
          },
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
        },
      });

      return { session };
    }),
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @ironpulse/api test -- __tests__/cardio.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/cardio.ts packages/api/src/lib/gpx.ts packages/api/__tests__/cardio.test.ts
git commit -m "add cardio router with manual, GPS, and GPX import support"
```

---

### Task 7: Body Metric Router and Tests

**Files:**
- Create: `packages/api/src/routers/body-metric.ts`
- Create: `packages/api/__tests__/body-metric.test.ts`

- [ ] **Step 1: Write body metric tests**

Create `packages/api/__tests__/body-metric.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { bodyMetricRouter } from "../src/routers/body-metric";

const db = new PrismaClient();
const createCaller = createCallerFactory(bodyMetricRouter);

function bodyMetricCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "metric@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("bodyMetric.create", () => {
  it("creates a body metric entry", async () => {
    const caller = bodyMetricCaller({ user: testUser });
    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
      bodyFatPct: 15.2,
    });

    expect(Number(result.metric.weightKg)).toBeCloseTo(80.5);
    expect(Number(result.metric.bodyFatPct)).toBeCloseTo(15.2);
  });

  it("upserts on same userId + date", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
    });

    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.0,
    });

    expect(Number(result.metric.weightKg)).toBeCloseTo(80.0);

    // Should still be only one record
    const count = await db.bodyMetric.count({
      where: { userId: testUser.id },
    });
    expect(count).toBe(1);
  });

  it("preserves untouched fields on upsert", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    // Create with both fields
    await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 80.5,
      bodyFatPct: 15.2,
    });

    // Upsert with only weightKg
    const result = await caller.create({
      date: new Date("2026-03-01"),
      weightKg: 79.0,
    });

    // bodyFatPct should still be intact
    const metric = await db.bodyMetric.findFirst({
      where: { userId: testUser.id },
    });
    expect(Number(metric!.weightKg)).toBeCloseTo(79.0);
    expect(Number(metric!.bodyFatPct)).toBeCloseTo(15.2);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = bodyMetricCaller();
    await expect(
      caller.create({ date: new Date(), weightKg: 80 })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("bodyMetric.list", () => {
  it("returns metrics in date range", async () => {
    const caller = bodyMetricCaller({ user: testUser });

    await caller.create({ date: new Date("2026-01-15"), weightKg: 81 });
    await caller.create({ date: new Date("2026-02-15"), weightKg: 80 });
    await caller.create({ date: new Date("2026-03-15"), weightKg: 79 });

    const result = await caller.list({
      from: new Date("2026-02-01"),
      to: new Date("2026-03-31"),
    });

    expect(result.data.length).toBe(2);
  });

  it("returns empty array for no data in range", async () => {
    const caller = bodyMetricCaller({ user: testUser });
    const result = await caller.list({
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });

    expect(result.data.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- __tests__/body-metric.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement body metric router**

Create `packages/api/src/routers/body-metric.ts`:

```typescript
import {
  createBodyMetricSchema,
  listBodyMetricsSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const bodyMetricRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createBodyMetricSchema)
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.bodyMetric.upsert({
        where: {
          userId_date: {
            userId: ctx.user.id,
            date: input.date,
          },
        },
        create: {
          userId: ctx.user.id,
          date: input.date,
          ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
          ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
          ...(input.measurements !== undefined && { measurements: input.measurements }),
        },
        update: {
          ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
          ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
          ...(input.measurements !== undefined && { measurements: input.measurements }),
        },
      });

      return { metric };
    }),

  list: protectedProcedure
    .input(listBodyMetricsSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.bodyMetric.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: input.from, lte: input.to },
        },
        orderBy: { date: "asc" },
      });

      return { data };
    }),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ironpulse/api test -- __tests__/body-metric.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/body-metric.ts packages/api/__tests__/body-metric.test.ts
git commit -m "add body metric router with upsert and date-range queries"
```

---

## Chunk 4: Analytics Router and Final Wiring

### Task 8: Analytics Router and Tests

**Files:**
- Create: `packages/api/src/routers/analytics.ts`
- Create: `packages/api/__tests__/analytics.test.ts`

- [ ] **Step 1: Write analytics tests**

Create `packages/api/__tests__/analytics.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { analyticsRouter } from "../src/routers/analytics";

const db = new PrismaClient();
const createCaller = createCallerFactory(analyticsRouter);

function analyticsCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let testExerciseId: string;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "analytics@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
  const ex = await db.exercise.create({
    data: {
      name: "Analytics Bench Press",
      category: "compound",
      primaryMuscles: ["chest"],
      isCustom: false,
    },
  });
  testExerciseId = ex.id;
});

describe("analytics.weeklyVolume", () => {
  it("returns volume grouped by week and muscle group", async () => {
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    // Workout this week
    await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: thisWeek,
        completedAt: thisWeek,
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 60, reps: 10, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    // Workout last week
    await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: lastWeek,
        completedAt: lastWeek,
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 60, reps: 8, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.weeklyVolume({ weeks: 4 });

    // Should have entries for two different weeks
    const chestEntries = result.data.filter((d: any) => d.muscleGroup === "chest");
    expect(chestEntries.length).toBe(2);

    // Each entry should have a week and correct volume
    const volumes = chestEntries.map((e: any) => e.totalVolume).sort();
    expect(volumes).toEqual([480, 600]); // 60*8=480, 60*10=600
  });

  it("rejects unauthenticated calls", async () => {
    const caller = analyticsCaller();
    await expect(caller.weeklyVolume({})).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("analytics.personalRecords", () => {
  it("returns PR history for an exercise", async () => {
    // Create PR records directly
    await db.personalRecord.createMany({
      data: [
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "1rm",
          value: 100,
          achievedAt: new Date("2026-01-15"),
        },
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "1rm",
          value: 105,
          achievedAt: new Date("2026-02-15"),
        },
        {
          userId: testUser.id,
          exerciseId: testExerciseId,
          type: "volume",
          value: 600,
          achievedAt: new Date("2026-01-15"),
        },
      ],
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.personalRecords({ exerciseId: testExerciseId });

    expect(result.data.length).toBe(3);
    // Should be ordered by achievedAt
    expect(new Date(result.data[0]!.achievedAt).getTime())
      .toBeLessThanOrEqual(new Date(result.data[1]!.achievedAt).getTime());
  });
});

describe("analytics.bodyWeightTrend", () => {
  it("returns body weight data points over time", async () => {
    const now = new Date();
    await db.bodyMetric.createMany({
      data: [
        {
          userId: testUser.id,
          date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          weightKg: 81,
        },
        {
          userId: testUser.id,
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          weightKg: 80,
        },
      ],
    });

    const caller = analyticsCaller({ user: testUser });
    const result = await caller.bodyWeightTrend({ days: 30 });

    expect(result.data.length).toBe(2);
    expect(Number(result.data[0]!.weightKg)).toBe(81);
  });

  it("returns empty for no data", async () => {
    const caller = analyticsCaller({ user: testUser });
    const result = await caller.bodyWeightTrend({ days: 30 });
    expect(result.data.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- __tests__/analytics.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement analytics router**

Create `packages/api/src/routers/analytics.ts`:

```typescript
import {
  weeklyVolumeSchema,
  personalRecordsSchema,
  bodyWeightTrendSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  weeklyVolume: protectedProcedure
    .input(weeklyVolumeSchema)
    .query(async ({ ctx, input }) => {
      const weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - input.weeks * 7);

      // Get completed sets from completed workouts in the time range
      const sets = await ctx.db.exerciseSet.findMany({
        where: {
          completed: true,
          weightKg: { gt: 0 },
          reps: { gt: 0 },
          workoutExercise: {
            workout: {
              userId: ctx.user.id,
              completedAt: { gte: weeksAgo },
            },
          },
        },
        select: {
          weightKg: true,
          reps: true,
          workoutExercise: {
            select: {
              exercise: {
                select: { primaryMuscles: true },
              },
              workout: {
                select: { completedAt: true },
              },
            },
          },
        },
      });

      // Get the Monday (ISO week start) for a date
      function getWeekStart(date: Date): string {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        return d.toISOString().split("T")[0]!;
      }

      // Aggregate volume by week + muscle group
      const volumeMap = new Map<string, number>();

      for (const set of sets) {
        const volume = Number(set.weightKg) * (set.reps ?? 0);
        const week = getWeekStart(set.workoutExercise.workout.completedAt!);
        for (const muscle of set.workoutExercise.exercise.primaryMuscles) {
          const key = `${week}_${muscle}`;
          volumeMap.set(key, (volumeMap.get(key) ?? 0) + volume);
        }
      }

      const data = Array.from(volumeMap.entries()).map(([key, totalVolume]) => {
        const [week, muscleGroup] = key.split("_");
        return { week: week!, muscleGroup: muscleGroup!, totalVolume };
      });

      // Sort by week descending, then muscle group
      data.sort((a, b) => b.week.localeCompare(a.week) || a.muscleGroup.localeCompare(b.muscleGroup));

      return { data };
    }),

  personalRecords: protectedProcedure
    .input(personalRecordsSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.personalRecord.findMany({
        where: {
          userId: ctx.user.id,
          exerciseId: input.exerciseId,
        },
        orderBy: { achievedAt: "asc" },
        select: {
          id: true,
          type: true,
          value: true,
          achievedAt: true,
          setId: true,
        },
      });

      return { data };
    }),

  bodyWeightTrend: protectedProcedure
    .input(bodyWeightTrendSchema)
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const data = await ctx.db.bodyMetric.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: since },
          weightKg: { not: null },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          weightKg: true,
        },
      });

      return { data };
    }),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ironpulse/api test -- __tests__/analytics.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/analytics.ts packages/api/__tests__/analytics.test.ts
git commit -m "add analytics router with weekly volume, PR history, and weight trend"
```

---

### Task 9: Wire All Routers and Final Verification

**Files:**
- Modify: `packages/api/src/root.ts`

- [ ] **Step 1: Update root router**

Update `packages/api/src/root.ts`:

```typescript
import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { exerciseRouter } from "./routers/exercise";
import { workoutRouter } from "./routers/workout";
import { cardioRouter } from "./routers/cardio";
import { bodyMetricRouter } from "./routers/body-metric";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  exercise: exerciseRouter,
  workout: workoutRouter,
  cardio: cardioRouter,
  bodyMetric: bodyMetricRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 2: Run the full test suite**

Run: `pnpm --filter @ironpulse/api test`
Expected: All tests PASS across all test files (auth, user, exercise, workout, cardio, body-metric, analytics)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm --filter @ironpulse/api lint && pnpm --filter @ironpulse/shared lint`
Expected: No errors

- [ ] **Step 4: Verify web app builds**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds (new routers are available via AppRouter type)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/root.ts
git commit -m "wire exercise, workout, cardio, bodyMetric, and analytics routers into app router"
```
