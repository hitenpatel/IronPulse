# Apple HealthKit Integration — Design Specification

Bidirectional sync between IronPulse and Apple HealthKit on iOS. Reads workouts and body weight from HealthKit, writes IronPulse cardio sessions and weight logs to HealthKit. On-device only — no backend changes.

## Scope

- HealthKit permission request and connection management
- Read HKWorkout samples → create CardioSession rows via PowerSync
- Read body mass samples → create BodyMetric rows via PowerSync
- Write IronPulse cardio sessions to HealthKit on completion
- Write body weight logs to HealthKit on save
- HKObserverQuery for near real-time sync when other apps write workouts
- Dedup to prevent bidirectional import loops
- HealthKit card on Connected Apps screen (iOS only)
- iOS only — hidden on Android

## Out of Scope

- Route data from HealthKit (HKWorkoutRoute queries are complex — defer)
- Heart rate / steps / active energy reads (not in IronPulse's current data model)
- Strength workout writes to HealthKit (HealthKit doesn't model sets/reps/weight)
- Android (no HealthKit equivalent — Google Fit is a separate spec)

## Architecture

Entirely on-device. No backend changes, no new API routes, no new Prisma models.

```
┌──────────────────────────────────────────┐
│  IronPulse iOS App                        │
│                                           │
│  HealthKitService                         │
│  ┌───────────────────────────────────┐   │
│  │ requestPermissions()              │   │
│  │ syncFromHealthKit()               │   │
│  │ writeWorkoutToHealthKit()         │   │
│  │ writeWeightToHealthKit()          │   │
│  │ startObserver()                   │   │
│  └───────────┬───────────────────────┘   │
│              │                            │
│       ┌──────┴──────┐                     │
│       ▼             ▼                     │
│  HealthKit API   PowerSync SQLite         │
│  (on-device)     (local writes)           │
│                     │                     │
└─────────────────────┼─────────────────────┘
                      │ syncs via PowerSync
                      ▼
               PostgreSQL (server)
```

Data flows:
- **Read:** HealthKit → HealthKitService → `db.execute(INSERT INTO cardio_sessions/body_metrics)` → PowerSync syncs to server
- **Write:** IronPulse completion → HealthKitService → HealthKit API
- **Observer:** HealthKit notifies app → trigger `syncFromHealthKit()`

## Permissions

Requested when user taps "Connect" on Connected Apps screen:

**Read permissions:**
- `HKWorkoutType` — workout sessions (running, cycling, etc.)
- `HKQuantityType.bodyMass` — body weight

**Write permissions:**
- `HKWorkoutType` — write IronPulse cardio sessions
- `HKQuantityType.bodyMass` — write weight logs
- `HKQuantityType.activeEnergyBurned` — calories burned (written as part of workout)

iOS shows a system permission sheet. User can selectively grant/deny each type. The app handles partial permissions gracefully — if read is denied, don't sync inbound; if write is denied, don't export.

Note: iOS does not tell the app whether read permission was granted (privacy design). The app can only attempt to read and handle empty results.

## Reading from HealthKit

### Sync Trigger

1. **On app launch:** if HealthKit is connected, call `syncFromHealthKit()`
2. **Observer:** register `HKObserverQuery` for `HKWorkoutType` on app start. Fires when any app writes a new workout (e.g., Apple Watch completes a run).

### Sync Flow

```typescript
async function syncFromHealthKit(db, userId):
  lastSync = await SecureStore.getItemAsync("healthkit_last_sync") ?? "1970-01-01"

  // 1. Read workouts
  workouts = await queryHealthKitWorkouts(since: lastSync)
  for workout in workouts:
    // Skip our own writes
    if workout.sourceBundle === "com.ironpulse.app": continue

    // Dedup
    externalId = "healthkit:" + workout.uuid
    existing = await db.execute("SELECT id FROM cardio_sessions WHERE external_id = ?", [externalId])
    if existing.length > 0: continue

    // Map and insert
    type = mapHealthKitType(workout.workoutActivityType)
    await db.execute(
      "INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, calories, external_id, created_at) VALUES (?, ?, ?, 'apple_health', ?, ?, ?, ?, ?, ?)",
      [uuid(), userId, type, workout.startDate, workout.duration, workout.totalDistance, workout.totalEnergyBurned, externalId, now()]
    )

  // 2. Read body weight
  weights = await queryHealthKitBodyMass(since: lastSync)
  for sample in weights:
    if sample.sourceBundle === "com.ironpulse.app": continue
    date = sample.startDate.toISOString().split("T")[0]
    // body_metrics has @@unique([userId, date]) — use upsert-like logic
    existing = await db.execute("SELECT id FROM body_metrics WHERE user_id = ? AND date = ?", [userId, date])
    if existing.length === 0:
      await db.execute(
        "INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at) VALUES (?, ?, ?, ?, ?)",
        [uuid(), userId, date, sample.quantity, now()]
      )

  // 3. Update sync timestamp
  await SecureStore.setItemAsync("healthkit_last_sync", new Date().toISOString())
```

### Activity Type Mapping

| HealthKit `workoutActivityType` | IronPulse `type` |
|--------------------------------|------------------|
| `.running` | run |
| `.cycling` | cycle |
| `.swimming` | swim |
| `.hiking` | hike |
| `.walking` | walk |
| * (all other) | other |

## Writing to HealthKit

### Cardio Session Write

After a cardio session completes (GPS or manual) and the user sees the summary:

```typescript
async function writeWorkoutToHealthKit(session):
  if !isHealthKitConnected(): return

  const workout = HKWorkout(
    activityType: mapToHealthKitType(session.type),
    startDate: session.started_at,
    endDate: new Date(started_at + duration_seconds * 1000),
    duration: session.duration_seconds,
    totalDistance: session.distance_meters ? HKQuantity(meters) : undefined,
    totalEnergyBurned: session.calories ? HKQuantity(kilocalories) : undefined,
    metadata: { ironpulse_session_id: session.id }
  )

  await saveToHealthKit(workout)
```

### Body Weight Write

After user logs weight on the Stats screen:

```typescript
async function writeWeightToHealthKit(weightKg, date):
  if !isHealthKitConnected(): return

  const sample = HKQuantitySample(
    type: .bodyMass,
    quantity: HKQuantity(kg: weightKg),
    startDate: date,
    endDate: date,
    metadata: { source: "ironpulse" }
  )

  await saveToHealthKit(sample)
```

### IronPulse Type → HealthKit Mapping

| IronPulse `type` | HealthKit `workoutActivityType` |
|-----------------|-------------------------------|
| run | `.running` |
| cycle | `.cycling` |
| swim | `.swimming` |
| hike | `.hiking` |
| walk | `.walking` |
| other | `.other` |

## Dedup — Preventing Import Loops

Three layers of dedup:

1. **Source bundle check:** When reading from HealthKit, skip samples where `sourceBundle === "com.ironpulse.app"` (our own writes).
2. **External ID check:** Each imported workout gets `externalId = "healthkit:{UUID}"`. Before importing, check if this externalId already exists in `cardio_sessions`.
3. **Metadata tag:** When writing to HealthKit, include `metadata.ironpulse_session_id` so the write is identifiable.

## Connection State

HealthKit connection state is tracked locally (no DeviceConnection row needed since there are no tokens):

| Key | Storage | Purpose |
|-----|---------|---------|
| `healthkit_enabled` | `expo-secure-store` | Whether user has connected HealthKit (`"true"` / `"false"`) |
| `healthkit_last_sync` | `expo-secure-store` | ISO timestamp of last successful sync |

**Connect flow:**
1. Request HealthKit permissions via SDK
2. Set `healthkit_enabled = "true"` in secure store
3. Run initial sync (read all workouts from last 30 days)
4. Register HKObserverQuery

**Disconnect flow:**
1. Set `healthkit_enabled = "false"` in secure store
2. Stop observer query
3. Cannot revoke iOS permissions programmatically — just stop reading/writing

**Checking connection:**
- `isHealthKitConnected()` checks `healthkit_enabled` from secure store AND `Platform.OS === "ios"`

## Connected Apps UI

Add HealthKit card to the existing Connected Apps screen (`apps/mobile/app/settings/integrations.tsx`):

- Only shown when `Platform.OS === "ios"`
- Apple Health icon + "Apple Health" label
- Status: "Connected" or "Not connected"
- If connected: last synced timestamp, "Sync Now" button, "Disconnect" button
- "Connect" calls `requestPermissions()` then runs initial sync
- "Disconnect" calls `setHealthKitEnabled(false)`

No web UI needed — HealthKit is iOS only.

## Integration with Existing Flows

### Cardio Completion

Modify the cardio summary flow (`apps/mobile/app/cardio/summary.tsx` or the tracking screen's stop handler):
- After saving the cardio session, call `writeWorkoutToHealthKit(session)` if connected
- Fire and forget — don't block the UX on HealthKit write

### Weight Logging

Modify the stats screen weight log handler (`apps/mobile/app/(tabs)/stats.tsx`):
- After `db.execute(INSERT INTO body_metrics ...)`, call `writeWeightToHealthKit(weightKg, date)` if connected

### Dashboard Sync

Modify the dashboard screen or root layout (`apps/mobile/app/_layout.tsx`):
- On authenticated mount, if HealthKit connected, call `syncFromHealthKit()` and `startObserver()`

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-health` | HealthKit SDK wrapper for React Native |

Requires Expo custom dev client (not Expo Go) since `react-native-health` uses native modules.

Add to `app.json` `ios.infoPlist`:
```json
"NSHealthShareUsageDescription": "IronPulse reads your workouts and body weight from Apple Health to show them in your activity feed.",
"NSHealthUpdateUsageDescription": "IronPulse saves your logged workouts and weight to Apple Health."
```

## File Structure

```
apps/mobile/
├── lib/
│   └── healthkit.ts                        # CREATE — HealthKitService
├── app/
│   ├── _layout.tsx                         # MODIFY — trigger HealthKit sync on auth
│   ├── settings/
│   │   └── integrations.tsx                # MODIFY — add HealthKit card (iOS only)
│   └── (tabs)/
│       └── stats.tsx                       # MODIFY — write weight to HealthKit
├── app/cardio/
│   ├── tracking.tsx                        # MODIFY — write GPS session to HealthKit on stop
│   └── manual.tsx                          # MODIFY — write manual session to HealthKit on save
└── e2e/
    └── healthkit.yaml                      # CREATE — limited Maestro flow
```

## Testing

### Unit Tests

| What | File |
|------|------|
| Activity type mapping (both directions) | `apps/mobile/lib/__tests__/healthkit.test.ts` |
| Dedup logic (external ID generation) | `apps/mobile/lib/__tests__/healthkit.test.ts` |

### Manual Testing

HealthKit cannot be tested in simulator with mock data easily. Manual test on real device:
1. Connect HealthKit → verify permissions sheet appears
2. Log a run on Apple Watch → verify it appears in IronPulse dashboard
3. Log a cardio session in IronPulse → verify it appears in Apple Health
4. Log weight in IronPulse → verify it appears in Apple Health
5. Disconnect → verify no more syncing

### Maestro E2E

Limited — can verify the HealthKit card renders on iOS:

```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- tapOn: "Profile"
- tapOn: "Connected Apps"
- assertVisible: "Apple Health"
```

Cannot test actual HealthKit interaction in Maestro.

## Known Limitations

- **No route data:** HealthKit's `HKWorkoutRoute` API requires async enumeration of CLLocation objects. Complex to implement and the UX benefit is limited (users can view routes in Apple Health directly). Deferred.
- **Read permission opacity:** iOS does not tell apps whether read permission was granted. If denied, HealthKit queries return empty results silently. The app cannot show a "permission denied" warning for reads.
- **Observer requires custom dev client:** `HKObserverQuery` background delivery requires the `com.apple.developer.healthkit.background-delivery` entitlement, which needs a custom Expo dev client build. For MVP, sync on app launch is sufficient; observer can be added later.
