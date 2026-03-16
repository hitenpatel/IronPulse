# FIT File Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Garmin FIT files as cardio sessions with route data on the web app — same UX as the existing GPX import.

**Architecture:** FIT parser library converts binary FIT data to JSON. New tRPC mutations `cardio.previewFit` and `cardio.importFit` mirror the existing GPX flow. Web cardio logger gets a FIT tab alongside GPX. Reuses existing route map and preview components.

**Tech Stack:** `fit-file-parser`, tRPC, Prisma, existing web cardio components

**Spec:** Follows same pattern as GPX import in `docs/superpowers/specs/2026-03-13-cardio-logging-ui-design.md`

---

## File Structure

```
packages/api/src/lib/
└── fit.ts                                  # CREATE — FIT parser + data extraction

packages/api/__tests__/
└── fit.test.ts                             # CREATE — parser tests

packages/api/src/routers/
└── cardio.ts                               # MODIFY — add previewFit, importFit

packages/shared/src/schemas/
└── cardio.ts                               # MODIFY — add FIT schemas

apps/web/src/components/cardio/
├── gpx-importer.tsx                        # MODIFY — rename to file-importer or add FIT support
└── fit-importer.tsx                        # CREATE (or modify existing gpx-importer)
```

---

## Task 1: FIT Parser Library (TDD)

**Files:**
- Create: `packages/api/src/lib/fit.ts`
- Create: `packages/api/__tests__/fit.test.ts`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Install fit-file-parser**

Run: `pnpm --filter @ironpulse/api add fit-file-parser`

- [ ] **Step 2: Write FIT parser tests**

Create `packages/api/__tests__/fit.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mapFitActivityType, extractFitData } from "../src/lib/fit";

describe("mapFitActivityType", () => {
  it("maps running to run", () => expect(mapFitActivityType("running")).toBe("run"));
  it("maps cycling to cycle", () => expect(mapFitActivityType("cycling")).toBe("cycle"));
  it("maps swimming to swim", () => expect(mapFitActivityType("swimming")).toBe("swim"));
  it("maps hiking to hike", () => expect(mapFitActivityType("hiking")).toBe("hike"));
  it("maps walking to walk", () => expect(mapFitActivityType("walking")).toBe("walk"));
  it("maps unknown to other", () => expect(mapFitActivityType("yoga")).toBe("other"));
});

describe("extractFitData", () => {
  it("extracts session data from parsed FIT", () => {
    const mockParsed = {
      sessions: [{
        sport: "running",
        start_time: new Date("2026-03-16T10:00:00Z"),
        total_elapsed_time: 1800,
        total_distance: 5000,
        total_ascent: 50,
        avg_heart_rate: 150,
        max_heart_rate: 175,
        total_calories: 400,
      }],
      records: [
        { position_lat: 51.5, position_long: -0.1, altitude: 10, heart_rate: 120, timestamp: new Date("2026-03-16T10:00:00Z") },
        { position_lat: 51.501, position_long: -0.101, altitude: 15, heart_rate: 130, timestamp: new Date("2026-03-16T10:00:03Z") },
      ],
    };

    const result = extractFitData(mockParsed);

    expect(result.type).toBe("run");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.elevationGainM).toBe(50);
    expect(result.avgHeartRate).toBe(150);
    expect(result.calories).toBe(400);
    expect(result.points).toHaveLength(2);
    expect(result.points[0].latitude).toBe(51.5);
    expect(result.points[0].longitude).toBe(-0.1);
  });

  it("handles missing records gracefully", () => {
    const result = extractFitData({
      sessions: [{ sport: "cycling", start_time: new Date(), total_elapsed_time: 600 }],
      records: [],
    });
    expect(result.type).toBe("cycle");
    expect(result.points).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement FIT parser**

Create `packages/api/src/lib/fit.ts`:

```typescript
import FitParser from "fit-file-parser";

interface FitPoint {
  latitude: number;
  longitude: number;
  elevationM: number | null;
  heartRate: number | null;
  timestamp: Date;
}

interface FitData {
  type: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  elevationGainM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  points: FitPoint[];
}

const TYPE_MAP: Record<string, string> = {
  running: "run", trail_running: "run", treadmill_running: "run",
  cycling: "cycle", mountain_biking: "cycle",
  swimming: "swim", open_water_swimming: "swim",
  hiking: "hike",
  walking: "walk",
};

export function mapFitActivityType(sport: string): string {
  return TYPE_MAP[sport?.toLowerCase()] ?? "other";
}

export function extractFitData(parsed: any): FitData {
  const session = parsed.sessions?.[0] ?? {};
  const records = parsed.records ?? [];

  const points: FitPoint[] = records
    .filter((r: any) => r.position_lat != null && r.position_long != null)
    .map((r: any) => ({
      latitude: r.position_lat,
      longitude: r.position_long,
      elevationM: r.altitude ?? null,
      heartRate: r.heart_rate ?? null,
      timestamp: new Date(r.timestamp),
    }));

  return {
    type: mapFitActivityType(session.sport ?? "other"),
    startedAt: new Date(session.start_time ?? Date.now()),
    durationSeconds: Math.round(session.total_elapsed_time ?? 0),
    distanceMeters: session.total_distance ?? null,
    elevationGainM: session.total_ascent ?? null,
    avgHeartRate: session.avg_heart_rate ?? null,
    maxHeartRate: session.max_heart_rate ?? null,
    calories: session.total_calories ?? null,
    points,
  };
}

export async function parseFitFile(buffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, mode: "list" });
    parser.parse(buffer, (error: any, data: any) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ironpulse/api test -- fit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/fit.ts packages/api/__tests__/fit.test.ts packages/api/package.json pnpm-lock.yaml
git commit -m "add FIT file parser with type mapping and data extraction"
```

## Task 2: tRPC Mutations + Zod Schemas

**Files:**
- Modify: `packages/shared/src/schemas/cardio.ts`
- Modify: `packages/api/src/routers/cardio.ts`

- [ ] **Step 1: Add FIT schemas**

Add to `packages/shared/src/schemas/cardio.ts`:

```typescript
export const previewFitSchema = z.object({
  fileBase64: z.string(),
});

export const importFitSchema = z.object({
  fileBase64: z.string(),
  notes: z.string().optional(),
});
```

Export them from `packages/shared/src/index.ts` if not auto-exported.

- [ ] **Step 2: Add previewFit and importFit mutations to cardio router**

Read `packages/api/src/routers/cardio.ts` first to see the existing `previewGpx` and `importGpx` patterns.

Add `previewFit` (protectedProcedure, mutation):
1. Decode base64 → Buffer
2. Call `parseFitFile(buffer)`
3. Call `extractFitData(parsed)`
4. Return: type, duration, distance, elevation, heartRate, calories, pointCount, points (first/last for map preview)

Add `importFit` (protectedProcedure, mutation):
1. Decode base64 → Buffer
2. Parse and extract FIT data
3. Create `CardioSession` with source="fit"
4. Create `RoutePoint` rows from extracted points
5. Return the created session

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/cardio.ts packages/api/src/routers/cardio.ts
git commit -m "add previewFit and importFit tRPC mutations"
```

## Task 3: Web UI — FIT Import Tab

**Files:**
- Modify: `apps/web/src/components/cardio/cardio-logger.tsx` (or wherever the GPX/manual tab switcher is)
- Create or modify the file importer component to accept .fit files

- [ ] **Step 1: Read existing GPX import components**

Read these files to understand the current pattern:
- `apps/web/src/components/cardio/gpx-importer.tsx`
- `apps/web/src/components/cardio/gpx-preview.tsx`
- `apps/web/src/components/cardio/cardio-logger.tsx`

- [ ] **Step 2: Add FIT support to the importer**

The simplest approach: modify the existing GPX importer to also accept `.fit` files. When a `.fit` file is dropped:
- Read as ArrayBuffer, convert to base64
- Call `trpc.cardio.previewFit.mutate({ fileBase64 })` instead of `previewGpx`
- Show the same preview UI (stats + route map)
- On confirm, call `trpc.cardio.importFit.mutate({ fileBase64 })`

Update the file drop zone to accept both `.gpx` and `.fit` files. Detect by extension and route to the correct mutation.

- [ ] **Step 3: Verify web build**

Run: `pnpm --filter @ironpulse/web build`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/cardio/
git commit -m "add FIT file import support alongside GPX in cardio logger"
```

## Task 4: Add 'fit' to CardioSource + Verification

- [ ] **Step 1: Add 'fit' to CardioSource enum if not present**

Check `packages/shared/src/enums.ts` — if `FIT` is not already in the `CardioSource` enum, add it.

- [ ] **Step 2: Run all tests**

Run: `pnpm --filter @ironpulse/api test`
Run: `pnpm --filter @ironpulse/web build`

- [ ] **Step 3: Commit if needed**

```bash
git add packages/shared/src/enums.ts
git commit -m "add FIT to CardioSource enum"
```
