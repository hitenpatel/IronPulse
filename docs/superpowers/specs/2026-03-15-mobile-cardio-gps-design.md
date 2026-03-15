# Mobile Cardio + GPS Live Tracking — Design Specification

Manual cardio logging and GPS live tracking for the IronPulse Expo mobile app. Includes foreground + background GPS tracking, live route map, manual cardio form, and session summary. This is sub-project 3 of 4 for the mobile app.

## Scope

- Type picker (run/cycle/swim/hike/walk/other)
- Manual cardio form (duration, distance, optional details)
- GPS live tracking screen with `react-native-maps` route display
- Background tracking via `expo-location` + `TaskManager` (screen locked, app backgrounded)
- Route point buffering in local SQLite, upload on completion via tRPC
- App-killed recovery (resume or discard incomplete sessions)
- Shared cardio summary screen (manual + GPS)
- Battery warning during GPS tracking
- 3 Maestro E2E flows

## Out of Scope

- GPX file import (web-only for MVP)
- Heart rate monitor integration (post-MVP)
- Lap detection (post-MVP — laps table exists but not used for GPS)

## Screen Flow & Navigation

```
FAB "Log Cardio"
  → Type Picker (fullscreen)
    → GPS-capable type (run/cycle/hike/walk):
        → "Track with GPS" → Live Tracking Screen (map + stats + stop)
            → "Stop" → Cardio Summary → "Done" → dashboard
        → "Log Manually" → Manual Form → "Save" → Cardio Summary → "Done" → dashboard
    → Non-GPS type (swim/other):
        → Manual Form → "Save" → Cardio Summary → "Done" → dashboard
```

Cardio screens live under `app/cardio/` (outside tabs, fullscreen stack). Back gesture disabled during GPS tracking to prevent accidental stops.

## FAB Integration

Wire the existing `NewSessionSheet` component's "Log Cardio" button. Add an `onLogCardio` callback prop (same pattern as `onStartWorkout`). The tab layout provides the callback which calls `router.push("/cardio/type-picker")`. The sheet itself only calls `onClose()` then `onLogCardio?.()`.

## Type Picker

Fullscreen grid of activity types:

| Type | Icon | GPS Available |
|------|------|---------------|
| Run | running icon | Yes |
| Cycle | `Bike` | Yes |
| Swim | `Waves` | No |
| Hike | `Mountain` | Yes |
| Walk | `Footprints` | Yes |
| Other | `Activity` | No |

For GPS-capable types: after tapping, show two large buttons — "Track with GPS" and "Log Manually."

For non-GPS types: navigate directly to the manual form with the type pre-set.

## GPS Live Tracking Screen

Fullscreen screen with three zones:

### Map (top 60%)

`react-native-maps` `MapView` showing:
- User's current position (blue dot via `showsUserLocation`)
- Route as a `Polyline` component (array of `{ latitude, longitude }` coordinates)
- Auto-follows user location by default
- Tappable to toggle between follow mode and free pan
- Dark map style matching app theme (via `customMapStyle` on Android, `mapType` on iOS)

### Stats Bar (middle)

Horizontal row of three live-updating metrics:
- **Duration**: elapsed timer from `started_at` (same pattern as workout header)
- **Distance**: running Haversine total from route points, displayed in km or mi per user preference
- **Pace**: derived from distance and elapsed time, displayed as min/km or min/mi. Updated every 5 seconds.

### Controls (bottom)

- Large "Stop" button: red, centered, 72pt minimum, easy to tap while running
- Small lock icon indicating background tracking is active
- "Weak signal" indicator when no GPS update for 10+ seconds

## GPS Implementation

### Permissions

Request in order:
1. `Location.requestForegroundPermissionsAsync()` — required
2. `Location.requestBackgroundPermissionsAsync()` — required for background tracking
3. If background permission denied, fall back to foreground-only with a warning

### Foreground Tracking

```typescript
Location.watchPositionAsync({
  accuracy: Location.Accuracy.High,
  distanceInterval: 5, // meters
  timeInterval: 3000,  // 3 seconds minimum
})
```

Returns a subscription that fires callbacks with `{ coords: { latitude, longitude, altitude }, timestamp }`.

### Background Tracking

Defined in a dedicated file `lib/gps-task.ts` at module scope (not inside a component):

```typescript
TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  // Write to SQLite buffer
});
```

Started via:
```typescript
Location.startLocationUpdatesAsync(TASK_NAME, {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  showsBackgroundLocationIndicator: true, // iOS blue bar
  foregroundService: {
    notificationTitle: "IronPulse",
    notificationBody: "Tracking your activity",
  },
});
```

### Expo Config

Add to `app.json` plugins:
```json
["expo-location", {
  "locationAlwaysAndWhenInUsePermission": "IronPulse needs your location to track runs, rides, and hikes.",
  "isIosBackgroundLocationEnabled": true,
  "isAndroidBackgroundLocationEnabled": true
}],
"expo-task-manager"
```

The `expo-location` plugin automatically sets `UIBackgroundModes: ["location"]` on iOS when `isIosBackgroundLocationEnabled` is true. `expo-task-manager` must also be in the plugins array for background task registration.

### Android Google Maps API Key

`react-native-maps` requires a Google Maps API key on Android. Add to `app.json`:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

On iOS, Apple Maps is used by default (no API key needed). The API key should be provided via an environment variable in production builds.

## Route Point Buffering

### GPS Buffer Table

A local-only SQLite table (NOT in the PowerSync schema, not synced):

```sql
CREATE TABLE IF NOT EXISTS _gps_buffer (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation_m REAL,
  timestamp TEXT NOT NULL
)
```

Created on app startup via `PowerSyncDatabase.execute()` (the same SQLite database PowerSync manages — the `_gps_buffer` prefix avoids collision with PowerSync's internal `ps_` tables). In foreground, use the PowerSync db instance. In the background task (after app kill), use `expo-sqlite` directly to open the same database file (`ironpulse.db`), since the PowerSync singleton may not be initialized.

### Buffer Operations (`lib/gps-buffer.ts`)

- `initGpsBuffer(db)` — creates table if not exists
- `insertBufferPoint(db, sessionId, coords)` — inserts a point
- `getBufferPoints(db, sessionId)` — reads all points for a session, ordered by timestamp
- `clearBuffer(db, sessionId)` — deletes all points for a session
- `hasActiveSession(db)` — checks if any points exist (for app kill recovery)

## Session Lifecycle

### Starting a GPS session

1. Create `cardio_sessions` row via PowerSync: `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, created_at) VALUES (?, ?, ?, 'gps', ?, 0, ?)`
2. Store session ID in `expo-secure-store` under key `"active-cardio-session"`
3. Request location permissions
4. Start foreground watch + background location updates
5. Navigate to tracking screen

### During tracking

- Each GPS callback: insert point into `_gps_buffer`, append to React state array for live polyline, update running distance via Haversine
- Stats bar updates every second (duration) and every 5 seconds (pace)

### Stopping a GPS session

1. User taps "Stop"
2. `Location.stopLocationUpdatesAsync(TASK_NAME)`
3. Remove foreground watch subscription
4. Calculate final duration and distance
5. Update cardio session: `UPDATE cardio_sessions SET duration_seconds = ?, distance_meters = ?` (note: `cardio_sessions` has no `completed_at` column — completion is inferred from `duration_seconds > 0`)
6. Read buffer: `getBufferPoints(db, sessionId)`
7. Upload to server: `trpc.cardio.completeGpsSession.mutate({ sessionId, routePoints })` (try/catch for offline)
8. Clear buffer: `clearBuffer(db, sessionId)`
9. Clear `"active-cardio-session"` from secure store
10. Navigate to summary with `sessionId` param

### Offline upload handling

If `completeGpsSession` fails (offline):
- Do NOT delete the buffer
- Store `sessionId` in secure store under `"pending-gps-upload"`
- On next app launch, check for `"pending-gps-upload"`:
  1. Attempt the upload via `trpc.cardio.completeGpsSession.mutate()`
  2. If success: clear buffer + pending flag
  3. If fail (still offline): leave pending flag, try again on next launch
  4. No exponential backoff — just one attempt per app launch
- The user sees the cardio session locally (it's in PowerSync) but without route data on the server until the upload succeeds
- No user notification for pending uploads — this is transparent background behavior

## App Kill Recovery

On app launch, check `expo-secure-store` for `"active-cardio-session"`:

1. If set → check `_gps_buffer` for points with that session ID
2. If points exist → show alert: "You have an unfinished cardio session. Resume or discard?"
3. **Resume**: reopen tracking screen with existing session ID. Reconstruct elapsed time from `started_at`. Buffer points render as the existing polyline. Background task may still be running (check and restart if not).
4. **Discard**: delete buffer points + cardio_sessions row + clear secure store key

## Manual Cardio Form

Fullscreen form with fields:

- **Duration**: three `TextInput` fields (hours, minutes, seconds) with `number-pad` keyboard
- **Distance**: single `TextInput` with `decimal-pad`, unit label from user preference (km/mi)
- **Expandable "More Details"** section (collapsed by default):
  - Elevation gain (`TextInput`, decimal-pad)
  - Average heart rate (`TextInput`, number-pad)
  - Calories (`TextInput`, number-pad)
  - Notes (`TextInput`, multiline)

"Save" button at bottom:
1. Convert duration fields to total seconds
2. Convert distance to meters (if user entered miles, multiply by 1609.34)
3. `db.execute(INSERT INTO cardio_sessions ...)` with `source = 'manual'`, `started_at = new Date().toISOString()` (current time — manual sessions don't have a meaningful start time, this is just the recording timestamp)
4. Navigate to summary

### Unit Preference

Distance display (km vs mi) and input labels read the user's `unitSystem` from the auth context (`useAuth().user.unitSystem`). This value comes from the `SessionUser` stored in `expo-secure-store` at sign-in. All internal storage is in metric (meters, kg). Conversion to imperial happens only at display time.

## Cardio Summary

Shared completion screen for both GPS and manual sessions:

- Activity type icon + label (e.g., Run icon + "Run")
- Stats: duration, distance, pace (distance / duration), elevation, heart rate, calories — shown only if values exist
- Route map thumbnail (GPS sessions only): `MapView` with the polyline rendered, non-interactive, showing the full route with padding. Route points fetched from `_gps_buffer` (if still available) or via `trpc.cardio.getRoutePoints` for historical viewing.
- "Done" button → `router.replace("/(tabs)")`

## Geo Utilities (`lib/geo-utils.ts`)

Pure functions, testable with Vitest:

- `haversineDistance(lat1, lon1, lat2, lon2)` → distance in meters
- `totalDistance(points: {latitude, longitude}[])` → sum of distances between consecutive points
- `calculatePace(distanceMeters, durationSeconds)` → pace in seconds per km
- `formatPace(paceSecondsPerKm)` → string like "5:30"
- `metersToKm(m)` / `metersToMiles(m)` — unit conversion

## Signal Loss Handling

If no GPS update arrives for 10+ seconds during active tracking:
- Show a "Weak Signal" banner on the map (yellow, non-blocking)
- Continue recording with the last known position
- When signal returns, the polyline may show a straight line across the gap
- No interpolation — gaps are honest

## Battery Warning

Monitor battery level via `expo-battery` during GPS tracking:
- If level drops below 15%, show a non-blocking banner: "Battery low (X%). Consider ending your session."
- Banner dismissible, does not interrupt tracking
- Check battery level every 60 seconds

## File Structure

```
apps/mobile/
├── app/cardio/
│   ├── _layout.tsx              # Fullscreen stack
│   ├── type-picker.tsx          # Activity type grid + GPS/manual choice
│   ├── tracking.tsx             # Live GPS tracking screen
│   ├── manual.tsx               # Manual cardio form
│   └── summary.tsx              # Shared completion summary
├── components/cardio/
│   ├── type-card.tsx            # Single activity type card (icon + label)
│   ├── live-stats-bar.tsx       # Duration/distance/pace bar
│   └── route-map.tsx            # MapView with polyline (reusable)
├── components/layout/
│   └── new-session-sheet.tsx    # MODIFY — add onLogCardio callback
├── app/(tabs)/
│   └── _layout.tsx              # MODIFY — wire onLogCardio
├── lib/
│   ├── gps-task.ts              # TaskManager background task definition
│   ├── gps-buffer.ts            # SQLite buffer CRUD operations
│   └── geo-utils.ts             # Haversine, pace, unit conversion
└── e2e/
    ├── cardio-manual.yaml
    ├── cardio-gps-start.yaml
    └── cardio-cancel.yaml
```

## Dependencies (New)

| Package | Purpose |
|---------|---------|
| `react-native-maps` | Map display with polyline |
| `expo-location` | GPS foreground + background |
| `expo-task-manager` | Background task registration |
| `expo-battery` | Battery level monitoring |

## Testing

### Unit Tests (Vitest)

| What | File |
|------|------|
| Haversine distance | `lib/__tests__/geo-utils.test.ts` |
| Pace calculation | `lib/__tests__/geo-utils.test.ts` |
| Unit conversion | `lib/__tests__/geo-utils.test.ts` |
| GPS buffer CRUD | Tested via integration (requires SQLite) |

### Maestro E2E Flows

**cardio-manual.yaml:**
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
- tapOn: "Save"
- assertVisible: "Run"
- tapOn: "Done"
- assertVisible: "Good morning"
```

**cardio-gps-start.yaml:**
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
- allowPermission           # Handle iOS/Android location permission dialog
- allowPermission           # Handle background permission dialog (if prompted separately)
- assertVisible: "Stop"
```

**cardio-cancel.yaml:**
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

### TestID Convention

- FAB button: `testID="fab-button"` (existing)
- Duration minutes: `testID="duration-minutes"`
- Distance input: `testID="distance-input"`
- Save button: `testID="save-cardio"`
- Stop tracking: `testID="stop-tracking"`
