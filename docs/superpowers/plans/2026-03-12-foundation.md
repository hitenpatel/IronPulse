# Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Turborepo monorepo with database schema, authentication, tRPC API, and the Next.js web app shell — everything needed before feature work begins.

**Architecture:** Turborepo monorepo with shared packages (`db`, `api`, `shared`) consumed by a Next.js web app. PostgreSQL + PostGIS for storage, NextAuth.js for authentication, tRPC for the API layer. All inputs validated with Zod.

**Tech Stack:** TypeScript, Turborepo, Next.js 15, tRPC v11, Prisma, PostgreSQL + PostGIS, NextAuth.js v5, Zod, Vitest, Tailwind CSS

---

## File Structure

```
ironpulse/
├── turbo.json
├── package.json                          # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.json                         # Root TS config (extends)
├── .env.example
├── .gitignore
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx            # Root layout (providers)
│       │   │   ├── page.tsx              # Landing page placeholder
│       │   │   ├── api/
│       │   │   │   ├── trpc/[trpc]/route.ts   # tRPC HTTP handler
│       │   │   │   ├── auth/[...nextauth]/route.ts  # NextAuth route
│       │   │   │   └── health/route.ts        # Health check endpoint
│       │   │   └── (app)/
│       │   │       ├── layout.tsx        # Authenticated app layout
│       │   │       └── dashboard/
│       │   │           └── page.tsx      # Dashboard placeholder
│       │   ├── lib/
│       │   │   ├── trpc/
│       │   │   │   ├── client.ts         # tRPC React client
│       │   │   │   ├── server.ts         # tRPC server caller
│       │   │   │   └── provider.tsx      # tRPC + QueryClient provider
│       │   │   └── auth.ts              # NextAuth config
│       │   ├── components/
│       │   │   └── providers.tsx         # Combined providers wrapper
│       │   └── styles/
│       │       └── globals.css           # Tailwind imports
│       └── __tests__/
│           └── health.test.ts            # Health endpoint test
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma            # Full MVP schema
│   │   └── src/
│   │       └── index.ts                 # PrismaClient export
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts             # Vitest config
│   │   ├── src/
│   │   │   ├── index.ts                 # Public exports
│   │   │   ├── trpc.ts                  # tRPC init, context, middleware
│   │   │   ├── root.ts                  # Merged app router
│   │   │   └── routers/
│   │   │       ├── auth.ts              # Auth router
│   │   │       └── user.ts              # User router
│   │   └── __tests__/
│   │       ├── helpers.ts               # Test DB setup/teardown
│   │       ├── auth.test.ts             # Auth router tests
│   │       └── user.test.ts             # User router tests
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 # Public exports
│           ├── schemas/
│           │   ├── auth.ts              # Auth Zod schemas
│           │   └── user.ts              # User Zod schemas
│           ├── enums.ts                 # Shared enums
│           └── types.ts                 # Shared TypeScript types
```

---

## Chunk 1: Monorepo Scaffolding + Shared Package

### Task 1: Turborepo Monorepo Init

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.gitignore`, `.env.example`

- [ ] **Step 1: Initialise the monorepo**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm init
```

Edit `package.json`:
```json
{
  "name": "ironpulse",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:push": "pnpm --filter @ironpulse/db db:push",
    "db:migrate": "pnpm --filter @ironpulse/db db:migrate",
    "db:seed": "pnpm --filter @ironpulse/db db:seed",
    "db:studio": "pnpm --filter @ironpulse/db db:studio"
  },
  "packageManager": "pnpm@9.15.4"
}
```

- [ ] **Step 2: Create workspace config**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
*.tsbuildinfo
.superpowers/
```

- [ ] **Step 6: Create .env.example**

```bash
# Database
DATABASE_URL="postgresql://ironpulse:ironpulse@localhost:5432/ironpulse"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
APPLE_ID=""
APPLE_SECRET=""

# Storage
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="ironpulse"

# Redis
REDIS_URL="redis://localhost:6379"

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ATHLETE_MONTHLY=""
STRIPE_PRICE_ATHLETE_YEARLY=""

# App
DEPLOYMENT_MODE="cloud"
```

- [ ] **Step 7: Install root dependencies**

```bash
pnpm add -D -w turbo typescript @types/node
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "init turborepo monorepo scaffolding"
```

---

### Task 2: Shared Package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/enums.ts`, `packages/shared/src/types.ts`, `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/user.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ironpulse/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create enums**

`packages/shared/src/enums.ts`:
```typescript
export const UnitSystem = {
  METRIC: "metric",
  IMPERIAL: "imperial",
} as const;
export type UnitSystem = (typeof UnitSystem)[keyof typeof UnitSystem];

export const Tier = {
  ATHLETE: "athlete",
  COACH: "coach",
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

export const SubscriptionStatus = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  NONE: "none",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const AuthProvider = {
  EMAIL: "email",
  GOOGLE: "google",
  APPLE: "apple",
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const MuscleGroup = {
  CHEST: "chest",
  BACK: "back",
  SHOULDERS: "shoulders",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  QUADS: "quads",
  HAMSTRINGS: "hamstrings",
  GLUTES: "glutes",
  CALVES: "calves",
  ABS: "abs",
  OBLIQUES: "obliques",
  TRAPS: "traps",
  LATS: "lats",
  LOWER_BACK: "lower_back",
  HIP_FLEXORS: "hip_flexors",
  ADDUCTORS: "adductors",
  ABDUCTORS: "abductors",
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const Equipment = {
  BARBELL: "barbell",
  DUMBBELL: "dumbbell",
  KETTLEBELL: "kettlebell",
  MACHINE: "machine",
  CABLE: "cable",
  BODYWEIGHT: "bodyweight",
  BAND: "band",
  OTHER: "other",
} as const;
export type Equipment = (typeof Equipment)[keyof typeof Equipment];

export const ExerciseCategory = {
  COMPOUND: "compound",
  ISOLATION: "isolation",
  CARDIO: "cardio",
  STRETCHING: "stretching",
  PLYOMETRIC: "plyometric",
} as const;
export type ExerciseCategory =
  (typeof ExerciseCategory)[keyof typeof ExerciseCategory];

export const SetType = {
  WORKING: "working",
  WARMUP: "warmup",
  DROPSET: "dropset",
  FAILURE: "failure",
} as const;
export type SetType = (typeof SetType)[keyof typeof SetType];

export const CardioType = {
  RUN: "run",
  CYCLE: "cycle",
  SWIM: "swim",
  HIKE: "hike",
  WALK: "walk",
  ROW: "row",
  ELLIPTICAL: "elliptical",
  OTHER: "other",
} as const;
export type CardioType = (typeof CardioType)[keyof typeof CardioType];

export const CardioSource = {
  MANUAL: "manual",
  GPS: "gps",
  GARMIN: "garmin",
  STRAVA: "strava",
} as const;
export type CardioSource = (typeof CardioSource)[keyof typeof CardioSource];

export const PRType = {
  ONE_RM: "1rm",
  THREE_RM: "3rm",
  FIVE_RM: "5rm",
  VOLUME: "volume",
} as const;
export type PRType = (typeof PRType)[keyof typeof PRType];
```

- [ ] **Step 4: Create auth schemas**

`packages/shared/src/schemas/auth.ts`:
```typescript
import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;
```

- [ ] **Step 5: Create user schemas**

`packages/shared/src/schemas/user.ts`:
```typescript
import { z } from "zod";
import { UnitSystem } from "../enums.js";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unitSystem: z.enum([UnitSystem.METRIC, UnitSystem.IMPERIAL]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

- [ ] **Step 6: Create types**

`packages/shared/src/types.ts`:
```typescript
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  tier: string;
  subscriptionStatus: string;
  unitSystem: string;
}
```

- [ ] **Step 7: Create index barrel export**

`packages/shared/src/index.ts`:
```typescript
export * from "./enums.js";
export * from "./types.js";
export * from "./schemas/auth.js";
export * from "./schemas/user.js";
```

- [ ] **Step 8: Install dependencies and commit**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm install
git add packages/shared/
git commit -m "add shared package with enums, types, and Zod schemas"
```

---

## Chunk 2: Database Package + Local Dev Database

### Task 3: Prisma Schema (MVP Tables)

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ironpulse/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "lint": "tsc --noEmit",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.3"
  },
  "devDependencies": {
    "prisma": "^6.3",
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create Prisma schema**

`packages/db/prisma/schema.prisma`:

> **Note:** If `prisma validate` fails on `previewFeatures = ["postgresqlExtensions"]`, remove that line and the `extensions = [postgis]` line. Apply PostGIS manually via a raw SQL migration: `CREATE EXTENSION IF NOT EXISTS postgis;`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ─── Users & Auth ────────────────────────────────────────

model User {
  id                 String             @id @default(uuid()) @db.Uuid
  email              String             @unique
  name               String
  avatarUrl          String?            @map("avatar_url")
  passwordHash       String?            @map("password_hash")
  unitSystem         String             @default("metric") @map("unit_system")
  tier               String             @default("athlete")
  subscriptionStatus String             @default("none") @map("subscription_status")
  stripeCustomerId   String?            @unique @map("stripe_customer_id")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  accounts           Account[]
  workouts           Workout[]
  cardioSessions     CardioSession[]
  bodyMetrics        BodyMetric[]
  personalRecords    PersonalRecord[]
  customExercises    Exercise[]         @relation("CustomExercises")
  workoutTemplates   WorkoutTemplate[]

  @@map("users")
}

model Account {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  provider          String
  providerAccountId String   @map("provider_account_id")
  createdAt         DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// ─── Exercises ───────────────────────────────────────────

model Exercise {
  id               String   @id @default(uuid()) @db.Uuid
  name             String
  category         String?
  primaryMuscles   String[] @map("primary_muscles")
  secondaryMuscles String[] @map("secondary_muscles")
  equipment        String?
  instructions     String?
  imageUrls        String[] @map("image_urls")
  videoUrls        String[] @map("video_urls")
  isCustom         Boolean  @default(false) @map("is_custom")
  createdById      String?  @map("created_by_id") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")

  createdBy         User?              @relation("CustomExercises", fields: [createdById], references: [id], onDelete: SetNull)
  workoutExercises  WorkoutExercise[]
  templateExercises TemplateExercise[]
  personalRecords   PersonalRecord[]

  @@map("exercises")
}

// ─── Strength Training ───────────────────────────────────

model Workout {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  name            String?
  startedAt       DateTime  @map("started_at")
  completedAt     DateTime? @map("completed_at")
  durationSeconds Int?      @map("duration_seconds")
  notes           String?
  templateId      String?   @map("template_id") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  template         WorkoutTemplate?  @relation(fields: [templateId], references: [id], onDelete: SetNull)
  workoutExercises WorkoutExercise[]

  @@index([userId, startedAt])
  @@map("workouts")
}

model WorkoutExercise {
  id         String  @id @default(uuid()) @db.Uuid
  workoutId  String  @map("workout_id") @db.Uuid
  exerciseId String  @map("exercise_id") @db.Uuid
  order      Int
  notes      String?

  workout  Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise Exercise @relation(fields: [exerciseId], references: [id])
  sets     ExerciseSet[]

  @@map("workout_exercises")
}

model ExerciseSet {
  id                String   @id @default(uuid()) @db.Uuid
  workoutExerciseId String   @map("workout_exercise_id") @db.Uuid
  setNumber         Int      @map("set_number")
  type              String   @default("working")
  weightKg          Decimal? @map("weight_kg") @db.Decimal(7, 2)
  reps              Int?
  rpe               Decimal? @db.Decimal(3, 1)
  restSeconds       Int?     @map("rest_seconds")
  completed         Boolean  @default(false)

  workoutExercise WorkoutExercise @relation(fields: [workoutExerciseId], references: [id], onDelete: Cascade)
  personalRecords PersonalRecord[]

  @@map("exercise_sets")
}

// ─── Cardio ──────────────────────────────────────────────

model CardioSession {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  type            String
  source          String    @default("manual")
  startedAt       DateTime  @map("started_at")
  durationSeconds Int       @map("duration_seconds")
  distanceMeters  Decimal?  @map("distance_meters") @db.Decimal(10, 2)
  elevationGainM  Decimal?  @map("elevation_gain_m") @db.Decimal(8, 2)
  avgHeartRate    Int?      @map("avg_heart_rate")
  maxHeartRate    Int?      @map("max_heart_rate")
  calories        Int?
  routeFileUrl    String?   @map("route_file_url")
  externalId      String?   @map("external_id")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  routePoints RoutePoint[]
  laps        Lap[]

  @@index([userId, startedAt])
  @@map("cardio_sessions")
}

model RoutePoint {
  id          String   @id @default(uuid()) @db.Uuid
  sessionId   String   @map("session_id") @db.Uuid
  latitude    Decimal  @db.Decimal(10, 7)
  longitude   Decimal  @db.Decimal(10, 7)
  elevationM  Decimal? @map("elevation_m") @db.Decimal(8, 2)
  heartRate   Int?     @map("heart_rate")
  timestamp   DateTime

  session CardioSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, timestamp])
  @@map("route_points")
}

model Lap {
  id              String  @id @default(uuid()) @db.Uuid
  sessionId       String  @map("session_id") @db.Uuid
  lapNumber       Int     @map("lap_number")
  distanceMeters  Decimal @map("distance_meters") @db.Decimal(10, 2)
  durationSeconds Int     @map("duration_seconds")
  avgHeartRate    Int?    @map("avg_heart_rate")

  session CardioSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("laps")
}

// ─── Templates ───────────────────────────────────────────

model WorkoutTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String
  createdAt DateTime @default(now()) @map("created_at")

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateExercises TemplateExercise[]
  workouts          Workout[]

  @@map("workout_templates")
}

model TemplateExercise {
  id         String  @id @default(uuid()) @db.Uuid
  templateId String  @map("template_id") @db.Uuid
  exerciseId String  @map("exercise_id") @db.Uuid
  order      Int
  notes      String?

  template     WorkoutTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  exercise     Exercise        @relation(fields: [exerciseId], references: [id])
  templateSets TemplateSet[]

  @@map("template_exercises")
}

model TemplateSet {
  id                 String   @id @default(uuid()) @db.Uuid
  templateExerciseId String   @map("template_exercise_id") @db.Uuid
  setNumber          Int      @map("set_number")
  targetReps         Int?     @map("target_reps")
  targetWeightKg     Decimal? @map("target_weight_kg") @db.Decimal(7, 2)
  type               String   @default("working")

  templateExercise TemplateExercise @relation(fields: [templateExerciseId], references: [id], onDelete: Cascade)

  @@map("template_sets")
}

// ─── Body Metrics ────────────────────────────────────────

model BodyMetric {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  date         DateTime @db.Date
  weightKg     Decimal? @map("weight_kg") @db.Decimal(5, 2)
  bodyFatPct   Decimal? @map("body_fat_pct") @db.Decimal(4, 1)
  measurements Json?
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("body_metrics")
}

model PersonalRecord {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  exerciseId String   @map("exercise_id") @db.Uuid
  type       String
  value      Decimal  @db.Decimal(10, 2)
  achievedAt DateTime @map("achieved_at")
  setId      String?  @map("set_id") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")

  user     User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercise Exercise    @relation(fields: [exerciseId], references: [id])
  set      ExerciseSet? @relation(fields: [setId], references: [id], onDelete: SetNull)

  @@index([userId, exerciseId, type])
  @@map("personal_records")
}
```

- [ ] **Step 4: Create PrismaClient singleton export**

`packages/db/src/index.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
```

- [ ] **Step 5: Install dependencies and generate Prisma client**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm install
pnpm --filter @ironpulse/db db:generate
```

- [ ] **Step 6: Validate schema**

```bash
pnpm --filter @ironpulse/db exec prisma validate
```

Expected: `The schema at packages/db/prisma/schema.prisma is valid.`

- [ ] **Step 7: Commit**

```bash
git add packages/db/
git commit -m "add database package with full MVP Prisma schema"
```

---

### Task 4: Local Development Database

> **Important:** The database must be running before Chunk 3 (tRPC tests require it).

- [ ] **Step 1: Start PostgreSQL with PostGIS locally**

```bash
docker run -d \
  --name ironpulse-postgres \
  -e POSTGRES_USER=ironpulse \
  -e POSTGRES_PASSWORD=ironpulse \
  -e POSTGRES_DB=ironpulse \
  -p 5432:5432 \
  postgis/postgis:16-3.4
```

- [ ] **Step 2: Create .env from example**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
cp .env.example .env
sed -i '' 's/generate-with-openssl-rand-base64-32/'"$(openssl rand -base64 32)"'/' .env
```

- [ ] **Step 3: Push schema to database**

```bash
pnpm db:push
```

Expected: All tables created successfully.

- [ ] **Step 4: Verify database connection**

```bash
pnpm --filter @ironpulse/db exec prisma db pull --print | head -5
```

Expected: Shows the datasource block, confirming connectivity.

---

## Chunk 3: tRPC API Package

### Task 5: tRPC Initialisation and Context

**Files:**
- Create: `packages/api/package.json`, `packages/api/tsconfig.json`, `packages/api/vitest.config.ts`, `packages/api/src/trpc.ts`, `packages/api/src/root.ts`, `packages/api/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ironpulse/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@ironpulse/db": "workspace:*",
    "@ironpulse/shared": "workspace:*",
    "@trpc/server": "^11.0",
    "superjson": "^2.2",
    "bcryptjs": "^2.4",
    "zod": "^3.24"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4",
    "typescript": "^5.7",
    "vitest": "^3.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts", "__tests__/**/*.ts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    testTimeout: 10000,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
```

- [ ] **Step 4: Create tRPC initialisation with context and middleware**

`packages/api/src/trpc.ts`:
```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@ironpulse/db";
import type { SessionUser } from "@ironpulse/shared";

export interface CreateContextOptions {
  db: PrismaClient;
  session: { user: SessionUser } | null;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    db: opts.db,
    session: opts.session,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});
```

- [ ] **Step 5: Create empty root router** (routers will be added incrementally)

`packages/api/src/root.ts`:
```typescript
import { createTRPCRouter } from "./trpc.js";

export const appRouter = createTRPCRouter({});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Create index exports**

`packages/api/src/index.ts`:
```typescript
export { appRouter, type AppRouter } from "./root.js";
export { createTRPCContext, createCallerFactory } from "./trpc.js";
export type { CreateContextOptions } from "./trpc.js";
```

- [ ] **Step 7: Install dependencies**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add packages/api/package.json packages/api/tsconfig.json packages/api/vitest.config.ts packages/api/src/
git commit -m "add tRPC API package with context, middleware, and empty root router"
```

---

### Task 6: Auth Router (TDD)

**Files:**
- Create: `packages/api/src/routers/auth.ts`, `packages/api/__tests__/helpers.ts`, `packages/api/__tests__/auth.test.ts`

- [ ] **Step 1: Create test helpers**

`packages/api/__tests__/helpers.ts`:
```typescript
import { type PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc.js";
import { createTRPCRouter } from "../src/trpc.js";
import type { SessionUser } from "@ironpulse/shared";

// Uses a real DB — DATABASE_URL must point to a test database.
// Callers are responsible for cleanup.

export function createTestContext(
  db: PrismaClient,
  session: { user: SessionUser } | null = null
) {
  return createTRPCContext({ db, session });
}

export function createTestUser(overrides?: Partial<SessionUser>): SessionUser {
  return {
    id: crypto.randomUUID(),
    email: "test@example.com",
    name: "Test User",
    tier: "athlete",
    subscriptionStatus: "none",
    unitSystem: "metric",
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing auth tests**

`packages/api/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc.js";
import { createTestUser } from "./helpers.js";

// Import the auth router directly for isolated testing
import { authRouter } from "../src/routers/auth.js";

const db = new PrismaClient();
const createCaller = createCallerFactory(authRouter);

function authCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.account.deleteMany();
  await db.user.deleteMany();
});

describe("auth.signUp", () => {
  it("creates a user with hashed password", async () => {
    const caller = authCaller();
    const result = await caller.signUp({
      email: "new@example.com",
      password: "securepass123",
      name: "New User",
    });

    expect(result.user.email).toBe("new@example.com");
    expect(result.user.name).toBe("New User");
    expect(result.user.id).toBeDefined();

    // Verify password is hashed in DB
    const dbUser = await db.user.findUnique({
      where: { email: "new@example.com" },
    });
    expect(dbUser?.passwordHash).not.toBe("securepass123");
    expect(dbUser?.passwordHash).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "dup@example.com",
      password: "securepass123",
      name: "First User",
    });

    await expect(
      caller.signUp({
        email: "dup@example.com",
        password: "securepass123",
        name: "Second User",
      })
    ).rejects.toThrow();
  });

  it("rejects short password", async () => {
    const caller = authCaller();
    await expect(
      caller.signUp({
        email: "short@example.com",
        password: "short",
        name: "Short Pass",
      })
    ).rejects.toThrow();
  });
});

describe("auth.signIn", () => {
  it("returns user for valid credentials", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "login@example.com",
      password: "securepass123",
      name: "Login User",
    });

    const result = await caller.signIn({
      email: "login@example.com",
      password: "securepass123",
    });

    expect(result.user.email).toBe("login@example.com");
  });

  it("rejects invalid password", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "wrong@example.com",
      password: "securepass123",
      name: "Wrong Pass",
    });

    await expect(
      caller.signIn({
        email: "wrong@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow();
  });

  it("rejects non-existent email", async () => {
    const caller = authCaller();
    await expect(
      caller.signIn({
        email: "nobody@example.com",
        password: "securepass123",
      })
    ).rejects.toThrow();
  });
});

describe("auth.getSession", () => {
  it("returns null when not authenticated", async () => {
    const caller = authCaller();
    const result = await caller.getSession();
    expect(result.session).toBeNull();
  });

  it("returns session when authenticated", async () => {
    const caller = authCaller({
      user: createTestUser({ email: "session@example.com" }),
    });
    const result = await caller.getSession();
    expect(result.session?.user.email).toBe("session@example.com");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm --filter @ironpulse/api test
```

Expected: FAIL — `routers/auth.js` does not exist.

- [ ] **Step 4: Implement auth router**

`packages/api/src/routers/auth.ts`:
```typescript
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { signUpSchema, signInSchema } from "@ironpulse/shared";
import { createTRPCRouter, publicProcedure } from "../trpc.js";

export const authRouter = createTRPCRouter({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await ctx.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        accounts: {
          create: {
            provider: "email",
            providerAccountId: input.email,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        unitSystem: true,
      },
    });

    return { user };
  }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        subscriptionStatus: user.subscriptionStatus,
        unitSystem: user.unitSystem,
      },
    };
  }),

  getSession: publicProcedure.query(({ ctx }) => {
    return { session: ctx.session };
  }),
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @ironpulse/api test
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Add auth router to root router**

Update `packages/api/src/root.ts`:
```typescript
import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/auth.ts packages/api/src/root.ts packages/api/__tests__/
git commit -m "add auth router with signUp, signIn, getSession (TDD)"
```

---

### Task 7: User Router (TDD)

**Files:**
- Create: `packages/api/src/routers/user.ts`, `packages/api/__tests__/user.test.ts`

- [ ] **Step 1: Write failing user tests**

`packages/api/__tests__/user.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc.js";
import { createTestUser } from "./helpers.js";
import { userRouter } from "../src/routers/user.js";

const db = new PrismaClient();
const createCaller = createCallerFactory(userRouter);

function userCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.account.deleteMany();
  await db.user.deleteMany();
});

describe("user.updateProfile", () => {
  it("updates user name", async () => {
    const dbUser = await db.user.create({
      data: { email: "update@example.com", name: "Old Name" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.updateProfile({ name: "New Name" });
    expect(result.user.name).toBe("New Name");
  });

  it("updates unit system", async () => {
    const dbUser = await db.user.create({
      data: { email: "units@example.com", name: "Units User" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.updateProfile({ unitSystem: "imperial" });
    expect(result.user.unitSystem).toBe("imperial");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(
      caller.updateProfile({ name: "Hacker" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("user.me", () => {
  it("returns current user profile", async () => {
    const dbUser = await db.user.create({
      data: { email: "me@example.com", name: "Me User" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.me();
    expect(result.user.email).toBe("me@example.com");
    expect(result.user.name).toBe("Me User");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(caller.me()).rejects.toThrow("UNAUTHORIZED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @ironpulse/api test
```

Expected: FAIL — `routers/user.js` does not exist.

- [ ] **Step 3: Implement user router**

`packages/api/src/routers/user.ts`:
```typescript
import { updateProfileSchema } from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        unitSystem: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    return { user };
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.unitSystem !== undefined && { unitSystem: input.unitSystem }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          unitSystem: true,
          tier: true,
          subscriptionStatus: true,
        },
      });

      return { user };
    }),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @ironpulse/api test
```

Expected: All tests PASS (auth + user).

- [ ] **Step 5: Add user router to root router**

Update `packages/api/src/root.ts`:
```typescript
import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { userRouter } from "./routers/user.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/user.ts packages/api/src/root.ts packages/api/__tests__/user.test.ts
git commit -m "add user router with me and updateProfile (TDD)"
```

---

## Chunk 4: Next.js Web App

### Task 8: Next.js App Scaffold

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`, `apps/web/src/styles/globals.css`, `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ironpulse/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@ironpulse/api": "workspace:*",
    "@ironpulse/db": "workspace:*",
    "@ironpulse/shared": "workspace:*",
    "@trpc/client": "^11.0",
    "@trpc/react-query": "^11.0",
    "@trpc/server": "^11.0",
    "@tanstack/react-query": "^5.64",
    "next": "^15.2",
    "next-auth": "^5.0.0-beta.25",
    "react": "^19.0",
    "react-dom": "^19.0",
    "superjson": "^2.2",
    "bcryptjs": "^2.4",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4",
    "@types/react": "^19.0",
    "@types/react-dom": "^19.0",
    "autoprefixer": "^10.4",
    "postcss": "^8.5",
    "tailwindcss": "^3.4",
    "typescript": "^5.7",
    "vitest": "^3.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ironpulse/api", "@ironpulse/db", "@ironpulse/shared"],
};

export default nextConfig;
```

- [ ] **Step 4: Create Tailwind config**

`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

`apps/web/postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create globals.css**

`apps/web/src/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create landing page placeholder**

`apps/web/src/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">IronPulse</h1>
      <p className="mt-4 text-lg text-gray-600">
        The ultimate fitness tracker — strength and cardio, unified.
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/src/styles/ apps/web/src/app/page.tsx
git commit -m "scaffold Next.js web app with Tailwind CSS"
```

---

### Task 9: NextAuth.js + tRPC Wiring + Providers

**Files:**
- Create: `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/lib/trpc/client.ts`, `apps/web/src/lib/trpc/server.ts`, `apps/web/src/lib/trpc/provider.tsx`, `apps/web/src/components/providers.tsx`, `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create NextAuth config**

`apps/web/src/lib/auth.ts`:
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { db } from "@ironpulse/db";
import { signInSchema } from "@ironpulse/shared";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          subscriptionStatus: user.subscriptionStatus,
          unitSystem: user.unitSystem,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, user object is available
      if (user) {
        token.id = user.id;

        // For credentials provider, custom fields are on the user object
        if ((user as any).tier) {
          token.tier = (user as any).tier;
          token.subscriptionStatus = (user as any).subscriptionStatus;
          token.unitSystem = (user as any).unitSystem;
        }
      }

      // For OAuth providers (or if custom fields not set yet), load from DB
      if (token.id && !token.tier) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { tier: true, subscriptionStatus: true, unitSystem: true },
        });
        if (dbUser) {
          token.tier = dbUser.tier;
          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.unitSystem = dbUser.unitSystem;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).tier = token.tier;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).unitSystem = token.unitSystem;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        const existing = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existing) {
          const newUser = await db.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "User",
              avatarUrl: user.image,
              accounts: {
                create: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            },
          });
          // Set user.id so the jwt callback gets the DB id
          user.id = newUser.id;
        } else {
          // Set user.id to the existing DB id
          user.id = existing.id;

          const hasAccount = await db.account.findFirst({
            where: {
              userId: existing.id,
              provider: account.provider,
            },
          });

          if (!hasAccount) {
            await db.account.create({
              data: {
                userId: existing.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 2: Create NextAuth route handler**

`apps/web/src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create tRPC React client**

`apps/web/src/lib/trpc/client.ts`:
```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@ironpulse/api";

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 4: Create tRPC server caller**

`apps/web/src/lib/trpc/server.ts`:
```typescript
import "server-only";
import { createTRPCContext, createCallerFactory, appRouter } from "@ironpulse/api";
import { db } from "@ironpulse/db";
import { auth } from "@/lib/auth";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const session = await auth();

  return createCaller(
    createTRPCContext({
      db,
      session: session?.user
        ? {
            user: {
              id: session.user.id!,
              email: session.user.email!,
              name: session.user.name!,
              tier: (session.user as any).tier ?? "athlete",
              subscriptionStatus:
                (session.user as any).subscriptionStatus ?? "none",
              unitSystem: (session.user as any).unitSystem ?? "metric",
            },
          }
        : null,
    })
  );
}
```

- [ ] **Step 5: Create tRPC provider**

`apps/web/src/lib/trpc/provider.tsx`:
```tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./client";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 6: Create combined providers**

`apps/web/src/components/providers.tsx`:
```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/lib/trpc/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>{children}</TRPCProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 7: Create root layout** (now that providers exist)

`apps/web/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "IronPulse",
  description: "The ultimate fitness tracker — strength and cardio, unified.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/components/ apps/web/src/app/layout.tsx apps/web/src/app/api/auth/
git commit -m "add NextAuth.js, tRPC client/server, and providers"
```

---

### Task 10: tRPC API Route + Health Endpoint + App Shell

**Files:**
- Create: `apps/web/src/app/api/trpc/[trpc]/route.ts`, `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create tRPC HTTP handler**

`apps/web/src/app/api/trpc/[trpc]/route.ts`:
```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@ironpulse/api";
import { db } from "@ironpulse/db";
import { auth } from "@/lib/auth";

const handler = async (req: Request) => {
  const session = await auth();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        db,
        session: session?.user
          ? {
              user: {
                id: session.user.id!,
                email: session.user.email!,
                name: session.user.name!,
                tier: (session.user as any).tier ?? "athlete",
                subscriptionStatus:
                  (session.user as any).subscriptionStatus ?? "none",
                unitSystem: (session.user as any).unitSystem ?? "metric",
              },
            }
          : null,
      }),
  });
};

export { handler as GET, handler as POST };
```

- [ ] **Step 2: Create health check endpoint**

`apps/web/src/app/api/health/route.ts`:
```typescript
import { db } from "@ironpulse/db";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return Response.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
```

- [ ] **Step 3: Create authenticated app layout**

`apps/web/src/app/(app)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-4">
        <span className="text-xl font-bold">IronPulse</span>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard placeholder**

`apps/web/src/app/(app)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to IronPulse.</p>
    </div>
  );
}
```

- [ ] **Step 5: Install all dependencies**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/trpc/ apps/web/src/app/api/health/ apps/web/src/app/"(app)"/
git commit -m "add tRPC route handler, health endpoint, and app layout"
```

---

## Chunk 5: Verification

### Task 11: Build + Test + Verify

- [ ] **Step 1: Verify the app builds**

```bash
cd /Users/hitenpatel/dev/personal/IronPulse
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 2: Start dev server**

```bash
pnpm dev
```

Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 3: Verify health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"healthy","checks":{"database":"ok"}}`

- [ ] **Step 4: Verify landing page**

Open `http://localhost:3000` in a browser — should show "IronPulse" heading.

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: All auth and user router tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "foundation complete — build, tests, and dev server verified"
```
