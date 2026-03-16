# Apple HealthKit Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bidirectional sync between IronPulse and Apple HealthKit on iOS — read workouts and body weight from HealthKit, write IronPulse cardio sessions and weight logs to HealthKit.

**Architecture:** On-device only, no backend changes. A `HealthKitService` module in `apps/mobile/lib/healthkit.ts` handles all HealthKit interactions. Reads write to PowerSync local SQLite. Writes push to HealthKit on session completion. Dedup via source bundle check + external ID. Connected Apps screen shows HealthKit card on iOS only.

**Tech Stack:** `react-native-health`, `expo-secure-store`, `@powersync/react`, Expo custom dev client

**Spec:** `docs/superpowers/specs/2026-03-16-apple-healthkit-design.md`

---

## File Structure

```
apps/mobile/
├── lib/
│   ├── healthkit.ts                        # CREATE — HealthKitService
│   └── __tests__/
│       └── healthkit.test.ts               # CREATE — type mapping + dedup tests
├── app/
│   ├── _layout.tsx                         # MODIFY — trigger HealthKit sync on auth
│   ├── settings/
│   │   └── integrations.tsx                # MODIFY — add HealthKit card (iOS only)
│   └── (tabs)/
│       └── stats.tsx                       # MODIFY — write weight to HealthKit
├── app/cardio/
│   ├── tracking.tsx                        # MODIFY — write GPS session to HealthKit
│   └── manual.tsx                          # MODIFY — write manual session to HealthKit
├── app.json                                # MODIFY — add HealthKit usage descriptions
└── e2e/
    └── healthkit.yaml                      # CREATE
```

---

## Chunk 1: HealthKit Service + Tests

### Task 1: Install react-native-health + Config

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Install dependency**

Run: `pnpm --filter @ironpulse/mobile add react-native-health`

- [ ] **Step 2: Update app.json**

Add to `apps/mobile/app.json` in the `ios` section:

```json
"infoPlist": {
  "NSHealthShareUsageDescription": "IronPulse reads your workouts and body weight from Apple Health to show them in your activity feed.",
  "NSHealthUpdateUsageDescription": "IronPulse saves your logged workouts and weight to Apple Health."
}
```

Add `"react-native-health"` to the `plugins` array if required by the library.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json pnpm-lock.yaml
git commit -m "add react-native-health dependency and HealthKit usage descriptions"
```

### Task 2: HealthKit Type Mapping + Dedup (TDD)

**Files:**
- Create: `apps/mobile/lib/__tests__/healthkit.test.ts`
- Create: `apps/mobile/lib/healthkit.ts`

- [ ] **Step 1: Write tests**

Create `apps/mobile/lib/__tests__/healthkit.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  mapHealthKitTypeToIronPulse,
  mapIronPulseTypeToHealthKit,
  makeExternalId,
  shouldSkipImport,
} from "../healthkit";

describe("mapHealthKitTypeToIronPulse", () => {
  it("maps Running to run", () => expect(mapHealthKitTypeToIronPulse("Running")).toBe("run"));
  it("maps Cycling to cycle", () => expect(mapHealthKitTypeToIronPulse("Cycling")).toBe("cycle"));
  it("maps Swimming to swim", () => expect(mapHealthKitTypeToIronPulse("Swimming")).toBe("swim"));
  it("maps Hiking to hike", () => expect(mapHealthKitTypeToIronPulse("Hiking")).toBe("hike"));
  it("maps Walking to walk", () => expect(mapHealthKitTypeToIronPulse("Walking")).toBe("walk"));
  it("maps unknown to other", () => expect(mapHealthKitTypeToIronPulse("Yoga")).toBe("other"));
});

describe("mapIronPulseTypeToHealthKit", () => {
  it("maps run to Running", () => expect(mapIronPulseTypeToHealthKit("run")).toBe("Running"));
  it("maps cycle to Cycling", () => expect(mapIronPulseTypeToHealthKit("cycle")).toBe("Cycling"));
  it("maps other to Other", () => expect(mapIronPulseTypeToHealthKit("other")).toBe("Other"));
});

describe("makeExternalId", () => {
  it("creates healthkit: prefixed ID", () => {
    expect(makeExternalId("abc-123")).toBe("healthkit:abc-123");
  });
});

describe("shouldSkipImport", () => {
  it("skips our own bundle", () => {
    expect(shouldSkipImport("com.ironpulse.app")).toBe(true);
  });
  it("does not skip other bundles", () => {
    expect(shouldSkipImport("com.apple.health")).toBe(false);
  });
  it("does not skip undefined", () => {
    expect(shouldSkipImport(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd apps/mobile && npx vitest run -- healthkit`
Expected: FAIL — module not found

- [ ] **Step 3: Implement HealthKit service**

Create `apps/mobile/lib/healthkit.ts`:

```typescript
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const APP_BUNDLE_ID = "com.ironpulse.app";

// Type mappings
const HK_TO_IP: Record<string, string> = {
  Running: "run", Cycling: "cycle", Swimming: "swim",
  Hiking: "hike", Walking: "walk",
};

const IP_TO_HK: Record<string, string> = {
  run: "Running", cycle: "Cycling", swim: "Swimming",
  hike: "Hiking", walk: "Walking", other: "Other",
};

export function mapHealthKitTypeToIronPulse(hkType: string): string {
  return HK_TO_IP[hkType] ?? "other";
}

export function mapIronPulseTypeToHealthKit(ipType: string): string {
  return IP_TO_HK[ipType] ?? "Other";
}

export function makeExternalId(hkUUID: string): string {
  return `healthkit:${hkUUID}`;
}

export function shouldSkipImport(sourceBundle: string | undefined): boolean {
  return sourceBundle === APP_BUNDLE_ID;
}

export async function isHealthKitAvailable(): Promise<boolean> {
  return Platform.OS === "ios";
}

export async function isHealthKitConnected(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  const enabled = await SecureStore.getItemAsync("healthkit_enabled");
  return enabled === "true";
}

export async function setHealthKitEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync("healthkit_enabled", enabled ? "true" : "false");
}

export async function getLastSyncTimestamp(): Promise<string> {
  return (await SecureStore.getItemAsync("healthkit_last_sync")) ?? "1970-01-01T00:00:00.000Z";
}

export async function setLastSyncTimestamp(): Promise<void> {
  await SecureStore.setItemAsync("healthkit_last_sync", new Date().toISOString());
}

// HealthKit SDK interactions — these require react-native-health
// They are wrapped in try/catch and only called on iOS

let AppleHealthKit: any = null;

function getHealthKit() {
  if (!AppleHealthKit && Platform.OS === "ios") {
    try {
      AppleHealthKit = require("react-native-health").default;
    } catch {
      // Not available (e.g., in test environment)
    }
  }
  return AppleHealthKit;
}

export async function requestPermissions(): Promise<boolean> {
  const hk = getHealthKit();
  if (!hk) return false;

  return new Promise((resolve) => {
    const permissions = {
      permissions: {
        read: [
          hk.Constants.Permissions.Workout,
          hk.Constants.Permissions.BodyMass,
        ],
        write: [
          hk.Constants.Permissions.Workout,
          hk.Constants.Permissions.BodyMass,
          hk.Constants.Permissions.ActiveEnergyBurned,
        ],
      },
    };

    hk.initHealthKit(permissions, (error: any) => {
      resolve(!error);
    });
  });
}

export async function queryWorkouts(since: string): Promise<any[]> {
  const hk = getHealthKit();
  if (!hk) return [];

  return new Promise((resolve) => {
    hk.getSamples(
      {
        typeIdentifier: "HKWorkoutTypeIdentifier",
        startDate: since,
        endDate: new Date().toISOString(),
      },
      (error: any, results: any[]) => {
        resolve(error ? [] : results ?? []);
      }
    );
  });
}

export async function queryBodyMass(since: string): Promise<any[]> {
  const hk = getHealthKit();
  if (!hk) return [];

  return new Promise((resolve) => {
    hk.getWeightSamples(
      {
        startDate: since,
        endDate: new Date().toISOString(),
        ascending: false,
      },
      (error: any, results: any[]) => {
        resolve(error ? [] : results ?? []);
      }
    );
  });
}

export async function saveWorkout(opts: {
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  distance?: number;
  calories?: number;
}): Promise<void> {
  const hk = getHealthKit();
  if (!hk) return;

  return new Promise((resolve, reject) => {
    hk.saveWorkout(
      {
        type: mapIronPulseTypeToHealthKit(opts.type),
        startDate: opts.startDate,
        endDate: opts.endDate,
        duration: opts.duration,
        totalDistance: opts.distance,
        totalEnergyBurned: opts.calories,
      },
      (error: any) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

export async function saveWeight(weightKg: number, date: string): Promise<void> {
  const hk = getHealthKit();
  if (!hk) return;

  return new Promise((resolve, reject) => {
    hk.saveWeight(
      { value: weightKg, startDate: date },
      (error: any) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

export async function syncFromHealthKit(
  db: any,
  userId: string
): Promise<void> {
  if (!(await isHealthKitConnected())) return;

  const lastSync = await getLastSyncTimestamp();

  // 1. Sync workouts
  const workouts = await queryWorkouts(lastSync);
  for (const workout of workouts) {
    if (shouldSkipImport(workout.sourceBundle)) continue;

    const externalId = makeExternalId(workout.id ?? workout.uuid ?? `${workout.start}-${workout.end}`);

    // Dedup check
    const existing = await db.execute(
      "SELECT id FROM cardio_sessions WHERE external_id = ?",
      [externalId]
    );
    if (existing.rows?._array?.length > 0) continue;

    const type = mapHealthKitTypeToIronPulse(workout.activityName ?? "Other");
    const durationSeconds = Math.round(
      (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 1000
    );

    await db.execute(
      `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, calories, external_id, created_at)
       VALUES (?, ?, ?, 'apple_health', ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        userId,
        type,
        workout.start,
        durationSeconds,
        workout.distance ?? null,
        workout.calories ?? null,
        externalId,
        new Date().toISOString(),
      ]
    );
  }

  // 2. Sync body weight
  const weights = await queryBodyMass(lastSync);
  for (const sample of weights) {
    if (shouldSkipImport(sample.sourceBundle)) continue;

    const date = new Date(sample.startDate ?? sample.start).toISOString().split("T")[0];
    const existing = await db.execute(
      "SELECT id FROM body_metrics WHERE user_id = ? AND date = ?",
      [userId, date]
    );
    if (existing.rows?._array?.length > 0) continue;

    await db.execute(
      `INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, date, sample.value, new Date().toISOString()]
    );
  }

  // 3. Update sync timestamp
  await setLastSyncTimestamp();
}

export async function writeCardioToHealthKit(session: {
  type: string;
  started_at: string;
  duration_seconds: number;
  distance_meters?: number | null;
  calories?: number | null;
}): Promise<void> {
  if (!(await isHealthKitConnected())) return;

  try {
    const endDate = new Date(
      new Date(session.started_at).getTime() + session.duration_seconds * 1000
    ).toISOString();

    await saveWorkout({
      type: session.type,
      startDate: session.started_at,
      endDate,
      duration: session.duration_seconds,
      distance: session.distance_meters ?? undefined,
      calories: session.calories ?? undefined,
    });
  } catch (err) {
    console.error("Failed to write workout to HealthKit:", err);
  }
}

export async function writeWeightToHealthKit(
  weightKg: number,
  date: string
): Promise<void> {
  if (!(await isHealthKitConnected())) return;

  try {
    await saveWeight(weightKg, date);
  } catch (err) {
    console.error("Failed to write weight to HealthKit:", err);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/mobile && npx vitest run -- healthkit`
Expected: PASS — all type mapping and dedup tests pass (HealthKit SDK calls are behind lazy `require` and won't be called in test env)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/healthkit.ts apps/mobile/lib/__tests__/healthkit.test.ts
git commit -m "add HealthKit service with type mapping, dedup, and sync logic"
```

---

## Chunk 2: UI Integration + Writes

### Task 3: Add HealthKit Card to Connected Apps

**Files:**
- Modify: `apps/mobile/app/settings/integrations.tsx`

- [ ] **Step 1: Add HealthKit card**

Read the current `apps/mobile/app/settings/integrations.tsx` file. Add a HealthKit card below the Strava card, guarded by `Platform.OS === "ios"`:

- Import `{ isHealthKitAvailable, isHealthKitConnected, setHealthKitEnabled, requestPermissions, syncFromHealthKit, getLastSyncTimestamp }` from `@/lib/healthkit`
- Add state: `healthKitConnected`, `healthKitLastSync`, loading states
- On mount (useEffect): check `isHealthKitAvailable()` and `isHealthKitConnected()`, read last sync timestamp
- "Connect" button: calls `requestPermissions()`, if success then `setHealthKitEnabled(true)` + run initial sync via `syncFromHealthKit(db, userId)`
- "Disconnect" button: calls `setHealthKitEnabled(false)`
- "Sync Now" button: calls `syncFromHealthKit(db, userId)` + updates last sync display
- Card shows Apple Health icon, connection status, last synced timestamp

Import `usePowerSync` from `@powersync/react` for the db instance and `useAuth` for userId.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/settings/integrations.tsx
git commit -m "add HealthKit card to Connected Apps screen (iOS only)"
```

### Task 4: Write Cardio Sessions to HealthKit

**Files:**
- Modify: `apps/mobile/app/cardio/tracking.tsx`
- Modify: `apps/mobile/app/cardio/manual.tsx`

- [ ] **Step 1: Add HealthKit write to GPS tracking stop**

In `apps/mobile/app/cardio/tracking.tsx`, after the session is saved and the stop handler completes, add:

```typescript
import { writeCardioToHealthKit } from "@/lib/healthkit";

// After updating cardio_sessions and before navigating to summary:
writeCardioToHealthKit({
  type: type!,
  started_at: startedAt!,
  duration_seconds: elapsed,
  distance_meters: distanceMeters,
  calories: null,
}).catch(() => {}); // fire and forget
```

- [ ] **Step 2: Add HealthKit write to manual cardio save**

In `apps/mobile/app/cardio/manual.tsx`, after `db.execute(INSERT INTO cardio_sessions ...)`, add:

```typescript
import { writeCardioToHealthKit } from "@/lib/healthkit";

// After the INSERT, before navigating to summary:
writeCardioToHealthKit({
  type: type!,
  started_at: now,
  duration_seconds: durationSeconds,
  distance_meters: distanceMeters || null,
  calories: calories ? parseInt(calories) : null,
}).catch(() => {});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/cardio/tracking.tsx apps/mobile/app/cardio/manual.tsx
git commit -m "write cardio sessions to HealthKit on completion"
```

### Task 5: Write Weight to HealthKit + Trigger Sync on Launch

**Files:**
- Modify: `apps/mobile/app/(tabs)/stats.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Add HealthKit write to weight logging**

In `apps/mobile/app/(tabs)/stats.tsx`, after the weight is saved to PowerSync (`db.execute(INSERT INTO body_metrics ...)`), add:

```typescript
import { writeWeightToHealthKit } from "@/lib/healthkit";

// After the INSERT:
writeWeightToHealthKit(parseFloat(weight), today).catch(() => {});
```

Where `today` is the date string used in the INSERT and `weight` is the user's input value.

- [ ] **Step 2: Trigger HealthKit sync on authenticated launch**

In `apps/mobile/app/_layout.tsx`, in the `RootNavigator` component, after PowerSync connects (the `useEffect` that runs when `user` changes), add:

```typescript
import { syncFromHealthKit, isHealthKitConnected } from "@/lib/healthkit";

// Inside the useEffect where db.connect(connector) is called, after connect:
if (user) {
  const connector = createMobileConnector();
  db.connect(connector);

  // HealthKit sync on launch (fire and forget)
  isHealthKitConnected().then((connected) => {
    if (connected) {
      syncFromHealthKit(db, user.id).catch((err) =>
        console.error("HealthKit sync error:", err)
      );
    }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/stats.tsx apps/mobile/app/_layout.tsx
git commit -m "write weight to HealthKit and trigger sync on app launch"
```

---

## Chunk 3: E2E + Verification

### Task 6: Maestro E2E + Verification

**Files:**
- Create: `apps/mobile/e2e/healthkit.yaml`

- [ ] **Step 1: Create E2E flow**

Create `apps/mobile/e2e/healthkit.yaml`:

```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Good morning"
- tapOn: "Profile"
- tapOn: "Connected Apps"
- assertVisible: "Apple Health"
```

- [ ] **Step 2: Run tests**

Run: `cd apps/mobile && npx vitest run`
Expected: All tests pass (healthkit + geo-utils)

- [ ] **Step 3: Verify web build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds (no web changes, just verify nothing broke)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/e2e/healthkit.yaml
git commit -m "add HealthKit Maestro E2E flow and verify builds"
```
