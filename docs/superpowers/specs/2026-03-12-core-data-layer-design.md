# Core Data Layer — Design Specification

Exercise seed data, workout/cardio/analytics tRPC routers, and supporting Zod schemas — the full API layer needed before UI development.

## Exercise Seed Data

**Source:** [wrkout/exercises.json](https://github.com/wrkout/exercises.json) — Public Domain, individual `exercise.json` files per exercise with `images/` directories.

**Implementation:**
- Consolidate exercises into a single `packages/db/seeds/exercises.json` file (downloaded/converted from the wrkout repo)
- Seed script at `packages/db/seeds/seed.ts`, wired via Prisma's `prisma.seed` config
- Idempotent — upsert on exercise name so re-running doesn't duplicate

**Data mapping:**

| wrkout field | Prisma Exercise field | Notes |
|---|---|---|
| name | name | Direct |
| mechanic (compound/isolation) | category | Map to ExerciseCategory enum. If null/missing, default to `COMPOUND`. The wrkout `category` field (e.g. "strength", "stretching") is intentionally ignored — `mechanic` is the more useful signal for our enum. |
| primaryMuscles | primaryMuscles | Direct (string[]) |
| secondaryMuscles | secondaryMuscles | Direct (string[]) |
| equipment | equipment | Map to Equipment enum. If null or unrecognized value, set to `null` (field is nullable in Prisma). |
| instructions (string[]) | instructions | Join with newlines |
| images/ directory | imageUrls | GitHub raw URLs |
| — | videoUrls | Empty array (wrkout has no videos) |
| — | isCustom | false |
| — | createdById | null |

**Image URLs:** Constructed as `https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises/{Exercise_Name}/images/{index}.jpg`. Zero storage cost, depends on GitHub availability. Migrate to S3/MinIO in a future phase.

## tRPC Routers

### `exercise` Router

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `exercise.list` | query | public | Paginated list with optional filters: muscle group, equipment, category, search text |
| `exercise.getById` | query | public | Single exercise with full details |
| `exercise.create` | mutation | protected | Create custom exercise (sets `isCustom = true`, `createdById = user.id`) |

Exercise database is global — reads are public. Only custom exercise creation requires authentication.

### `workout` Router

All procedures are protected and enforce `userId` scoping server-side.

| Procedure | Type | Description |
|---|---|---|
| `workout.create` | mutation | Start a new workout (name, optional templateId). If templateId provided, copies template exercises and sets. **Temporary** — moves to PowerSync. |
| `workout.getById` | query | Full workout with exercises, sets nested. Scoped to userId. **Permanent.** |
| `workout.list` | query | Paginated history with summary stats (exercise count, total volume, duration). Cursor-based on `startedAt`. **Permanent.** |
| `workout.update` | mutation | Update workout metadata (name, notes). **Temporary** — moves to PowerSync. |
| `workout.addExercise` | mutation | Append exercise to workout. **Temporary** — moves to PowerSync. |
| `workout.updateSet` | mutation | Update set data (weight, reps, RPE, type, completed). **Temporary** — moves to PowerSync. |
| `workout.addSet` | mutation | Add a set to a workout exercise. **Temporary** — moves to PowerSync. |
| `workout.deleteSet` | mutation | Remove a set. **Temporary** — moves to PowerSync. |
| `workout.complete` | mutation | Mark complete, calculate duration, run PR detection. Returns new PRs. **Permanent.** |

**Temporary scope:** Procedures marked **Temporary** exist for pre-PowerSync development. When PowerSync ships, creation/editing moves to local-first sync; procedures marked **Permanent** remain as server-authoritative endpoints.

### `cardio` Router

All procedures are protected and enforce `userId` scoping server-side.

| Procedure | Type | Description |
|---|---|---|
| `cardio.create` | mutation | Log manual cardio session (type, duration, distance, etc.). Sets `source = "manual"`. |
| `cardio.list` | query | Paginated cardio history. Cursor-based on `startedAt`. |
| `cardio.getById` | query | Session details without route points |
| `cardio.getRoutePoints` | query | Fetch route points for map rendering (separate to keep responses lean) |
| `cardio.completeGpsSession` | mutation | Upload buffered route points after GPS tracking, create/finalize CardioSession. Sets `source = "gps"`. |
| `cardio.importGpx` | mutation | Parse GPX XML string, create CardioSession + RoutePoints, calculate stats. Sets `source = "gpx"`. |

### `bodyMetric` Router

All procedures are protected and enforce `userId` scoping server-side.

| Procedure | Type | Description |
|---|---|---|
| `bodyMetric.create` | mutation | Log weight/body fat/measurements for a date. Upserts on userId + date. |
| `bodyMetric.list` | query | Date-range query for charting (from, to params) |

### `analytics` Router

All procedures are protected and enforce `userId` scoping server-side.

| Procedure | Type | Description |
|---|---|---|
| `analytics.weeklyVolume` | query | Total volume (weight × reps) by muscle group, grouped by week. Joins ExerciseSet → WorkoutExercise → Exercise. |
| `analytics.personalRecords` | query | PR history for a specific exercise, ordered by date |
| `analytics.bodyWeightTrend` | query | Body weight data points over time (days param) |

## PR Detection Logic

Triggered by `workout.complete`:

1. Fetch all completed sets in the workout (`completed = true`, `reps > 0`, `weight > 0` — skip bodyweight-only sets)
2. Group by `exerciseId`
3. For each exercise, calculate:
   - **1RM** — estimated via Epley formula: `weight × (1 + reps / 30)` for sets with reps ≤ 10. For single-rep sets, use actual weight. Sets with reps > 10 are excluded from 1RM calculation (formula becomes unreliable at high reps).
   - **Volume** — highest single-set volume: `weight × reps`
4. Compare against the user's current best `PersonalRecord` for that exercise + type (query with `orderBy: { value: 'desc' }, take: 1`)
5. If new value exceeds existing best (or no record exists), **INSERT** a new `PersonalRecord` row with `setId` reference and `achievedAt` set to the workout's `completedAt` timestamp. Records are never overwritten — each PR is a historical entry.
6. Return list of new PRs in the response

**Scope:** Only 1RM and volume PRs. 3RM/5RM detection deferred (requires analyzing consecutive sets).

**Note:** `analytics.personalRecords` returns the full PR history for an exercise, ordered by `achievedAt`, allowing users to see their progression over time.

## GPX Import

**Dependency:** `fast-xml-parser` added to `@ironpulse/api`.

**Flow:**
1. `cardio.importGpx` receives a GPX XML string (web app reads file client-side, sends content as string — no multipart upload)
2. Parse `<trkpt>` elements for: `lat`, `lng` (from GPX `lon` attribute), `ele` (elevation), `time` (timestamp)
3. Calculate derived stats:
   - **Distance** — Haversine formula between consecutive points, summed
   - **Elevation gain** — sum of positive elevation deltas
   - **Duration** — difference between first and last timestamp
4. Create `CardioSession` with calculated stats (type defaults to "hike", user can override)
5. Batch-insert `RoutePoint` rows via `createMany`
6. Return created session

**Edge cases:**
- Reject files with no track points
- Handle missing elevation gracefully (set to null)
- Cap at 50,000 points per import (safety limit)
- GPX string content capped at 10 MB (`importGpxSchema` validates `gpxContent.max(10_000_000)`)
- `fast-xml-parser` configured with `processEntities: false` and `allowBooleanAttributes: false` to mitigate XXE-style risks
- Coordinate validation: lat must be in [-90, 90], lon in [-180, 180] — invalid points are silently dropped

## Zod Schemas

New schemas in `@ironpulse/shared`:

**Exercise:**
- `createExerciseSchema` — name, category, muscles, equipment, instructions
- `listExercisesSchema` — extends `cursorPaginationSchema` with optional filters (muscleGroup, equipment, category, search)

**Workout:**
- `createWorkoutSchema` — name (optional), templateId (optional). Server auto-sets `startedAt = new Date()` (offline start-time handled by PowerSync later).
- `updateWorkoutSchema` — name, notes (both optional)
- `addExerciseSchema` — workoutId, exerciseId
- `addSetSchema` — workoutExerciseId, weight, reps, type, rpe (all optional except workoutExerciseId)
- `updateSetSchema` — setId, weight, reps, rpe, type, completed (all optional except setId)
- `deleteSetSchema` — setId
- `completeWorkoutSchema` — workoutId, completedAt (optional, for retroactive logging; defaults to `new Date()`)

**Cardio:**
- `createCardioSchema` — type, startedAt, durationSeconds, distanceMeters, elevationGainM, avgHeartRate, maxHeartRate, calories, notes (most optional)
- `completeGpsSessionSchema` — type, startedAt, routePoints array (lat [-90,90], lng [-180,180], elevation, timestamp)
- `importGpxSchema` — gpxContent (string, max 10 MB), type (optional override)

**Body metrics:**
- `createBodyMetricSchema` — date, weightKg, bodyFatPct, measurements (all optional except date)
- `listBodyMetricsSchema` — from, to (date range)

**Analytics:**
- `weeklyVolumeSchema` — weeks (default 4)
- `personalRecordsSchema` — exerciseId
- `bodyWeightTrendSchema` — days (default 30)

**Shared:**
- `cursorPaginationSchema` — cursor (optional string), limit (default 20, max 100)

## Testing Strategy

TDD against real PostgreSQL, same approach as foundation.

**Test files:**
- `packages/api/__tests__/exercise.test.ts`
- `packages/api/__tests__/workout.test.ts`
- `packages/api/__tests__/cardio.test.ts`
- `packages/api/__tests__/body-metric.test.ts`
- `packages/api/__tests__/analytics.test.ts`

**Coverage:**
- Exercise: list with filters, search, custom exercise creation
- Workout: full lifecycle (create → add exercises → add/update sets → complete), PR detection on completion, template-based creation, pagination, userId scoping
- Cardio: manual session creation, GPS session completion with route points, GPX import parsing and stat calculation
- Body metrics: create/upsert behavior on same date, date-range queries
- Analytics: weekly volume aggregation correctness, PR history ordering, body weight trend
- Auth scoping: all protected procedures reject unauthenticated calls, users can't access other users' data

## Dependencies

**New packages:**
- `fast-xml-parser` — GPX parsing in `@ironpulse/api`
- `tsx` — running seed script in `@ironpulse/db`

**No schema changes needed** — the Prisma schema from foundation already covers all models used here.
