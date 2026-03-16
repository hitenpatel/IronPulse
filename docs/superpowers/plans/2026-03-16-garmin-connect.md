# Garmin Connect Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Garmin Connect activities into IronPulse as cardio sessions via OAuth 2.0 + push notifications — same architecture as Strava integration.

**Architecture:** Mirrors Strava: OAuth 2.0 (PKCE) connects user's Garmin account, push notifications trigger activity imports, Garmin API client fetches activity details + GPX files for route data. Uses existing DeviceConnection model, encryption, and Connected Apps UI pattern.

**Tech Stack:** Garmin Connect API, Next.js API routes, tRPC, Prisma, existing GPX parser, AES-256-GCM encryption

**Spec:** Same architecture as `docs/superpowers/specs/2026-03-15-strava-integration-design.md` with Garmin-specific endpoints.

---

## File Structure

```
packages/api/src/lib/
└── garmin.ts                                   # CREATE — Garmin API client + type mapping

packages/api/__tests__/
└── garmin.test.ts                              # CREATE — type mapping + data mapping tests

packages/api/src/routers/
└── integration.ts                              # MODIFY — add Garmin-specific methods

apps/web/src/app/api/garmin/
├── connect/route.ts                            # CREATE — OAuth redirect (PKCE)
├── callback/route.ts                           # CREATE — OAuth callback
└── webhook/route.ts                            # CREATE — push notification handler

apps/web/src/app/(app)/settings/integrations/
└── page.tsx                                    # MODIFY — add Garmin card

apps/mobile/app/settings/
└── integrations.tsx                            # MODIFY — add Garmin card

.env.example                                    # MODIFY — add Garmin vars
docker/.env.example                             # MODIFY — add Garmin vars

apps/mobile/e2e/
└── integrations.yaml                           # MODIFY — assert Garmin visible
```

---

## Chunk 1: Garmin API Client + Tests

### Task 1: Garmin API Client (TDD)

**Files:**
- Create: `packages/api/src/lib/garmin.ts`
- Create: `packages/api/__tests__/garmin.test.ts`

- [ ] **Step 1: Write tests**

Create `packages/api/__tests__/garmin.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mapGarminType, mapGarminActivity } from "../src/lib/garmin";

describe("mapGarminType", () => {
  it("maps running to run", () => expect(mapGarminType("running")).toBe("run"));
  it("maps cycling to cycle", () => expect(mapGarminType("cycling")).toBe("cycle"));
  it("maps swimming to swim", () => expect(mapGarminType("swimming")).toBe("swim"));
  it("maps hiking to hike", () => expect(mapGarminType("hiking")).toBe("hike"));
  it("maps walking to walk", () => expect(mapGarminType("walking")).toBe("walk"));
  it("maps trail_running to run", () => expect(mapGarminType("trail_running")).toBe("run"));
  it("maps mountain_biking to cycle", () => expect(mapGarminType("mountain_biking")).toBe("cycle"));
  it("maps unknown to other", () => expect(mapGarminType("yoga")).toBe("other"));
});

describe("mapGarminActivity", () => {
  it("maps a Garmin activity summary to CardioSession fields", () => {
    const result = mapGarminActivity({
      activityId: 12345,
      activityType: "running",
      startTimeInSeconds: 1710500000,
      durationInSeconds: 1800,
      distanceInMeters: 5000,
      elevationGainInMeters: 50,
      averageHeartRateInBeatsPerMinute: 150,
      maxHeartRateInBeatsPerMinute: 175,
      activeKilocalories: 400,
    }, "user-123");

    expect(result.externalId).toBe("garmin:12345");
    expect(result.type).toBe("run");
    expect(result.source).toBe("garmin");
    expect(result.userId).toBe("user-123");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.elevationGainM).toBe(50);
    expect(result.avgHeartRate).toBe(150);
    expect(result.calories).toBe(400);
  });

  it("handles missing optional fields", () => {
    const result = mapGarminActivity({
      activityId: 99, activityType: "swimming",
      startTimeInSeconds: 1710500000, durationInSeconds: 600,
    }, "user-123");

    expect(result.distanceMeters).toBeUndefined();
    expect(result.avgHeartRate).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement Garmin client**

Create `packages/api/src/lib/garmin.ts`:

```typescript
import crypto from "crypto";
import { encryptToken, decryptToken } from "./encryption";

const GARMIN_API = "https://apis.garmin.com";

const TYPE_MAP: Record<string, string> = {
  running: "run", trail_running: "run", treadmill_running: "run",
  cycling: "cycle", mountain_biking: "cycle", indoor_cycling: "cycle",
  swimming: "swim", open_water_swimming: "swim", lap_swimming: "swim",
  hiking: "hike",
  walking: "walk",
};

export function mapGarminType(garminType: string): string {
  return TYPE_MAP[garminType.toLowerCase()] ?? "other";
}

export function mapGarminActivity(activity: any, userId: string) {
  return {
    externalId: `garmin:${activity.activityId}`,
    userId,
    type: mapGarminType(activity.activityType ?? "other"),
    source: "garmin",
    startedAt: new Date(activity.startTimeInSeconds * 1000),
    durationSeconds: activity.durationInSeconds,
    distanceMeters: activity.distanceInMeters ?? undefined,
    elevationGainM: activity.elevationGainInMeters ?? undefined,
    avgHeartRate: activity.averageHeartRateInBeatsPerMinute ?? undefined,
    maxHeartRate: activity.maxHeartRateInBeatsPerMinute ?? undefined,
    calories: activity.activeKilocalories ?? undefined,
  };
}

export async function fetchGarminApi(path: string, accessToken: string) {
  const res = await fetch(`${GARMIN_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) {
    throw Object.assign(new Error("Garmin rate limit"), { retryAfter: 60 });
  }
  if (!res.ok) throw new Error(`Garmin API error: ${res.status}`);
  return res.json();
}

export async function getActivityFile(accessToken: string, activityId: number, format: "gpx" | "tcx" = "gpx"): Promise<string> {
  const res = await fetch(`${GARMIN_API}/activity-service/activity/${activityId}/${format}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Garmin file download error: ${res.status}`);
  return res.text();
}

export async function refreshGarminToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch("https://connectapi.garmin.com/oauth-service/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Garmin token refresh failed: ${res.status}`);
  return res.json();
}

export async function revokeGarminToken(accessToken: string) {
  await fetch("https://connectapi.garmin.com/oauth-service/oauth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: accessToken }),
  }).catch(() => {});
}

export async function ensureGarminFreshToken(connection: any, db: any) {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }
  const clientId = process.env.GARMIN_CLIENT_ID!;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET!;
  const refreshed = await refreshGarminToken(clientId, clientSecret, decryptToken(connection.refreshToken));
  await db.deviceConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      refreshToken: encryptToken(refreshed.refresh_token),
      tokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 7776000) * 1000),
    },
  });
  return refreshed.access_token;
}

export async function importGarminActivity(activityId: number, connection: any, db: any) {
  const accessToken = await ensureGarminFreshToken(connection, db);

  // Dedup
  const existing = await db.cardioSession.findFirst({
    where: { externalId: `garmin:${activityId}` },
  });
  if (existing) return null;

  // Fetch activity summary from the push notification data
  // Garmin push notifications include the activity summary inline
  // For manual sync, fetch from API
  const activity = await fetchGarminApi(`/activity-service/activity/${activityId}`, accessToken).catch(() => null);
  if (!activity) return null;

  const mapped = mapGarminActivity(activity, connection.userId);

  const session = await db.cardioSession.create({
    data: { id: crypto.randomUUID(), ...mapped },
  });

  // Try to download GPX for route data
  try {
    const gpxText = await getActivityFile(accessToken, activityId, "gpx");
    // Use existing GPX parser
    const { parseGpx } = await import("./gpx");
    const parsed = parseGpx(gpxText);
    if (parsed.points.length > 0) {
      await db.routePoint.createMany({
        data: parsed.points.map((p: any) => ({
          id: crypto.randomUUID(),
          sessionId: session.id,
          latitude: p.lat,
          longitude: p.lon,
          elevationM: p.ele ?? null,
          heartRate: null,
          timestamp: new Date(p.time),
        })),
      });
    }
  } catch {
    // GPX not available for all activities
  }

  return session;
}

export async function runGarminBackfill(connectionId: string, db: any) {
  const connection = await db.deviceConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return;

  const accessToken = await ensureGarminFreshToken(connection, db);

  // Garmin doesn't have a simple "list activities" endpoint like Strava
  // The push notification approach handles new activities
  // For backfill, we rely on the activity file list endpoint
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const activities = await fetchGarminApi(
      `/activity-service/activities?uploadStartTimeInSeconds=${thirtyDaysAgo}&uploadEndTimeInSeconds=${now}`,
      accessToken
    );

    for (const activity of activities ?? []) {
      try {
        await importGarminActivity(activity.activityId, connection, db);
      } catch (err: any) {
        if (err.retryAfter) {
          await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
          await importGarminActivity(activity.activityId, connection, db).catch(() => {});
        }
      }
    }
  } catch {
    // Backfill failed — not critical
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @ironpulse/api test -- garmin`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/garmin.ts packages/api/__tests__/garmin.test.ts
git commit -m "add Garmin Connect API client with type mapping and activity import"
```

---

## Chunk 2: OAuth + Webhook Routes

### Task 2: Garmin OAuth + Webhook

**Files:**
- Create: `apps/web/src/app/api/garmin/connect/route.ts`
- Create: `apps/web/src/app/api/garmin/callback/route.ts`
- Create: `apps/web/src/app/api/garmin/webhook/route.ts`
- Modify: `packages/api/src/routers/integration.ts`

- [ ] **Step 1: Create connect route**

Create `apps/web/src/app/api/garmin/connect/route.ts` — same pattern as Strava connect but with PKCE:
- Generate `code_verifier` (random 64 bytes, base64url encoded) and `code_challenge` (SHA256 of verifier, base64url encoded)
- Store `state → { userId, codeVerifier }` in Redis (10 min TTL)
- Redirect to `https://connectapi.garmin.com/oauth-service/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=activity:read&code_challenge=...&code_challenge_method=S256&state=...`

- [ ] **Step 2: Create callback route**

Create `apps/web/src/app/api/garmin/callback/route.ts` — same pattern as Strava callback:
- Verify state from Redis, extract codeVerifier
- Exchange code for tokens: POST to `https://connectapi.garmin.com/oauth-service/oauth/token` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `code_verifier`
- Upsert DeviceConnection with provider="garmin"
- Fire-and-forget backfill
- Redirect to Connected Apps

- [ ] **Step 3: Create webhook route**

Create `apps/web/src/app/api/garmin/webhook/route.ts`:
- POST handler receives push notifications from Garmin
- Garmin sends JSON with activity summaries including `userId` (Garmin user ID)
- Look up DeviceConnection by provider="garmin" and providerAccountId
- For each activity in the payload, call `importGarminActivity()`
- Always return 200

- [ ] **Step 4: Add completeGarminAuth to integration router**

Add to `packages/api/src/routers/integration.ts`:
```typescript
completeGarminAuth: protectedProcedure
  .input(z.object({ code: z.string(), codeVerifier: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Exchange code for tokens with PKCE
    // Same pattern as completeStravaAuth but with code_verifier
  }),
```

- [ ] **Step 5: Update disconnect to handle Garmin**

In the existing `disconnectProvider` mutation, add Garmin token revocation:
```typescript
if (input.provider === "garmin") {
  await revokeGarminToken(accessToken);
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/garmin/ packages/api/src/routers/integration.ts
git commit -m "add Garmin Connect OAuth (PKCE), webhook, and auth completion"
```

---

## Chunk 3: UI + Config + Verification

### Task 3: Connected Apps UI + Environment

**Files:**
- Modify: `apps/web/src/app/(app)/settings/integrations/page.tsx`
- Modify: `apps/mobile/app/settings/integrations.tsx`
- Modify: `.env.example`
- Modify: `docker/.env.example`

- [ ] **Step 1: Add Garmin card to web Connected Apps**

In `apps/web/src/app/(app)/settings/integrations/page.tsx`, add a Garmin card below Strava. Same pattern — connect links to `/api/garmin/connect`, disconnect calls `integration.disconnectProvider.mutate({ provider: "garmin" })`.

- [ ] **Step 2: Add Garmin card to mobile Connected Apps**

In `apps/mobile/app/settings/integrations.tsx`, add a Garmin card below Strava (above HealthKit). Same pattern as Strava — opens web OAuth URL via `Linking.openURL`. Use `Watch` icon from lucide-react-native.

- [ ] **Step 3: Update env files**

Add to `.env.example` and `docker/.env.example`:
```env
# Garmin Connect
GARMIN_CLIENT_ID=""
GARMIN_CLIENT_SECRET=""
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @ironpulse/api test -- garmin`
Run: `pnpm --filter @ironpulse/web build`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/ apps/mobile/app/settings/ .env.example docker/.env.example
git commit -m "add Garmin Connect card to Connected Apps and env configuration"
```
