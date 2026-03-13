# Cardio Logging UI Design Spec

**Goal:** Implement the cardio logging UI — manual session logging with a two-step type-picker → form flow, GPX file import with preview, and a shared completion summary with optional route map.

**Scope:** Web only (Next.js). GPS live tracking is deferred to the Expo mobile app.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, shadcn/ui (new-york), lucide-react, tRPC React Query hooks, react-leaflet + leaflet.

**Related specs:**
- Master design: `docs/superpowers/specs/2026-03-12-ironpulse-design.md`
- Core data layer: `docs/superpowers/specs/2026-03-12-core-data-layer-design.md`

---

## Architecture

Single-orchestrator pattern matching the workout UI. `CardioLogger` manages tab state and step progression, rendering child components for each step. Both manual and GPX flows converge on a shared `CardioSummary` completion screen.

**Data flow:** tRPC-driven server state. Manual log calls `cardio.create`, GPX import calls `cardio.previewGpx` (new) for preview then `cardio.importGpx` to persist. No local state beyond form inputs and tab/step tracking.

---

## File Structure

```
apps/web/src/
├── app/(app)/cardio/
│   └── new/
│       └── page.tsx                    # CREATE — route, renders CardioLogger
├── components/cardio/
│   ├── cardio-logger.tsx               # CREATE — orchestrator (tab state + completion)
│   ├── type-picker.tsx                 # CREATE — activity type grid (step 1 of manual)
│   ├── manual-cardio-form.tsx          # CREATE — duration/distance/details form (step 2)
│   ├── gpx-importer.tsx                # CREATE — file dropzone + upload
│   ├── gpx-preview.tsx                 # CREATE — parsed stats + route map + confirm
│   ├── cardio-summary.tsx              # CREATE — shared completion screen
│   └── route-map.tsx                   # CREATE — Leaflet polyline map (reusable)
packages/api/src/routers/
│   └── cardio.ts                       # MODIFY — add previewGpx mutation
```

---

## Backend Addition: `cardio.previewGpx` Mutation

Add a new tRPC mutation (not a query — the GPX payload can be up to 10MB, too large for URL-encoded query parameters) to the existing cardio router that parses a GPX file and returns stats + points without persisting to the database.

**Input:** Same as `importGpx` — `{ gpxContent: string (max 10MB), type?: CardioType }`

**Output:**
```typescript
{
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}
```

**Implementation:** Reuses the existing `parseGpx()` utility from `packages/api/src/lib/gpx.ts`. No database writes. ~10 lines wrapping the existing parser.

**`GpxStats` type** (used by GpxImporter, GpxPreview, and orchestrator state):
```typescript
{
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}
```

---

## New Dependencies

- `leaflet` — map rendering
- `react-leaflet` — React bindings for Leaflet
- `@types/leaflet` — TypeScript types

Install in `apps/web`.

---

## Component Designs

### Page: `/cardio/new`

Client component. Renders `CardioLogger` inside the existing `(app)` layout (which provides AppShell with nav).

### CardioLogger (Orchestrator)

**State:**
- `activeTab`: `"manual"` | `"gpx"` (default: `"manual"`)
- `manualStep`: `"type"` | `"form"` (default: `"type"`) — tracks manual sub-step
- `selectedType`: `CardioType | null` (default: `null`) — type chosen in TypePicker
- `gpxStep`: `"upload"` | `"preview"` (default: `"upload"`) — tracks GPX sub-step
- `gpxPreviewData`: `{ gpxContent: string; stats: GpxStats } | null` — cached preview for confirm step
- `completedSession`: `CardioSessionData | null` — when set, renders CardioSummary (hides tabs)

**`CardioSessionData` type** (subset of `cardio.create` / `cardio.importGpx` return):
```typescript
{
  id: string;
  type: string;
  source: string;
  durationSeconds: number;
  distanceMeters: number | Decimal | null;
  elevationGainM: number | Decimal | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  notes: string | null;
}
```

**Rendering:**
- Two tab buttons at the top: "Log Manually" | "Import GPX"
- When `activeTab === "manual"`: renders manual flow (TypePicker → ManualCardioForm)
- When `activeTab === "gpx"`: renders GpxImporter → GpxPreview flow
- When `completedSession` is set: renders CardioSummary (hides tabs)

**Tab styling:** Inline tab bar with underline indicator on active tab. Matches app's muted-foreground / foreground color scheme.

### TypePicker (Manual Step 1)

Grid of 8 activity type cards. 2 columns on mobile, 4 columns on desktop.

**Activity types with icons:**

| Type | Icon (lucide) |
|------|---------------|
| Run | `Footprints` |
| Cycle | `Bike` |
| Swim | `Waves` |
| Hike | `Mountain` |
| Walk | `PersonStanding` |
| Row | `Ship` |
| Elliptical | `Activity` |
| Other | `CircleDot` |

Each card: rounded border, icon + label centered, hover/active state. Tapping advances to ManualCardioForm with the selected type.

### ManualCardioForm (Manual Step 2)

**Props:** `type: CardioType`, `onBack: () => void`, `onComplete: (session) => void`

**Implicit fields:**
- **`startedAt`** — defaults to `new Date()` at submission time. No date/time picker in MVP.

**Required fields:**
- **Duration** — three side-by-side inputs: hours (0-99) / minutes (0-59) / seconds (0-59). All `inputMode="numeric"`. At least one must be non-zero.
- **Distance** — single input in km, `inputMode="decimal"`. Optional.

**Expandable "More details" section** (collapsed by default, toggle with chevron):
- Elevation gain — input in meters, `inputMode="numeric"`
- Avg heart rate — input in bpm, `inputMode="numeric"`
- Max heart rate — input in bpm, `inputMode="numeric"`
- Calories — input, `inputMode="numeric"`
- Notes — textarea, 3 rows

**Buttons:**
- "Back" (left) — returns to TypePicker
- "Save" (right, primary) — validates, converts duration to seconds, distance km→meters, calls `cardio.create` mutation

**On success:** Calls `onComplete` with `data.session` (unwrapped from the `{ session }` response wrapper).

**Cache invalidation:** On successful `cardio.create`, invalidate `cardio.list` via `utils.cardio.list.invalidate()` so the dashboard activity feed reflects the new session.

**Validation:**
- Duration must be > 0 seconds total
- Distance, if provided, must be > 0
- Heart rate values must be positive integers
- Max heart rate >= avg heart rate (if both provided)

**Error handling:** Inline field errors. Mutation error shown as a toast or inline banner.

### GpxImporter

**Props:** `onPreview: (gpxContent: string, stats: GpxStats) => void`

**UI:**
- Dashed border dropzone area, centered icon (Upload) + "Drop a .gpx file or click to browse"
- Hidden file input, accepts `.gpx` only
- On file select: reads via `FileReader.readAsText()`, calls `cardio.previewGpx` mutation
- Loading state: spinner replacing dropzone content
- Error state: red text below dropzone with error message, dropzone resets for retry

**File validation:**
- Must be `.gpx` extension
- Max 10MB (client-side check before upload)

### GpxPreview

**Props:** `gpxContent: string`, `stats: GpxStats`, `onConfirm: (session) => void`, `onCancel: () => void`

**UI:**
- **Route map** — `RouteMap` component showing the parsed route polyline. Height 300px.
- **Stats row** — four stats in a horizontal row: Distance (km), Duration (formatted), Pace (min/km, calculated client-side), Elevation Gain (m). Only shown if value is present.
- **Activity type selector** — dropdown (shadcn Select or simple button group) defaulting to "hike". Shows all 8 activity types.
- **Buttons:** "Cancel" (returns to GpxImporter dropzone) and "Confirm Import" (primary, calls `cardio.importGpx` with gpxContent + selected type)

**On success:** Calls `onConfirm` with `data.session` (unwrapped). Invalidates `cardio.list` via `utils.cardio.list.invalidate()`.

**Note:** The full GPX content is sent twice over the wire (once for preview, once for import). This is acceptable for MVP — files are typically 1-3MB and the alternative (server-side temp storage) adds complexity.

### CardioSummary (Shared Completion)

**Props:** `session: CardioSessionData`, `hasRoute: boolean`, `onDone: () => void`

**UI:**
- Activity type icon + **"Cardio Logged!"** heading
- **Stats row** — Duration, Distance (if present), Pace (if distance present), Elevation (if present). Same layout as workout completion.
- **Route map** (only for GPX-sourced sessions where `hasRoute` is true) — `RouteMap` showing the route, fetched via `cardio.getRoutePoints` query. Note: `getRoutePoints` returns `{ latitude, longitude }` fields which must be mapped to `{ lat, lng }` before passing to RouteMap.
- **Details list** (if any optional fields present) — heart rate, calories, notes shown in a simple key-value list inside a Card.
- **"Done" button** — full-width primary button, navigates to `/dashboard`

### RouteMap (Reusable)

**Props:**
- `points: { lat: number; lng: number }[]` — the polyline coordinates
- `height?: string` — CSS height (default `"300px"`)
- `interactive?: boolean` — enable zoom/pan (default `false`)

**Implementation:**
- Dynamically imported via `next/dynamic` with `ssr: false` (Leaflet requires `window`)
- OpenStreetMap tile layer (free, no API key)
- `Polyline` from `react-leaflet` in primary color (`hsl(var(--primary))`)
- Auto-fits bounds to polyline with `fitBounds` + padding
- Rounded corners via container `overflow-hidden rounded-xl`
- Leaflet CSS imported in the component file

---

## User Flows

### Manual Logging

1. User navigates to `/cardio/new` (via quick-start card or new-session sheet)
2. "Log Manually" tab is active by default
3. TypePicker shows — user taps an activity type (e.g., "Run")
4. ManualCardioForm shows with "Run" pre-selected
5. User enters duration (required), optionally distance, optionally expands "More details"
6. User taps "Save" → `cardio.create` mutation fires
7. On success → CardioSummary shows stats + "Done" button
8. User taps "Done" → navigates to `/dashboard`

### GPX Import

1. User navigates to `/cardio/new`, taps "Import GPX" tab
2. GpxImporter shows dropzone
3. User drops or selects a `.gpx` file
4. File is read, `cardio.previewGpx` is called → loading spinner
5. GpxPreview shows: route map, parsed stats, activity type selector
6. User optionally changes activity type, taps "Confirm Import"
7. `cardio.importGpx` mutation fires with the file content + selected type
8. On success → CardioSummary shows stats + route map + "Done" button
9. User taps "Done" → navigates to `/dashboard`

---

## Out of Scope (MVP)

- GPS live tracking (mobile app feature, needs `expo-location`)
- Lap tracking / split display
- Cardio session editing after creation
- Cardio session deletion
- Cardio detail page (`/cardio/[id]`) — future work
- Cardio history list page (`/cardio`) — sessions visible in dashboard activity feed
- Imperial unit conversion (km/meters only for MVP)
- Offline support / PowerSync
- Heart rate zone display
- Integration imports (Garmin, Strava) — Phase 2
