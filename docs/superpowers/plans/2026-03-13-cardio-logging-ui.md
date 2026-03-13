# Cardio Logging UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the cardio logging UI — manual session logging with type picker + form, GPX file import with preview, and shared completion summary with route map.

**Architecture:** Single-orchestrator pattern. `CardioLogger` manages tabs (manual/GPX) and step progression. Both flows converge on `CardioSummary`. tRPC-driven server state with React Query invalidation. One new backend mutation (`previewGpx`) wraps the existing `parseGpx` utility.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, shadcn/ui (new-york), lucide-react, tRPC React Query hooks, leaflet (raw API).

**Spec:** `docs/superpowers/specs/2026-03-13-cardio-logging-ui-design.md`

---

## File Structure

```
packages/api/src/routers/
│   └── cardio.ts                       # MODIFY — add previewGpx mutation
packages/shared/src/schemas/
│   └── cardio.ts                       # MODIFY — add previewGpxSchema, export it
apps/web/
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
```

---

## Chunk 1: Backend + Dependencies

### Task 1: Add `previewGpx` Mutation

**Files:**
- Modify: `packages/shared/src/schemas/cardio.ts`
- Modify: `packages/api/src/routers/cardio.ts`

- [ ] **Step 1: Add previewGpxSchema to shared schemas**

Add to `packages/shared/src/schemas/cardio.ts` after the existing `importGpxSchema`:

```typescript
export const previewGpxSchema = z.object({
  gpxContent: z.string().max(10_000_000),
});
export type PreviewGpxInput = z.infer<typeof previewGpxSchema>;
```

- [ ] **Step 2: Export previewGpxSchema from shared package**

Check `packages/shared/src/index.ts` and add `previewGpxSchema` to the cardio schema exports if not auto-exported.

- [ ] **Step 3: Add previewGpx mutation to cardio router**

Add to `packages/api/src/routers/cardio.ts`. Add `previewGpxSchema` to the import from `@ironpulse/shared`, then add the procedure after `importGpx`:

```typescript
  previewGpx: protectedProcedure
    .input(previewGpxSchema)
    .mutation(async ({ input }) => {
      const gpxData = parseGpx(input.gpxContent);
      return {
        points: gpxData.points,
        distanceMeters: gpxData.distanceMeters,
        elevationGainM: gpxData.elevationGainM,
        durationSeconds: gpxData.durationSeconds,
        startedAt: gpxData.startedAt,
      };
    }),
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/cardio.ts packages/shared/src/index.ts packages/api/src/routers/cardio.ts
git commit -m "add previewGpx mutation for GPX preview without persisting"
```

---

### Task 2: Install Leaflet Dependencies

- [ ] **Step 1: Install leaflet and types**

Run from project root:
```bash
pnpm --filter @ironpulse/web add leaflet
pnpm --filter @ironpulse/web add -D @types/leaflet
```

- [ ] **Step 2: Verify installation**

Run: `ls apps/web/node_modules/leaflet`
Expected: Directory exists.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "add leaflet dependency for route maps"
```

---

## Chunk 2: Foundation Components

### Task 3: Route Map Component

**Files:**
- Create: `apps/web/src/components/cardio/route-map.tsx`

- [ ] **Step 1: Create route map component**

Create `apps/web/src/components/cardio/route-map.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteMapProps {
  points: { lat: number; lng: number }[];
  height?: string;
  interactive?: boolean;
}

function RouteMapInner({ points, height = "300px", interactive = false }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const latLngs = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
    const polyline = L.polyline(latLngs, {
      color: "hsl(262, 83%, 58%)",
      weight: 3,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [points, interactive]);

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-xl"
    />
  );
}

export default RouteMapInner;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/route-map.tsx
git commit -m "add Leaflet route map component"
```

---

### Task 4: Type Picker Component

**Files:**
- Create: `apps/web/src/components/cardio/type-picker.tsx`

- [ ] **Step 1: Create type picker component**

Create `apps/web/src/components/cardio/type-picker.tsx`:

```tsx
"use client";

import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  PersonStanding,
  Ship,
  Activity,
  CircleDot,
} from "lucide-react";

const CARDIO_TYPES = [
  { value: "run", label: "Run", icon: Footprints },
  { value: "cycle", label: "Cycle", icon: Bike },
  { value: "swim", label: "Swim", icon: Waves },
  { value: "hike", label: "Hike", icon: Mountain },
  { value: "walk", label: "Walk", icon: PersonStanding },
  { value: "row", label: "Row", icon: Ship },
  { value: "elliptical", label: "Elliptical", icon: Activity },
  { value: "other", label: "Other", icon: CircleDot },
] as const;

interface TypePickerProps {
  onSelect: (type: string) => void;
}

export function TypePicker({ onSelect }: TypePickerProps) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        What type of cardio?
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDIO_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border px-4 py-5 transition-colors hover:border-foreground hover:bg-muted active:scale-95"
          >
            <Icon className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/type-picker.tsx
git commit -m "add cardio type picker grid component"
```

---

### Task 5: Cardio Summary Component

**Files:**
- Create: `apps/web/src/components/cardio/cardio-summary.tsx`

- [ ] **Step 1: Create cardio summary component**

Create `apps/web/src/components/cardio/cardio-summary.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  PersonStanding,
  Ship,
  Activity,
  CircleDot,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

const TYPE_ICONS: Record<string, React.ElementType> = {
  run: Footprints,
  cycle: Bike,
  swim: Waves,
  hike: Mountain,
  walk: PersonStanding,
  row: Ship,
  elliptical: Activity,
  other: CircleDot,
};

interface CardioSessionData {
  id: string;
  type: string;
  source: string;
  durationSeconds: number;
  distanceMeters: number | { toNumber(): number } | null;
  elevationGainM: number | { toNumber(): number } | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  calories?: number | null;
  notes?: string | null;
}

interface CardioSummaryProps {
  session: CardioSessionData;
  hasRoute: boolean;
  onDone: () => void;
}

export function CardioSummary({ session, hasRoute, onDone }: CardioSummaryProps) {
  const distance = session.distanceMeters != null ? Number(session.distanceMeters) : null;
  const elevation = session.elevationGainM != null ? Number(session.elevationGainM) : null;

  const routePoints = trpc.cardio.getRoutePoints.useQuery(
    { sessionId: session.id },
    { enabled: hasRoute }
  );

  const mapPoints = routePoints.data?.points.map((p) => ({
    lat: Number(p.latitude),
    lng: Number(p.longitude),
  }));

  const Icon = TYPE_ICONS[session.type] ?? Activity;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-3 text-2xl font-bold">Cardio Logged!</h2>

      {/* Stats */}
      <div className="mt-6 flex gap-6 text-center">
        <div>
          <p className="text-xl font-bold">
            {formatDuration(session.durationSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        {distance != null && distance > 0 && (
          <div>
            <p className="text-xl font-bold">{formatDistance(distance)}</p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
        )}
        {distance != null && distance > 0 && (
          <div>
            <p className="text-xl font-bold">
              {formatPace(distance, session.durationSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">Pace</p>
          </div>
        )}
        {elevation != null && elevation > 0 && (
          <div>
            <p className="text-xl font-bold">{Math.round(elevation)} m</p>
            <p className="text-xs text-muted-foreground">Elevation</p>
          </div>
        )}
      </div>

      {/* Route map */}
      {hasRoute && mapPoints && mapPoints.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <RouteMap points={mapPoints} height="250px" />
        </div>
      )}

      {/* Details */}
      {(session.avgHeartRate || session.maxHeartRate || session.calories || session.notes) && (
        <Card className="mt-6 w-full max-w-sm p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Details
          </p>
          <div className="space-y-2 text-sm">
            {session.avgHeartRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Heart Rate</span>
                <span>{session.avgHeartRate} bpm</span>
              </div>
            )}
            {session.maxHeartRate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Heart Rate</span>
                <span>{session.maxHeartRate} bpm</span>
              </div>
            )}
            {session.calories && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calories</span>
                <span>{session.calories} kcal</span>
              </div>
            )}
            {session.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{session.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Button onClick={onDone} className="mt-8 w-full max-w-sm" size="lg">
        Done
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/cardio-summary.tsx
git commit -m "add cardio completion summary with route map and stats"
```

---

## Chunk 3: Manual Logging Flow

### Task 6: Manual Cardio Form

**Files:**
- Create: `apps/web/src/components/cardio/manual-cardio-form.tsx`

- [ ] **Step 1: Create manual cardio form component**

Create `apps/web/src/components/cardio/manual-cardio-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface ManualCardioFormProps {
  type: string;
  onBack: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: (session: any) => void;
}

export function ManualCardioForm({
  type,
  onBack,
  onComplete,
}: ManualCardioFormProps) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [elevationM, setElevationM] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const createCardio = trpc.cardio.create.useMutation({
    onSuccess: (data) => {
      utils.cardio.list.invalidate();
      onComplete(data.session);
    },
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    const totalSeconds =
      (parseInt(hours || "0", 10) || 0) * 3600 +
      (parseInt(minutes || "0", 10) || 0) * 60 +
      (parseInt(seconds || "0", 10) || 0);

    if (totalSeconds <= 0) {
      newErrors.duration = "Duration must be greater than 0";
    }

    if (distanceKm) {
      const dist = parseFloat(distanceKm);
      if (isNaN(dist) || dist <= 0) {
        newErrors.distance = "Distance must be greater than 0";
      }
    }

    if (avgHr) {
      const val = parseInt(avgHr, 10);
      if (isNaN(val) || val <= 0) {
        newErrors.avgHr = "Must be a positive number";
      }
    }

    if (maxHr) {
      const val = parseInt(maxHr, 10);
      if (isNaN(val) || val <= 0) {
        newErrors.maxHr = "Must be a positive number";
      }
    }

    if (avgHr && maxHr) {
      const avg = parseInt(avgHr, 10);
      const max = parseInt(maxHr, 10);
      if (!isNaN(avg) && !isNaN(max) && max < avg) {
        newErrors.maxHr = "Must be >= avg heart rate";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const durationSeconds =
      (parseInt(hours || "0", 10) || 0) * 3600 +
      (parseInt(minutes || "0", 10) || 0) * 60 +
      (parseInt(seconds || "0", 10) || 0);

    createCardio.mutate({
      type: type as "run" | "cycle" | "swim" | "hike" | "walk" | "row" | "elliptical" | "other",
      startedAt: new Date(),
      durationSeconds,
      ...(distanceKm && { distanceMeters: parseFloat(distanceKm) * 1000 }),
      ...(elevationM && { elevationGainM: parseFloat(elevationM) }),
      ...(avgHr && { avgHeartRate: parseInt(avgHr, 10) }),
      ...(maxHr && { maxHeartRate: parseInt(maxHr, 10) }),
      ...(calories && { calories: parseInt(calories, 10) }),
      ...(notes.trim() && { notes: notes.trim() }),
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm font-medium capitalize text-primary">
        {type}
      </p>

      {/* Duration */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Duration *
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">hr</p>
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">min</p>
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">sec</p>
          </div>
        </div>
        {errors.duration && (
          <p className="mt-1 text-xs text-destructive">{errors.duration}</p>
        )}
      </div>

      {/* Distance */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Distance (km)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          placeholder="—"
          className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.distance && (
          <p className="mt-1 text-xs text-destructive">{errors.distance}</p>
        )}
      </div>

      {/* More details toggle */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        More details
        {showMore ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showMore && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Elevation Gain (m)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={elevationM}
              onChange={(e) => setElevationM(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Avg Heart Rate (bpm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.avgHr && (
              <p className="mt-1 text-xs text-destructive">{errors.avgHr}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Max Heart Rate (bpm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.maxHr && (
              <p className="mt-1 text-xs text-destructive">{errors.maxHr}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Calories
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How did it feel?"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Mutation error */}
      {createCardio.error && (
        <p className="mb-4 text-sm text-destructive">
          {createCardio.error.message}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={createCardio.isPending}
          className="flex-1"
        >
          {createCardio.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/manual-cardio-form.tsx
git commit -m "add manual cardio form with duration, distance, and expandable details"
```

---

## Chunk 4: GPX Import Flow

### Task 7: GPX Importer Component

**Files:**
- Create: `apps/web/src/components/cardio/gpx-importer.tsx`

- [ ] **Step 1: Create GPX importer component**

Create `apps/web/src/components/cardio/gpx-importer.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

interface GpxImporterProps {
  onPreview: (gpxContent: string, stats: GpxStats) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function GpxImporter({ onPreview }: GpxImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewGpx = trpc.cardio.previewGpx.useMutation({
    onSuccess: (data, variables) => {
      onPreview(variables.gpxContent, data);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleFile(file: File) {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError("Please select a .gpx file");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (max 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      previewGpx.mutate({ gpxContent: content });
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleInputChange}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={previewGpx.isPending}
        className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-12 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground"
        } ${previewGpx.isPending ? "opacity-50" : ""}`}
      >
        {previewGpx.isPending ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">Parsing GPX file...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop a .gpx file or click to browse
            </span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/gpx-importer.tsx
git commit -m "add GPX file importer with drag-and-drop"
```

---

### Task 8: GPX Preview Component

**Files:**
- Create: `apps/web/src/components/cardio/gpx-preview.tsx`

- [ ] **Step 1: Create GPX preview component**

Create `apps/web/src/components/cardio/gpx-preview.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatDuration, formatDistance, formatPace } from "@/lib/format";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

const CARDIO_TYPES = [
  { value: "run", label: "Run" },
  { value: "cycle", label: "Cycle" },
  { value: "swim", label: "Swim" },
  { value: "hike", label: "Hike" },
  { value: "walk", label: "Walk" },
  { value: "row", label: "Row" },
  { value: "elliptical", label: "Elliptical" },
  { value: "other", label: "Other" },
] as const;

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

interface GpxPreviewProps {
  gpxContent: string;
  stats: GpxStats;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfirm: (session: any) => void;
  onCancel: () => void;
}

export function GpxPreview({
  gpxContent,
  stats,
  onConfirm,
  onCancel,
}: GpxPreviewProps) {
  const [selectedType, setSelectedType] = useState("hike");

  const utils = trpc.useUtils();
  const importGpx = trpc.cardio.importGpx.useMutation({
    onSuccess: (data) => {
      utils.cardio.list.invalidate();
      onConfirm(data.session as unknown as Record<string, unknown>);
    },
  });

  const mapPoints = stats.points.map((p) => ({ lat: p.lat, lng: p.lng }));

  function handleConfirm() {
    importGpx.mutate({
      gpxContent,
      type: selectedType as "run" | "cycle" | "swim" | "hike" | "walk" | "row" | "elliptical" | "other",
    });
  }

  return (
    <div>
      {/* Route map */}
      {mapPoints.length > 0 && (
        <div className="mb-4">
          <RouteMap points={mapPoints} height="300px" />
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 flex gap-6 text-center">
        {stats.distanceMeters > 0 && (
          <div>
            <p className="text-lg font-bold">
              {formatDistance(stats.distanceMeters)}
            </p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
        )}
        <div>
          <p className="text-lg font-bold">
            {formatDuration(stats.durationSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
        {stats.distanceMeters > 0 && (
          <div>
            <p className="text-lg font-bold">
              {formatPace(stats.distanceMeters, stats.durationSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">Pace</p>
          </div>
        )}
        {stats.elevationGainM > 0 && (
          <div>
            <p className="text-lg font-bold">
              {Math.round(stats.elevationGainM)} m
            </p>
            <p className="text-xs text-muted-foreground">Elevation</p>
          </div>
        )}
      </div>

      {/* Activity type selector */}
      <div className="mb-6">
        <p className="mb-2 text-sm text-muted-foreground">Activity type</p>
        <div className="flex flex-wrap gap-2">
          {CARDIO_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                selectedType === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mutation error */}
      {importGpx.error && (
        <p className="mb-4 text-sm text-destructive">
          {importGpx.error.message}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={importGpx.isPending}
          className="flex-1"
        >
          {importGpx.isPending ? "Importing..." : "Confirm Import"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/gpx-preview.tsx
git commit -m "add GPX preview with route map, stats, and type selector"
```

---

## Chunk 5: Orchestrator and Page

### Task 9: CardioLogger Orchestrator

**Files:**
- Create: `apps/web/src/components/cardio/cardio-logger.tsx`

- [ ] **Step 1: Create cardio logger orchestrator**

Create `apps/web/src/components/cardio/cardio-logger.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TypePicker } from "./type-picker";
import { ManualCardioForm } from "./manual-cardio-form";
import { GpxImporter } from "./gpx-importer";
import { GpxPreview } from "./gpx-preview";
import { CardioSummary } from "./cardio-summary";

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

type Tab = "manual" | "gpx";
type ManualStep = "type" | "form";
type GpxStep = "upload" | "preview";

export function CardioLogger() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [manualStep, setManualStep] = useState<ManualStep>("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [gpxStep, setGpxStep] = useState<GpxStep>("upload");
  const [gpxPreviewData, setGpxPreviewData] = useState<{
    gpxContent: string;
    stats: GpxStats;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [completedSession, setCompletedSession] = useState<any>(null);
  const [completedSource, setCompletedSource] = useState<string>("manual");

  function handleTypeSelected(type: string) {
    setSelectedType(type);
    setManualStep("form");
  }

  function handleManualBack() {
    setManualStep("type");
    setSelectedType(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleManualComplete(session: any) {
    setCompletedSource("manual");
    setCompletedSession(session);
  }

  function handleGpxPreview(gpxContent: string, stats: GpxStats) {
    setGpxPreviewData({ gpxContent, stats });
    setGpxStep("preview");
  }

  function handleGpxCancel() {
    setGpxStep("upload");
    setGpxPreviewData(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleGpxConfirm(session: any) {
    setCompletedSource("gpx");
    setCompletedSession(session);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // Reset sub-steps when switching tabs
    setManualStep("type");
    setSelectedType(null);
    setGpxStep("upload");
    setGpxPreviewData(null);
  }

  // Completion screen
  if (completedSession) {
    return (
      <CardioSummary
        session={completedSession}
        hasRoute={completedSource === "gpx"}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex border-b border-border">
        <button
          onClick={() => handleTabChange("manual")}
          className={cn(
            "flex-1 pb-2 text-center text-sm font-medium transition-colors",
            activeTab === "manual"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Log Manually
        </button>
        <button
          onClick={() => handleTabChange("gpx")}
          className={cn(
            "flex-1 pb-2 text-center text-sm font-medium transition-colors",
            activeTab === "gpx"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Import GPX
        </button>
      </div>

      {/* Manual flow */}
      {activeTab === "manual" && manualStep === "type" && (
        <TypePicker onSelect={handleTypeSelected} />
      )}
      {activeTab === "manual" && manualStep === "form" && selectedType && (
        <ManualCardioForm
          type={selectedType}
          onBack={handleManualBack}
          onComplete={handleManualComplete}
        />
      )}

      {/* GPX flow */}
      {activeTab === "gpx" && gpxStep === "upload" && (
        <GpxImporter onPreview={handleGpxPreview} />
      )}
      {activeTab === "gpx" && gpxStep === "preview" && gpxPreviewData && (
        <GpxPreview
          gpxContent={gpxPreviewData.gpxContent}
          stats={gpxPreviewData.stats}
          onConfirm={handleGpxConfirm}
          onCancel={handleGpxCancel}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/cardio/cardio-logger.tsx
git commit -m "add cardio logger orchestrator with tab navigation and step management"
```

---

### Task 10: Cardio Page

**Files:**
- Create: `apps/web/src/app/(app)/cardio/new/page.tsx`

- [ ] **Step 1: Create cardio page**

```bash
mkdir -p "apps/web/src/app/(app)/cardio/new"
```

Create `apps/web/src/app/(app)/cardio/new/page.tsx`:

```tsx
"use client";

import { CardioLogger } from "@/components/cardio/cardio-logger";

export default function NewCardioPage() {
  return <CardioLogger />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(app)/cardio/new/page.tsx"
git commit -m "add cardio logging page at /cardio/new"
```

---

## Chunk 6: Integration and Verification

### Task 11: Full Build Verification

- [ ] **Step 1: Run all tests**

Run: `cd apps/web && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run full build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds. The `/cardio/new` route should appear in the build output.

- [ ] **Step 3: Verify all files exist**

Run:
```bash
ls apps/web/src/components/cardio/
ls "apps/web/src/app/(app)/cardio/new/"
```

Expected:
- `cardio/`: `cardio-logger.tsx`, `cardio-summary.tsx`, `gpx-importer.tsx`, `gpx-preview.tsx`, `manual-cardio-form.tsx`, `route-map.tsx`, `type-picker.tsx`
- `cardio/new/`: `page.tsx`
