# PowerSync Integration — Design Specification

Integrate PowerSync into the IronPulse web app for offline-first data sync. Clients read and write to a local SQLite database (IndexedDB/OPFS). PowerSync syncs changes bidirectionally with PostgreSQL via logical replication and an upload queue.

## Scope

- Web app only (mobile reuses `packages/sync` later)
- Full PowerSync SDK integration with local-first writes
- Dual-layer hooks abstracting PowerSync reads from tRPC
- PowerSync Cloud for development, self-hosted Open Edition for production

## Architecture

```
┌─────────────────────────┐
│  Next.js Web App        │
│                         │
│  PowerSyncDatabase      │
│  (SQLite via WASM)      │
│      │          │       │
│  Local reads   Local    │
│  (useQuery)    writes   │
│      │          │       │
│      │    Upload Queue  │
│      │      │           │
└──────┼──────┼───────────┘
       │      │
  Sync │      │ uploadData() → tRPC mutations
  (WS) │      │
       ▼      ▼
┌──────────────────┐    ┌─────────────────┐
│ PowerSync Service│    │ Next.js API      │
│ (reads CDC from  │    │ (tRPC sync       │
│  PostgreSQL WAL) │    │  router persists │
│                  │    │  uploads)        │
└────────┬─────────┘    └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
              ┌──────────────┐
              │ PostgreSQL   │
              │ (WAL logical │
              │  replication)│
              └──────────────┘
```

**Reads**: Client queries local SQLite via `useQuery()` from `@powersync/react` — reactive, instant, works offline.

**Writes**: Client writes to local SQLite → upload queue → `uploadData()` calls tRPC `sync.*` mutations to persist to PostgreSQL → PowerSync picks up the change via WAL and syncs back to all clients.

**Sync**: PowerSync Service reads PostgreSQL WAL (logical replication), applies sync rules, streams changes to connected clients via WebSocket.

**Auth**: Client calls `sync.getToken` tRPC mutation which signs a JWT with an RSA private key. PowerSync Service validates it via a JWKS endpoint at `/api/auth/powersync/keys`.

## Synced Tables & Sync Rules

### Tables synced via PowerSync

| Table | Sync Scope | Notes |
|-------|-----------|-------|
| Workout | `user_id = auth.user_id()` | |
| WorkoutExercise | JOIN through Workout | |
| ExerciseSet | JOIN through WorkoutExercise → Workout | |
| CardioSession | `user_id = auth.user_id()` | Metadata only |
| Lap | JOIN through CardioSession | |
| WorkoutTemplate | `user_id = auth.user_id()` | |
| TemplateExercise | JOIN through WorkoutTemplate | |
| TemplateSet | JOIN through TemplateExercise → WorkoutTemplate | |
| BodyMetric | `user_id = auth.user_id()` | |
| PersonalRecord | `user_id = auth.user_id()` | |
| Exercise | Global (`is_custom = false`) to all users; custom (`is_custom = true`) to creator only | Two streams |

### Tables NOT synced (tRPC-only)

| Table | Reason |
|-------|--------|
| User, Account | Auth — server-side only |
| RoutePoint | Too large (thousands per session), fetched on-demand via `cardio.getRoutePoints` |
| PasswordResetToken, MagicLinkToken | Auth tokens — server-side only |

### Sync Rules (Sync Streams edition 3)

All table and column names use the actual PostgreSQL names (snake_case, as defined by Prisma `@@map` / `@map`), not the Prisma model names.

```yaml
config:
  edition: 3

streams:
  user_workouts:
    auto_subscribe: true
    query: SELECT * FROM workouts WHERE user_id = token_parameters.user_id

  user_workout_exercises:
    auto_subscribe: true
    query: |
      SELECT we.* FROM workout_exercises we
      INNER JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = token_parameters.user_id

  user_sets:
    auto_subscribe: true
    query: |
      SELECT s.* FROM exercise_sets s
      INNER JOIN workout_exercises we ON s.workout_exercise_id = we.id
      INNER JOIN workouts w ON we.workout_id = w.id
      WHERE w.user_id = token_parameters.user_id

  user_cardio_sessions:
    auto_subscribe: true
    query: SELECT * FROM cardio_sessions WHERE user_id = token_parameters.user_id

  user_laps:
    auto_subscribe: true
    query: |
      SELECT l.* FROM laps l
      INNER JOIN cardio_sessions cs ON l.session_id = cs.id
      WHERE cs.user_id = token_parameters.user_id

  user_templates:
    auto_subscribe: true
    query: SELECT * FROM workout_templates WHERE user_id = token_parameters.user_id

  user_template_exercises:
    auto_subscribe: true
    query: |
      SELECT te.* FROM template_exercises te
      INNER JOIN workout_templates wt ON te.template_id = wt.id
      WHERE wt.user_id = token_parameters.user_id

  user_template_sets:
    auto_subscribe: true
    query: |
      SELECT ts.* FROM template_sets ts
      INNER JOIN template_exercises te ON ts.template_exercise_id = te.id
      INNER JOIN workout_templates wt ON te.template_id = wt.id
      WHERE wt.user_id = token_parameters.user_id

  user_body_metrics:
    auto_subscribe: true
    query: SELECT * FROM body_metrics WHERE user_id = token_parameters.user_id

  user_personal_records:
    auto_subscribe: true
    query: SELECT * FROM personal_records WHERE user_id = token_parameters.user_id

  global_exercises:
    auto_subscribe: true
    query: SELECT * FROM exercises WHERE is_custom = false

  user_exercises:
    auto_subscribe: true
    query: SELECT * FROM exercises WHERE is_custom = true AND created_by_id = token_parameters.user_id
```

### PostgreSQL Publication

Created via a Prisma raw SQL migration (`prisma migrate dev --create-only` then add raw SQL):

```sql
CREATE PUBLICATION powersync FOR TABLE
  workouts, workout_exercises, exercise_sets,
  cardio_sessions, laps,
  workout_templates, template_exercises, template_sets,
  body_metrics, personal_records, exercises;
```

Required PostgreSQL config: `wal_level=logical`.

## Client-Side Schema

New package `packages/sync/` defines the PowerSync client-side SQLite schema. PowerSync supports three column types: `text`, `integer`, `real`. The `id` column is automatic (text UUID).

### Data Type Mapping

| PostgreSQL Type | PowerSync Type | Notes |
|-----------------|---------------|-------|
| `uuid` | `text` | Stored as UUID string |
| `text`, `varchar` | `text` | |
| `integer`, `int` | `integer` | |
| `decimal`, `numeric` | `real` | Prisma `Decimal` → SQLite `real` |
| `boolean` | `integer` | `0` = false, `1` = true |
| `timestamp`, `date` | `text` | ISO 8601 string |
| `text[]` (PostgreSQL array) | `text` | JSON-stringified array; hooks must `JSON.parse()` to deserialize |
| `json`, `jsonb` | `text` | JSON-stringified; hooks must `JSON.parse()` |

### Nullable Fields

All PowerSync `column.*` types accept null values in SQLite. Columns that are nullable in Prisma (marked with `?`) will sync as `null`. Per-table nullable columns:

| Table | Nullable Columns |
|-------|-----------------|
| workouts | `name`, `completed_at`, `duration_seconds`, `notes`, `template_id` |
| workout_exercises | `notes` |
| exercise_sets | `weight_kg`, `reps`, `rpe`, `rest_seconds` |
| cardio_sessions | `distance_meters`, `elevation_gain_m`, `avg_heart_rate`, `max_heart_rate`, `calories`, `route_file_url`, `external_id`, `notes` |
| laps | `avg_heart_rate` |
| workout_templates | _(none)_ |
| template_exercises | `notes` |
| template_sets | `target_reps`, `target_weight_kg` |
| body_metrics | `weight_kg`, `body_fat_pct`, `measurements` |
| personal_records | `set_id` |
| exercises | `category`, `equipment`, `instructions`, `created_by_id` |

### Table Definitions

```typescript
import { column, Schema, Table } from '@powersync/web';

const workouts = new Table({
  user_id: column.text,
  name: column.text,
  started_at: column.text,
  completed_at: column.text,
  duration_seconds: column.integer,
  notes: column.text,
  template_id: column.text,
  created_at: column.text,
}, { indexes: { user: ['user_id'] } });

const workout_exercises = new Table({
  workout_id: column.text,
  exercise_id: column.text,
  order: column.integer,
  notes: column.text,
}, { indexes: { workout: ['workout_id'] } });

const exercise_sets = new Table({
  workout_exercise_id: column.text,
  set_number: column.integer,
  type: column.text,
  weight_kg: column.real,
  reps: column.integer,
  rpe: column.real,
  rest_seconds: column.integer,
  completed: column.integer,
}, { indexes: { exercise: ['workout_exercise_id'] } });

const cardio_sessions = new Table({
  user_id: column.text,
  type: column.text,
  source: column.text,
  started_at: column.text,
  duration_seconds: column.integer,
  distance_meters: column.real,
  elevation_gain_m: column.real,
  avg_heart_rate: column.integer,
  max_heart_rate: column.integer,
  calories: column.integer,
  route_file_url: column.text,
  external_id: column.text,
  notes: column.text,
  created_at: column.text,
}, { indexes: { user: ['user_id'] } });

const laps = new Table({
  session_id: column.text,
  lap_number: column.integer,
  distance_meters: column.real,
  duration_seconds: column.integer,
  avg_heart_rate: column.integer,
}, { indexes: { session: ['session_id'] } });

const workout_templates = new Table({
  user_id: column.text,
  name: column.text,
  created_at: column.text,
}, { indexes: { user: ['user_id'] } });

const template_exercises = new Table({
  template_id: column.text,
  exercise_id: column.text,
  order: column.integer,
  notes: column.text,
}, { indexes: { template: ['template_id'] } });

const template_sets = new Table({
  template_exercise_id: column.text,
  set_number: column.integer,
  target_reps: column.integer,
  target_weight_kg: column.real,
  type: column.text,
}, { indexes: { template_exercise: ['template_exercise_id'] } });

const body_metrics = new Table({
  user_id: column.text,
  date: column.text,
  weight_kg: column.real,
  body_fat_pct: column.real,
  measurements: column.text,   // JSON-stringified object
  created_at: column.text,
}, { indexes: { user: ['user_id'] } });

const personal_records = new Table({
  user_id: column.text,
  exercise_id: column.text,
  type: column.text,
  value: column.real,
  achieved_at: column.text,
  set_id: column.text,
  created_at: column.text,
}, { indexes: { user: ['user_id'], exercise: ['exercise_id'] } });

const exercises = new Table({
  name: column.text,
  category: column.text,
  primary_muscles: column.text,   // JSON-stringified string array
  secondary_muscles: column.text,  // JSON-stringified string array
  equipment: column.text,
  instructions: column.text,
  image_urls: column.text,         // JSON-stringified string array
  video_urls: column.text,         // JSON-stringified string array
  is_custom: column.integer,
  created_by_id: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({
  workouts,
  workout_exercises,
  exercise_sets,
  cardio_sessions,
  laps,
  workout_templates,
  template_exercises,
  template_sets,
  body_metrics,
  personal_records,
  exercises,
});

export type Database = (typeof AppSchema)['types'];
```

### Table Naming Convention

Both PostgreSQL (via Prisma `@@map`) and the PowerSync client schema use snake_case table names. The sync rules, the publication, and the client schema all reference the same snake_case names (`workouts`, `exercise_sets`, etc.), so no name mapping is needed.

## Package Structure

```
packages/sync/
├── package.json
├── src/
│   ├── schema.ts              # PowerSync client-side table definitions (above)
│   ├── connector.ts           # BackendConnector implementation
│   ├── index.ts               # Re-exports
│   └── sync-rules.yaml        # Sync Streams config (deployed to PowerSync service)
```

## Backend Connector & Write Path

### Auth Flow

1. Client calls `sync.getToken` tRPC **query** (no side effects — reads session, signs JWT)
2. Server signs a JWT with RSA private key: `{ sub: userId, aud: "powersync", exp: now + 5min }`
3. Returns `{ endpoint: POWERSYNC_URL, token: jwt }`
4. PowerSync Service validates via JWKS at `/api/auth/powersync/keys`
5. Token refreshes automatically — PowerSync SDK calls `fetchCredentials()` before expiry
6. Using a query (not mutation) is intentional — it allows tRPC deduplication but the short TTL prevents stale token issues

### Upload Queue Processing

The `uploadData` method on the backend connector processes local writes and routes them to the `sync` tRPC router:

```typescript
async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
  const transaction = await database.getNextCrudTransaction();
  if (!transaction) return;

  for (const op of transaction.crud) {
    const record = { id: op.id, ...op.opData };
    switch (op.op) {
      case UpdateType.PUT:
        await trpcClient.sync.apply.mutate({ table: op.table, record });
        break;
      case UpdateType.PATCH:
        await trpcClient.sync.update.mutate({ table: op.table, id: op.id, data: op.opData });
        break;
      case UpdateType.DELETE:
        await trpcClient.sync.delete.mutate({ table: op.table, id: op.id });
        break;
    }
  }
  await transaction.complete();
}
```

### Sync tRPC Router

A dedicated `sync` router handles upload queue operations. These are separate from existing routers because the upload queue sends individual row operations, while existing routers do complex orchestration (e.g., `workout.create` creates workout + exercises + sets + detects PRs).

```
sync.getToken   — (query) signs and returns a PowerSync JWT
sync.apply      — (mutation) upsert a row into any synced table (validates table name, enforces user_id scoping)
sync.update     — (mutation) partial update a row (validates ownership)
sync.delete     — (mutation) delete a row (validates ownership)
```

The `apply`, `update`, and `delete` mutations accept a `table` parameter and dynamically route to the correct Prisma model. Each mutation enforces that the `user_id` on the record matches the authenticated user.

### Error Handling

Error handling distinguishes between retryable and permanent failures:

- **Retryable errors** (network failure, transient DB errors, 5xx): Do NOT call `transaction.complete()`. PowerSync will automatically retry with exponential backoff.
- **Permanent errors** (validation failure, FK violation, auth mismatch): Log the failed operation to a `sync_errors` table for debugging, then call `transaction.complete()` to unblock the queue. The user sees the data locally but it won't persist server-side — a sync status warning surfaces this.

Upload endpoints return 2xx for successful persistence. Validation errors throw tRPC errors which the connector catches and handles as permanent failures.

### Conflict Resolution

Conflict resolution uses **last-write-wins at the row level**. When two devices modify the same row offline and both upload, the second upload's `sync.update` overwrites the first. This is acceptable for IronPulse because:

- Workouts are typically edited on one device at a time
- Sets are individual rows — editing different sets in the same workout does not conflict
- PowerSync's CRDT layer handles the sync ordering; the upload queue handles server persistence

Field-level merging is not implemented for MVP. If this proves insufficient (e.g., two devices editing different fields of the same workout simultaneously), field-level merge can be added to the `sync.update` mutation later.

## Dual-Layer Hooks

New hooks abstract PowerSync reads from tRPC-only operations. Pages swap from `trpc.workout.list.useQuery()` to `useWorkouts()`.

### Hook Layer

```
apps/web/src/hooks/
├── use-workouts.ts              # useQuery('SELECT * FROM workouts ORDER BY started_at DESC')
├── use-workout-detail.ts        # Joined query: workout + exercises + sets
├── use-cardio-sessions.ts       # useQuery('SELECT * FROM cardio_sessions ORDER BY started_at DESC')
├── use-cardio-detail.ts         # Session + laps
├── use-exercises.ts             # useQuery with search/filter params
├── use-templates.ts             # useQuery('SELECT * FROM workout_templates ...')
├── use-body-metrics.ts          # useQuery('SELECT * FROM body_metrics ORDER BY date DESC')
├── use-personal-records.ts      # useQuery('SELECT * FROM personal_records ...')
└── use-sync-status.ts           # useStatus() wrapper for UI indicator
```

Hooks use `useQuery` from `@powersync/react` which returns `{ data, isLoading, error }` — reactive, re-renders when local data changes.

### What Stays on tRPC

| Operation | Reason |
|-----------|--------|
| `analytics.weeklyVolume` | Server-computed aggregation |
| `analytics.personalRecords` | Server-computed history |
| `analytics.bodyWeightTrend` | Server-computed trend |
| `cardio.getRoutePoints` | Large dataset, fetched on-demand |
| `cardio.importGpx` | Server-side file parsing |
| `stripe.*` | Billing |
| `auth.*` | Authentication |
| `user.*` | Profile management |

### Write Operations

Pages write directly to the local PowerSync database instead of calling tRPC mutations:

```typescript
const db = usePowerSync();
const id = crypto.randomUUID();
await db.execute(
  'INSERT INTO workouts (id, user_id, name, started_at) VALUES (?, ?, ?, ?)',
  [id, userId, name, new Date().toISOString()]
);
```

The upload queue handles syncing to the server automatically.

### Pages Impacted

All data-fetching pages swap from tRPC queries to PowerSync hooks:

- `/workouts`, `/workouts/[id]`, `/workouts/new` — reads + writes via PowerSync
- `/cardio`, `/cardio/[id]` — reads via PowerSync; `/cardio/new` manual writes via PowerSync, GPX import stays tRPC
- `/dashboard` — activity feed + weekly stats read from PowerSync hooks
- `/calendar` — reads from PowerSync hooks
- `/stats` — body metrics from PowerSync hooks, analytics stay tRPC
- `/exercises` — reads from PowerSync hooks, custom exercise creation via PowerSync
- `/templates` — reads + writes via PowerSync

## Web App Integration

### PowerSync Initialization

```
apps/web/src/lib/powersync/
├── system.ts         # PowerSyncDatabase singleton, connect/disconnect
└── provider.tsx      # PowerSyncContext.Provider wrapper ('use client')
```

`system.ts` creates the `PowerSyncDatabase` instance with the schema from `@ironpulse/sync` and a `WASQLiteOpenFactory`. The provider calls `connect(connector)` when the user session exists and `disconnect()` on sign-out.

### Next.js Configuration

- `next.config.ts`: Enable `asyncWebAssembly: true` and `topLevelAwait: true` in webpack config
- `package.json`: Add postinstall script `powersync-web copy-assets -o public`
- `.gitignore`: Add `public/@powersync/`
- All PowerSync components use `'use client'` directive
- `PowerSyncDatabase` flags: `{ disableSSRWarning: true }`

### Sync Status Indicator

A small component in the app shell shows connection state (syncing / synced / offline) using `useStatus()` from `@powersync/react`.

## Infrastructure

### Development (PowerSync Cloud)

Connect to PowerSync Cloud free tier during local development. Sync rules deployed via PowerSync dashboard or CLI.

```env
NEXT_PUBLIC_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com
POWERSYNC_PRIVATE_KEY=<RSA private key for JWT signing>
POWERSYNC_PUBLIC_KEY=<RSA public key for JWKS endpoint>
```

### Production Self-Hosted (Docker Compose)

Add to `docker/docker-compose.yml`:

```yaml
mongo:
  image: mongo:7-jammy
  command: ["--replSet", "rs0"]
  volumes:
    - mongodata:/data/db
  healthcheck:
    test: mongosh --eval "rs.status()" --quiet
    interval: 10s
    retries: 5
  restart: unless-stopped

mongo-init:
  image: mongo:7-jammy
  depends_on:
    mongo:
      condition: service_healthy
  command: mongosh --host mongo --eval "rs.initiate()"
  restart: "no"

powersync:
  image: journeyapps/powersync-service:latest
  depends_on:
    postgres:
      condition: service_healthy
    mongo:
      condition: service_healthy
  volumes:
    - ./powersync.yaml:/app/config/powersync.yaml
    - ./sync-rules.yaml:/app/config/sync-rules.yaml
  environment:
    PS_DATA_SOURCE_URI: postgresql://ironpulse:ironpulse@postgres:5432/ironpulse
    PS_MONGO_URI: mongodb://mongo:27017/powersync
  ports:
    - "8080:80"
  restart: unless-stopped
```

### PowerSync Service Configuration (`docker/powersync.yaml`)

```yaml
replication:
  connections:
    - type: postgresql
      uri: !env PS_DATA_SOURCE_URI
      sslmode: disable

storage:
  type: mongodb
  uri: !env PS_MONGO_URI

client_auth:
  jwks_uri: http://ironpulse:3000/api/auth/powersync/keys
  audience: ["powersync"]

sync_config:
  path: /app/config/sync-rules.yaml

port: 80
```

### PostgreSQL Changes

Enable logical replication:

```yaml
postgres:
  image: postgis/postgis:16-3.4-alpine
  command: ["postgres", "-c", "wal_level=logical"]
```

The publication is created via a Prisma raw SQL migration (same as defined in the Sync Rules section above).

### JWKS Endpoint

New Next.js API route at `/api/auth/powersync/keys` serves the RSA public key in JWKS format for PowerSync Service JWT validation.

### CI/CD

No changes needed. Sync router tests hit PostgreSQL directly. Hook tests use in-memory PowerSync database. No PowerSync service required in GitHub Actions.

## Testing Strategy

### Unit Tests (Vitest)

| What | How |
|------|-----|
| Sync router mutations | Real PostgreSQL test caller. Verify upsert/update/delete, auth scoping, validation. |
| JWT token generation | Verify token structure, claims (`sub`, `aud`, `exp`), correct signing key. |
| Backend connector `uploadData` | Mock `getNextCrudTransaction()`, verify correct tRPC mutations called per table/operation. |
| Dual-layer hooks | In-memory PowerSync test database. Verify SQL queries return expected shapes. |
| PowerSync client schema | Validate schema matches sync rules — table names, column names, column types. |

### Integration Tests (Vitest, real PostgreSQL)

| What | How |
|------|-----|
| Upload queue round-trip | Write to local DB → `uploadData()` → sync router → verify row in PostgreSQL. |
| JWKS endpoint | Hit `/api/auth/powersync/keys`, verify valid JWKS JSON validates tokens from `sync.getToken`. |

### E2E (post-MVP)

Offline-first E2E (create workout offline → reconnect → verify sync) requires network manipulation. Covered manually for MVP; automated E2E added with the broader test suite later.

### Test Files

```
packages/sync/src/__tests__/
├── schema.test.ts              # Schema shape validation
└── connector.test.ts           # uploadData routing logic

packages/api/__tests__/
├── sync.test.ts                # Sync router mutations (real DB)
└── powersync-auth.test.ts      # JWT + JWKS tests

apps/web/src/hooks/__tests__/
├── use-workouts.test.ts        # Hook SQL query tests
├── use-cardio-sessions.test.ts
└── use-exercises.test.ts
```
