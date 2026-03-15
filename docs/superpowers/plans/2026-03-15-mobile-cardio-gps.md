# Mobile Cardio + GPS Live Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build manual cardio logging and GPS live tracking for the IronPulse Expo mobile app — type picker, manual form, live tracking screen with map, background GPS, route point buffering, app-kill recovery, and cardio summary.

**Architecture:** Cardio screens under `app/cardio/` (fullscreen stack outside tabs). GPS tracking via `expo-location` foreground watch + `TaskManager` background updates. Route points buffered in a local `_gps_buffer` SQLite table, uploaded to server on completion via tRPC. Manual cardio writes directly to PowerSync `cardio_sessions`. Shared summary screen for both flows.

**Tech Stack:** `expo-location`, `expo-task-manager`, `expo-battery`, `react-native-maps`, `expo-sqlite`, `@powersync/react`, tRPC

**Spec:** `docs/superpowers/specs/2026-03-15-mobile-cardio-gps-design.md`

---

## File Structure

```
apps/mobile/
├── app/cardio/
│   ├── _layout.tsx                     # CREATE — fullscreen stack
│   ├── type-picker.tsx                 # CREATE — activity type grid + GPS/manual choice
│   ├── tracking.tsx                    # CREATE — live GPS tracking screen
│   ├── manual.tsx                      # CREATE — manual cardio form
│   └── summary.tsx                     # CREATE — shared completion summary
├── components/cardio/
│   ├── type-card.tsx                   # CREATE — activity type card
│   ├── live-stats-bar.tsx              # CREATE — duration/distance/pace display
│   └── route-map.tsx                   # CREATE — MapView with polyline
├── components/layout/
│   └── new-session-sheet.tsx           # MODIFY — add onLogCardio callback
├── app/(tabs)/
│   └── _layout.tsx                     # MODIFY — wire onLogCardio
├── lib/
│   ├── gps-task.ts                     # CREATE — TaskManager background task
│   ├── gps-buffer.ts                   # CREATE — SQLite buffer CRUD
│   ├── geo-utils.ts                    # CREATE — Haversine, pace, conversion
│   └── __tests__/
│       └── geo-utils.test.ts           # CREATE — unit tests
├── app.json                            # MODIFY — add location/task-manager plugins, maps API key
└── e2e/
    ├── cardio-manual.yaml              # CREATE
    ├── cardio-gps-start.yaml           # CREATE
    └── cardio-cancel.yaml              # CREATE
```

---

## Chunk 1: Utilities & Dependencies

### Task 1: Install Dependencies & Update Config

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Install new packages**

Run:
```bash
pnpm --filter @ironpulse/mobile add react-native-maps expo-location expo-task-manager expo-battery expo-sqlite
```

- [ ] **Step 2: Update app.json plugins and Android maps config**

In `apps/mobile/app.json`, add to the `plugins` array:
```json
["expo-location", {
  "locationAlwaysAndWhenInUsePermission": "IronPulse needs your location to track runs, rides, and hikes.",
  "isIosBackgroundLocationEnabled": true,
  "isAndroidBackgroundLocationEnabled": true
}],
"expo-task-manager"
```

Add to the `android` section:
```json
"config": {
  "googleMaps": {
    "apiKey": "PLACEHOLDER_REPLACE_WITH_REAL_KEY"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json pnpm-lock.yaml
git commit -m "add GPS tracking dependencies and expo config plugins"
```

### Task 2: Geo Utilities (TDD)

**Files:**
- Create: `apps/mobile/lib/geo-utils.ts`
- Create: `apps/mobile/lib/__tests__/geo-utils.test.ts`

- [ ] **Step 1: Write geo utility tests**

Create `apps/mobile/lib/__tests__/geo-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  totalDistance,
  calculatePace,
  formatPace,
  metersToKm,
  metersToMiles,
} from "../geo-utils";

describe("haversineDistance", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it("calculates distance between London and Paris (~340km)", () => {
    const d = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(340000);
    expect(d).toBeLessThan(345000);
  });

  it("calculates short distance accurately", () => {
    // ~111m for 0.001 degree latitude
    const d = haversineDistance(0, 0, 0.001, 0);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe("totalDistance", () => {
  it("returns 0 for empty array", () => {
    expect(totalDistance([])).toBe(0);
  });

  it("returns 0 for single point", () => {
    expect(totalDistance([{ latitude: 0, longitude: 0 }])).toBe(0);
  });

  it("sums distances between consecutive points", () => {
    const points = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.001, longitude: 0 },
      { latitude: 0.002, longitude: 0 },
    ];
    const d = totalDistance(points);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(240);
  });
});

describe("calculatePace", () => {
  it("returns pace in seconds per km", () => {
    // 5km in 25 minutes = 300 seconds/km
    expect(calculatePace(5000, 1500)).toBe(300);
  });

  it("returns 0 for zero distance", () => {
    expect(calculatePace(0, 100)).toBe(0);
  });
});

describe("formatPace", () => {
  it("formats 300 seconds/km as 5:00", () => {
    expect(formatPace(300)).toBe("5:00");
  });

  it("formats 330 seconds/km as 5:30", () => {
    expect(formatPace(330)).toBe("5:30");
  });
});

describe("unit conversion", () => {
  it("converts meters to km", () => {
    expect(metersToKm(5000)).toBe(5);
  });

  it("converts meters to miles", () => {
    expect(metersToMiles(1609.34)).toBeCloseTo(1, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @ironpulse/mobile test -- geo-utils`
Expected: FAIL — module not found

- [ ] **Step 3: Implement geo utilities**

Create `apps/mobile/lib/geo-utils.ts`:

```typescript
const EARTH_RADIUS = 6371000; // meters

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function totalDistance(
  points: { latitude: number; longitude: number }[]
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].latitude, points[i - 1].longitude,
      points[i].latitude, points[i].longitude
    );
  }
  return total;
}

export function calculatePace(
  distanceMeters: number,
  durationSeconds: number
): number {
  if (distanceMeters === 0) return 0;
  return Math.round((durationSeconds / distanceMeters) * 1000);
}

export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm === 0) return "--:--";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ironpulse/mobile test -- geo-utils`
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/geo-utils.ts apps/mobile/lib/__tests__/geo-utils.test.ts
git commit -m "add geo utilities with Haversine distance, pace, and unit conversion"
```

### Task 3: GPS Buffer Operations

**Files:**
- Create: `apps/mobile/lib/gps-buffer.ts`

- [ ] **Step 1: Create GPS buffer module**

Create `apps/mobile/lib/gps-buffer.ts`:

```typescript
interface DbExecutor {
  execute(sql: string, params?: any[]): Promise<any>;
}

interface BufferPoint {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  timestamp: string;
}

export async function initGpsBuffer(db: DbExecutor): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _gps_buffer (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      elevation_m REAL,
      timestamp TEXT NOT NULL
    )
  `);
}

export async function insertBufferPoint(
  db: DbExecutor,
  sessionId: string,
  coords: { latitude: number; longitude: number; altitude?: number | null },
  timestamp: string
): Promise<void> {
  const id = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.execute(
    `INSERT INTO _gps_buffer (id, session_id, latitude, longitude, elevation_m, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, sessionId, coords.latitude, coords.longitude, coords.altitude ?? null, timestamp]
  );
}

export async function getBufferPoints(
  db: DbExecutor,
  sessionId: string
): Promise<BufferPoint[]> {
  const result = await db.execute(
    `SELECT * FROM _gps_buffer WHERE session_id = ? ORDER BY timestamp`,
    [sessionId]
  );
  return result.rows?._array ?? [];
}

export async function clearBuffer(
  db: DbExecutor,
  sessionId: string
): Promise<void> {
  await db.execute(
    `DELETE FROM _gps_buffer WHERE session_id = ?`,
    [sessionId]
  );
}

export async function getActiveSessionId(
  db: DbExecutor
): Promise<string | null> {
  const result = await db.execute(
    `SELECT DISTINCT session_id FROM _gps_buffer LIMIT 1`
  );
  return result.rows?._array?.[0]?.session_id ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/gps-buffer.ts
git commit -m "add GPS buffer SQLite operations for route point storage"
```

### Task 4: Background GPS Task

**Files:**
- Create: `apps/mobile/lib/gps-task.ts`

- [ ] **Step 1: Create the TaskManager background task**

Create `apps/mobile/lib/gps-task.ts`:

```typescript
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SQLite from "expo-sqlite";
import { insertBufferPoint, initGpsBuffer } from "./gps-buffer";

export const GPS_TASK_NAME = "ironpulse-gps-tracking";

let bgDb: SQLite.SQLiteDatabase | null = null;
let activeSessionId: string | null = null;

export function setActiveSessionId(id: string | null) {
  activeSessionId = id;
}

function getBackgroundDb(): SQLite.SQLiteDatabase {
  if (!bgDb) {
    bgDb = SQLite.openDatabaseSync("ironpulse.db");
  }
  return bgDb;
}

TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("GPS background task error:", error);
    return;
  }
  if (!data || !activeSessionId) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const db = getBackgroundDb();

  // Ensure buffer table exists (idempotent)
  await initGpsBuffer(db);

  for (const loc of locations) {
    await insertBufferPoint(
      db,
      activeSessionId,
      {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
      },
      new Date(loc.timestamp).toISOString()
    );
  }
});

export async function startGpsTracking(sessionId: string): Promise<Location.LocationSubscription> {
  setActiveSessionId(sessionId);

  // Request permissions
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    throw new Error("Foreground location permission denied");
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

  // Start background updates if permission granted
  if (bgStatus === "granted") {
    await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "IronPulse",
        notificationBody: "Tracking your activity",
      },
    });
  }

  // Start foreground watch (returns subscription for cleanup)
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 3000,
    },
    () => {
      // Foreground updates are handled by the tracking screen's own callback
      // This subscription is mainly for iOS to maintain foreground location access
    }
  );

  return subscription;
}

export async function stopGpsTracking(): Promise<void> {
  setActiveSessionId(null);

  const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  }
}
```

Note: The `gps-task.ts` uses `expo-sqlite` directly for the background task (not PowerSync) because after app kill, the PowerSync singleton may not be initialized. The foreground tracking screen uses the PowerSync db instance.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/gps-task.ts
git commit -m "add TaskManager background GPS task with SQLite buffer"
```

---

## Chunk 2: Cardio Components

### Task 5: Type Card Component

**Files:**
- Create: `apps/mobile/components/cardio/type-card.tsx`

- [ ] **Step 1: Create type card**

Create `apps/mobile/components/cardio/type-card.tsx`:

```typescript
import { Pressable, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface Props {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}

export function TypeCard({ label, icon: Icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: "hsl(216, 34%, 17%)",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon size={32} color="hsl(210, 40%, 98%)" />
      <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 14, fontWeight: "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/cardio/type-card.tsx
git commit -m "add cardio type card component"
```

### Task 6: Live Stats Bar

**Files:**
- Create: `apps/mobile/components/cardio/live-stats-bar.tsx`

- [ ] **Step 1: Create live stats bar**

Create `apps/mobile/components/cardio/live-stats-bar.tsx`:

```typescript
import { View, Text } from "react-native";
import { formatElapsed } from "@/lib/workout-utils";
import { formatPace, metersToKm, metersToMiles } from "@/lib/geo-utils";

interface Props {
  durationSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm: number;
  unitSystem: string;
}

export function LiveStatsBar({ durationSeconds, distanceMeters, paceSecondsPerKm, unitSystem }: Props) {
  const distance = unitSystem === "imperial"
    ? metersToMiles(distanceMeters).toFixed(2)
    : metersToKm(distanceMeters).toFixed(2);
  const distanceUnit = unitSystem === "imperial" ? "mi" : "km";

  return (
    <View style={{
      flexDirection: "row",
      backgroundColor: "hsl(223, 47%, 11%)",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: "hsl(216, 34%, 17%)",
    }}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          Duration
        </Text>
        <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 24, fontWeight: "bold", fontVariant: ["tabular-nums"] }}>
          {formatElapsed(durationSeconds)}
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          Distance
        </Text>
        <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 24, fontWeight: "bold", fontVariant: ["tabular-nums"] }}>
          {distance} <Text style={{ fontSize: 14, fontWeight: "400" }}>{distanceUnit}</Text>
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          Pace
        </Text>
        <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 24, fontWeight: "bold", fontVariant: ["tabular-nums"] }}>
          {formatPace(paceSecondsPerKm)}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/cardio/live-stats-bar.tsx
git commit -m "add live stats bar with duration, distance, and pace"
```

### Task 7: Route Map Component

**Files:**
- Create: `apps/mobile/components/cardio/route-map.tsx`

- [ ] **Step 1: Create route map**

Create `apps/mobile/components/cardio/route-map.tsx`:

```typescript
import { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Platform } from "react-native";

interface Props {
  routePoints: { latitude: number; longitude: number }[];
  followUser?: boolean;
  interactive?: boolean;
  style?: any;
}

export function RouteMap({ routePoints, followUser = false, interactive = true, style }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (followUser && routePoints.length > 0) {
      const lastPoint = routePoints[routePoints.length - 1];
      mapRef.current?.animateToRegion({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [followUser, routePoints]);

  // Fit to route for non-interactive (summary) view
  useEffect(() => {
    if (!interactive && routePoints.length > 1) {
      mapRef.current?.fitToCoordinates(routePoints, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    }
  }, [interactive, routePoints]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={interactive}
        showsMyLocationButton={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        userInterfaceStyle="dark"
        initialRegion={
          routePoints.length > 0
            ? {
                latitude: routePoints[0].latitude,
                longitude: routePoints[0].longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 51.5074,
                longitude: -0.1278,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
      >
        {routePoints.length > 1 && (
          <Polyline
            coordinates={routePoints}
            strokeColor="hsl(210, 40%, 98%)"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 0,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/cardio/route-map.tsx
git commit -m "add route map component with MapView and polyline"
```

---

## Chunk 3: Cardio Screens

### Task 8: FAB Wiring + Cardio Stack Layout

**Files:**
- Modify: `apps/mobile/components/layout/new-session-sheet.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/cardio/_layout.tsx`

- [ ] **Step 1: Add onLogCardio to NewSessionSheet**

In `apps/mobile/components/layout/new-session-sheet.tsx`, add `onLogCardio?: () => void` to the Props interface. Update the "Log Cardio" press handler:

```typescript
onPress={() => {
  onClose();
  onLogCardio?.();
}}
```

- [ ] **Step 2: Wire in tab layout**

In `apps/mobile/app/(tabs)/_layout.tsx`, add:
```typescript
import { useRouter } from "expo-router";
const router = useRouter();
```

Pass to NewSessionSheet:
```typescript
<NewSessionSheet
  open={sheetOpen}
  onClose={() => setSheetOpen(false)}
  onStartWorkout={() => setTemplatePickerOpen(true)}
  onLogCardio={() => router.push("/cardio/type-picker")}
/>
```

- [ ] **Step 3: Create cardio stack layout**

Create `apps/mobile/app/cardio/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function CardioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
      }}
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/layout/new-session-sheet.tsx apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app/cardio/
git commit -m "wire FAB Log Cardio and add cardio stack layout"
```

### Task 9: Type Picker Screen

**Files:**
- Create: `apps/mobile/app/cardio/type-picker.tsx`

- [ ] **Step 1: Create type picker**

Create `apps/mobile/app/cardio/type-picker.tsx`:

```typescript
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PersonStanding, Bike, Waves, Mountain, Footprints, Activity, X } from "lucide-react-native";
import { TypeCard } from "@/components/cardio/type-card";

const ACTIVITY_TYPES = [
  { type: "run", label: "Run", icon: PersonStanding, gps: true },
  { type: "cycle", label: "Cycle", icon: Bike, gps: true },
  { type: "swim", label: "Swim", icon: Waves, gps: false },
  { type: "hike", label: "Hike", icon: Mountain, gps: true },
  { type: "walk", label: "Walk", icon: Footprints, gps: true },
  { type: "other", label: "Other", icon: Activity, gps: false },
];

export default function TypePickerScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<typeof ACTIVITY_TYPES[0] | null>(null);

  function handleTypePress(activity: typeof ACTIVITY_TYPES[0]) {
    if (!activity.gps) {
      // Non-GPS type — go straight to manual form
      router.push({ pathname: "/cardio/manual", params: { type: activity.type } });
      return;
    }
    // GPS-capable — show choice
    setSelectedType(activity);
  }

  if (selectedType) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 16 }}>
          <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 16 }}>
            {selectedType.label}
          </Text>

          <Pressable
            onPress={() => router.push({ pathname: "/cardio/tracking", params: { type: selectedType.type } })}
            style={{
              backgroundColor: "hsl(210, 40%, 98%)", borderRadius: 16,
              padding: 20, alignItems: "center",
            }}
          >
            <Text style={{ color: "hsl(222.2, 47.4%, 11.2%)", fontSize: 18, fontWeight: "bold" }}>
              Track with GPS
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: "/cardio/manual", params: { type: selectedType.type } })}
            style={{
              backgroundColor: "hsl(216, 34%, 17%)", borderRadius: 16,
              padding: 20, alignItems: "center",
            }}
          >
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 18, fontWeight: "500" }}>
              Log Manually
            </Text>
          </Pressable>

          <Pressable onPress={() => setSelectedType(null)} style={{ alignItems: "center", paddingTop: 8 }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 14 }}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color="hsl(213, 31%, 91%)" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: "hsl(213, 31%, 91%)", fontSize: 18, fontWeight: "bold" }}>
          Log Cardio
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {ACTIVITY_TYPES.map((a) => (
            <TypeCard key={a.type} label={a.label} icon={a.icon} onPress={() => handleTypePress(a)} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/cardio/type-picker.tsx
git commit -m "add cardio type picker with GPS/manual choice"
```

### Task 10: Manual Cardio Form

**Files:**
- Create: `apps/mobile/app/cardio/manual.tsx`

- [ ] **Step 1: Create manual form**

Create `apps/mobile/app/cardio/manual.tsx`:

```typescript
import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react-native";

export default function ManualCardioScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const db = usePowerSync();
  const { user } = useAuth();

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distance, setDistance] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [elevation, setElevation] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isImperial = user?.unitSystem === "imperial";

  async function handleSave() {
    setSaving(true);
    try {
      const durationSeconds =
        (parseInt(hours || "0") * 3600) +
        (parseInt(minutes || "0") * 60) +
        parseInt(seconds || "0");

      const distanceNum = parseFloat(distance || "0");
      const distanceMeters = isImperial ? distanceNum * 1609.34 : distanceNum * 1000;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, elevation_gain_m, avg_heart_rate, calories, notes, created_at)
         VALUES (?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user!.id,
          type,
          now,
          durationSeconds,
          distanceMeters || null,
          elevation ? parseFloat(elevation) : null,
          heartRate ? parseInt(heartRate) : null,
          calories ? parseInt(calories) : null,
          notes || null,
          now,
        ]
      );

      router.replace({ pathname: "/cardio/summary", params: { sessionId: id, type: type! } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "hsl(213, 31%, 91%)", textTransform: "capitalize" }}>
          {type} — Manual
        </Text>

        {/* Duration */}
        <View>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 14, marginBottom: 8 }}>Duration</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input label="" placeholder="HH" value={hours} onChangeText={setHours} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="" placeholder="MM" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" testID="duration-minutes" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="" placeholder="SS" value={seconds} onChangeText={setSeconds} keyboardType="number-pad" />
            </View>
          </View>
        </View>

        {/* Distance */}
        <Input
          label={`Distance (${isImperial ? "mi" : "km"})`}
          placeholder="0.0"
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          testID="distance-input"
        />

        {/* Expandable details */}
        <Pressable
          onPress={() => setShowDetails(!showDetails)}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 14 }}>More Details</Text>
          {showDetails ? <ChevronUp size={16} color="hsl(215, 20%, 65%)" /> : <ChevronDown size={16} color="hsl(215, 20%, 65%)" />}
        </Pressable>

        {showDetails && (
          <View style={{ gap: 16 }}>
            <Input label={`Elevation (${isImperial ? "ft" : "m"})`} value={elevation} onChangeText={setElevation} keyboardType="decimal-pad" />
            <Input label="Avg Heart Rate (bpm)" value={heartRate} onChangeText={setHeartRate} keyboardType="number-pad" />
            <Input label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
            <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
          </View>
        )}

        <Button onPress={handleSave} disabled={saving} testID="save-cardio">
          {saving ? "Saving..." : "Save"}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/cardio/manual.tsx
git commit -m "add manual cardio form with duration, distance, and expandable details"
```

### Task 11: GPS Tracking Screen

**Files:**
- Create: `apps/mobile/app/cardio/tracking.tsx`

- [ ] **Step 1: Create the GPS tracking screen**

Create `apps/mobile/app/cardio/tracking.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as Battery from "expo-battery";
import * as Haptics from "expo-haptics";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { RouteMap } from "@/components/cardio/route-map";
import { LiveStatsBar } from "@/components/cardio/live-stats-bar";
import { startGpsTracking, stopGpsTracking } from "@/lib/gps-task";
import { initGpsBuffer, insertBufferPoint, getBufferPoints, clearBuffer } from "@/lib/gps-buffer";
import { haversineDistance, calculatePace } from "@/lib/geo-utils";
import { getWorkoutName } from "@/lib/workout-utils";
import { trpc } from "@/lib/trpc";

export default function TrackingScreen() {
  const { type, sessionId: resumeSessionId } = useLocalSearchParams<{ type: string; sessionId?: string }>();
  const router = useRouter();
  const db = usePowerSync();
  const { user } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(resumeSessionId ?? null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [pace, setPace] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [weakSignal, setWeakSignal] = useState(false);
  const [batteryWarning, setBatteryWarning] = useState(false);

  const fgSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Init and start tracking
  useEffect(() => {
    let mounted = true;

    async function start() {
      await initGpsBuffer(db);

      let sid = resumeSessionId ?? null;

      if (!sid) {
        // Create new session
        sid = crypto.randomUUID();
        const now = new Date().toISOString();
        await db.execute(
          `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, created_at) VALUES (?, ?, ?, 'gps', ?, 0, ?)`,
          [sid, user!.id, type, now, now]
        );
        await SecureStore.setItemAsync("active-cardio-session", sid);
        setStartedAt(now);
      } else {
        // Resume — read started_at from DB
        const result = await db.execute("SELECT started_at FROM cardio_sessions WHERE id = ?", [sid]);
        setStartedAt(result.rows?._array?.[0]?.started_at ?? new Date().toISOString());

        // Load existing buffer points
        const existingPoints = await getBufferPoints(db, sid);
        const pts = existingPoints.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
        setRoutePoints(pts);
      }

      if (!mounted) return;
      setSessionId(sid);

      try {
        const sub = await startGpsTracking(sid);
        fgSubscription.current = sub;
      } catch (err: any) {
        Alert.alert("Location Error", err.message);
        router.back();
      }
    }

    start();

    return () => {
      mounted = false;
      fgSubscription.current?.remove();
    };
  }, []);

  // Foreground location updates
  useEffect(() => {
    if (!sessionId) return;

    const sub = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
      async (loc) => {
        const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

        // Insert to buffer
        await insertBufferPoint(db, sessionId, loc.coords, new Date(loc.timestamp).toISOString());

        // Update route
        setRoutePoints((prev) => [...prev, point]);

        // Update distance
        if (lastPointRef.current) {
          const d = haversineDistance(
            lastPointRef.current.latitude, lastPointRef.current.longitude,
            point.latitude, point.longitude
          );
          setDistanceMeters((prev) => prev + d);
        }
        lastPointRef.current = point;
        lastUpdateRef.current = Date.now();
        setWeakSignal(false);
      }
    );

    return () => { sub.then((s) => s.remove()); };
  }, [sessionId]);

  // Elapsed timer
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));

      // Check weak signal
      if (now - lastUpdateRef.current > 10000) {
        setWeakSignal(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Pace update
  useEffect(() => {
    if (distanceMeters > 0 && elapsed > 0) {
      setPace(calculatePace(distanceMeters, elapsed));
    }
  }, [distanceMeters, elapsed]);

  // Battery monitoring
  useEffect(() => {
    const interval = setInterval(async () => {
      const level = await Battery.getBatteryLevelAsync();
      if (level < 0.15 && level > 0) {
        setBatteryWarning(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleStop() {
    if (!sessionId) return;

    await stopGpsTracking();
    fgSubscription.current?.remove();

    // Update session
    await db.execute(
      "UPDATE cardio_sessions SET duration_seconds = ?, distance_meters = ? WHERE id = ?",
      [elapsed, distanceMeters, sessionId]
    );

    // Upload route points
    const points = await getBufferPoints(db, sessionId);
    try {
      await trpc.cardio.completeGpsSession.mutate({
        sessionId,
        routePoints: points.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          elevationM: p.elevation_m,
          timestamp: p.timestamp,
        })),
      });
      await clearBuffer(db, sessionId);
    } catch {
      // Offline — save pending upload
      await SecureStore.setItemAsync("pending-gps-upload", sessionId);
    }

    await SecureStore.deleteItemAsync("active-cardio-session");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.replace({
      pathname: "/cardio/summary",
      params: { sessionId, type: type! },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      {/* Map */}
      <View style={{ flex: 1 }}>
        <RouteMap
          routePoints={routePoints}
          followUser={followUser}
          interactive
        />

        {weakSignal && (
          <View style={{
            position: "absolute", top: 60, left: 16, right: 16,
            backgroundColor: "hsl(48, 96%, 53%)", borderRadius: 8, padding: 8,
          }}>
            <Text style={{ color: "hsl(224, 71%, 4%)", textAlign: "center", fontSize: 12, fontWeight: "600" }}>
              Weak GPS Signal
            </Text>
          </View>
        )}

        {batteryWarning && (
          <View style={{
            position: "absolute", top: weakSignal ? 100 : 60, left: 16, right: 16,
            backgroundColor: "hsl(0, 63%, 31%)", borderRadius: 8, padding: 8,
          }}>
            <Text style={{ color: "white", textAlign: "center", fontSize: 12, fontWeight: "600" }}>
              Battery low. Consider ending your session.
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <LiveStatsBar
        durationSeconds={elapsed}
        distanceMeters={distanceMeters}
        paceSecondsPerKm={pace}
        unitSystem={user?.unitSystem ?? "metric"}
      />

      {/* Stop button */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 40, alignItems: "center" }}>
        <Pressable
          testID="stop-tracking"
          onPress={handleStop}
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: "hsl(0, 63%, 31%)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: "white" }} />
        </Pressable>
        <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12, marginTop: 8 }}>Stop</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/cardio/tracking.tsx
git commit -m "add GPS live tracking screen with map, stats, and background support"
```

### Task 12: Cardio Summary Screen

**Files:**
- Create: `apps/mobile/app/cardio/summary.tsx`

- [ ] **Step 1: Create summary screen**

Create `apps/mobile/app/cardio/summary.tsx`:

```typescript
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteMap } from "@/components/cardio/route-map";
import { formatElapsed } from "@/lib/workout-utils";
import { formatPace, metersToKm, metersToMiles, calculatePace } from "@/lib/geo-utils";
import { PersonStanding, Bike, Waves, Mountain, Footprints, Activity } from "lucide-react-native";

const TYPE_ICONS: Record<string, any> = {
  run: PersonStanding, cycle: Bike, swim: Waves,
  hike: Mountain, walk: Footprints, other: Activity,
};

export default function CardioSummaryScreen() {
  const { sessionId, type, routePointsJson } = useLocalSearchParams<{
    sessionId: string; type: string; routePointsJson?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: sessions } = useQuery("SELECT * FROM cardio_sessions WHERE id = ?", [sessionId ?? ""]);
  const session = sessions?.[0];

  const isImperial = user?.unitSystem === "imperial";
  const Icon = TYPE_ICONS[type ?? "other"] ?? Activity;

  const distance = session?.distance_meters
    ? isImperial
      ? metersToMiles(session.distance_meters).toFixed(2) + " mi"
      : metersToKm(session.distance_meters).toFixed(2) + " km"
    : null;

  const pace = session?.distance_meters && session?.duration_seconds
    ? formatPace(calculatePace(session.distance_meters, session.duration_seconds))
    : null;

  // Parse route points if available (passed from tracking screen)
  const routePoints = (() => {
    try { return JSON.parse(routePointsJson ?? "[]"); } catch { return []; }
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Icon size={40} color="hsl(210, 40%, 98%)" />
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "hsl(213, 31%, 91%)", marginTop: 8, textTransform: "capitalize" }}>
            {type}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {session?.duration_seconds != null && (
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Duration</Text>
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
                {formatElapsed(session.duration_seconds)}
              </Text>
            </Card>
          )}
          {distance && (
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Distance</Text>
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
                {distance}
              </Text>
            </Card>
          )}
        </View>

        {pace && (
          <Card style={{ alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Pace</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {pace} /km
            </Text>
          </Card>
        )}

        {/* Route map for GPS sessions */}
        {routePoints.length > 1 && (
          <View style={{ height: 200, borderRadius: 12, overflow: "hidden" }}>
            <RouteMap routePoints={routePoints} interactive={false} />
          </View>
        )}

        {/* Optional stats */}
        {(session?.elevation_gain_m || session?.avg_heart_rate || session?.calories) && (
          <View style={{ gap: 8 }}>
            {session.elevation_gain_m != null && (
              <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "hsl(215, 20%, 65%)" }}>Elevation</Text>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
                  {session.elevation_gain_m} m
                </Text>
              </Card>
            )}
            {session.avg_heart_rate != null && (
              <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "hsl(215, 20%, 65%)" }}>Avg HR</Text>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
                  {session.avg_heart_rate} bpm
                </Text>
              </Card>
            )}
            {session.calories != null && (
              <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "hsl(215, 20%, 65%)" }}>Calories</Text>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
                  {session.calories} kcal
                </Text>
              </Card>
            )}
          </View>
        )}

        <Button onPress={() => router.replace("/(tabs)")}>
          Done
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/cardio/summary.tsx
git commit -m "add cardio summary screen for GPS and manual sessions"
```

---

## Chunk 4: E2E Tests & Verification

### Task 13: Maestro E2E Flows

**Files:**
- Create: `apps/mobile/e2e/cardio-manual.yaml`
- Create: `apps/mobile/e2e/cardio-gps-start.yaml`
- Create: `apps/mobile/e2e/cardio-cancel.yaml`

- [ ] **Step 1: Create E2E flows**

Create `apps/mobile/e2e/cardio-manual.yaml`:
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
- tapOn:
    id: "fab-button"
- tapOn: "Log Cardio"
- tapOn: "Run"
- tapOn: "Log Manually"
- tapOn:
    id: "duration-minutes"
- inputText: "30"
- tapOn:
    id: "distance-input"
- inputText: "5.0"
- tapOn:
    id: "save-cardio"
- assertVisible: "Run"
- tapOn: "Done"
- assertVisible: "Good morning"
```

Create `apps/mobile/e2e/cardio-gps-start.yaml`:
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
- tapOn:
    id: "fab-button"
- tapOn: "Log Cardio"
- tapOn: "Run"
- tapOn: "Track with GPS"
- allowPermission
- allowPermission
- assertVisible: "Stop"
```

Create `apps/mobile/e2e/cardio-cancel.yaml`:
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
- tapOn:
    id: "fab-button"
- tapOn: "Log Cardio"
- assertVisible: "Run"
- back
- assertVisible: "Good morning"
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/e2e/cardio-*.yaml
git commit -m "add Maestro E2E flows for cardio manual, GPS start, and cancel"
```

### Task 14: Verification

- [ ] **Step 1: Run geo utility tests**

Run: `pnpm --filter @ironpulse/mobile test -- geo-utils`
Expected: All tests pass

- [ ] **Step 2: Run sync package tests**

Run: `pnpm --filter @ironpulse/sync test`
Expected: All tests pass

- [ ] **Step 3: Verify web build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds

- [ ] **Step 4: Verify Expo config**

Run: `cd apps/mobile && npx expo config`
Expected: Config resolves with location and task-manager plugins

- [ ] **Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "fix cardio GPS issues found during verification"
```
