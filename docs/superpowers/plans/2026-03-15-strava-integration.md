# Strava Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Strava activities into IronPulse as cardio sessions with route data via OAuth + webhook-driven sync.

**Architecture:** Server-side integration — OAuth connects user's Strava account, webhooks trigger activity imports, Strava API client fetches activity details + route streams, data stored as CardioSession + RoutePoint rows. Tokens encrypted at rest with AES-256-GCM. Connected Apps UI on web + mobile.

**Tech Stack:** Strava API v3, Next.js API routes (OAuth + webhook), tRPC (integration router), Prisma (DeviceConnection model), AES-256-GCM encryption, Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-strava-integration-design.md`

---

## File Structure

```
packages/db/prisma/
└── schema.prisma                               # MODIFY — add DeviceConnection, index on externalId

packages/shared/src/schemas/
└── integration.ts                              # CREATE — Zod schemas

packages/api/src/
├── lib/
│   ├── encryption.ts                           # CREATE — AES-256-GCM
│   └── strava.ts                               # CREATE — Strava API client
├── routers/
│   └── integration.ts                          # CREATE — tRPC router
└── root.ts                                     # MODIFY — register router

packages/api/__tests__/
├── encryption.test.ts                          # CREATE
├── strava.test.ts                              # CREATE
└── integration.test.ts                         # CREATE

apps/web/src/app/
├── api/strava/
│   ├── connect/route.ts                        # CREATE — OAuth redirect
│   ├── callback/route.ts                       # CREATE — OAuth callback
│   └── webhook/route.ts                        # CREATE — webhook handler
├── (app)/settings/integrations/page.tsx         # CREATE — Connected Apps
└── (app)/profile/page.tsx                      # MODIFY — add link

apps/mobile/
├── app/settings/
│   ├── _layout.tsx                             # CREATE
│   └── integrations.tsx                        # CREATE — Connected Apps
├── app/(tabs)/profile.tsx                      # MODIFY — add link
└── e2e/integrations.yaml                       # CREATE

.env.example                                    # MODIFY — add Strava vars
docker/.env.example                             # MODIFY — add Strava vars
```

---

## Chunk 1: Data Model + Encryption + Strava Client

### Task 1: Prisma Schema Changes

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add DeviceConnection model**

Add to `packages/db/prisma/schema.prisma` after the `PersonalRecord` model:

```prisma
model DeviceConnection {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  provider          String
  providerAccountId String   @map("provider_account_id")
  accessToken       String   @map("access_token")
  refreshToken      String   @map("refresh_token")
  tokenExpiresAt    DateTime @map("token_expires_at")
  lastSyncedAt      DateTime? @map("last_synced_at")
  syncEnabled       Boolean  @default(true) @map("sync_enabled")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("device_connections")
}
```

- [ ] **Step 2: Add relation to User model**

In the `User` model, add: `deviceConnections DeviceConnection[]`

- [ ] **Step 3: Add index on CardioSession.externalId**

In the `CardioSession` model, add: `@@index([externalId])` (after the existing `@@index([userId, startedAt])`)

- [ ] **Step 4: Push schema changes**

Run: `pnpm --filter @ironpulse/db exec prisma db push`

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "add DeviceConnection model and externalId index for Strava integration"
```

### Task 2: Token Encryption (TDD)

**Files:**
- Create: `packages/api/src/lib/encryption.ts`
- Create: `packages/api/__tests__/encryption.test.ts`

- [ ] **Step 1: Write encryption tests**

Create `packages/api/__tests__/encryption.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../src/lib/encryption";

describe("token encryption", () => {
  it("round-trips: encrypt then decrypt returns original", () => {
    const original = "sk_test_abc123_very_secret_token";
    const encrypted = encryptToken(original);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const token = "same_token";
    const a = encryptToken(token);
    const b = encryptToken(token);
    expect(a).not.toBe(b);
  });

  it("ciphertext has three colon-separated hex parts", () => {
    const encrypted = encryptToken("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(/^[0-9a-f]+$/.test(p)).toBe(true));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("test");
    const tampered = encrypted.slice(0, -2) + "ff";
    expect(() => decryptToken(tampered)).toThrow();
  });
});
```

- [ ] **Step 2: Implement encryption**

Create `packages/api/src/lib/encryption.ts`:

```typescript
import crypto from "crypto";

function getKey(): Buffer {
  const secret = process.env.DEVICE_TOKEN_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("DEVICE_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @ironpulse/api test -- encryption`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/encryption.ts packages/api/__tests__/encryption.test.ts
git commit -m "add AES-256-GCM token encryption with tests"
```

### Task 3: Strava API Client + Type Mapping (TDD)

**Files:**
- Create: `packages/api/src/lib/strava.ts`
- Create: `packages/api/__tests__/strava.test.ts`

- [ ] **Step 1: Write Strava utility tests**

Create `packages/api/__tests__/strava.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mapStravaType, mapStravaActivity, mapStravaStreamsToRoutePoints } from "../src/lib/strava";

describe("mapStravaType", () => {
  it("maps Run to run", () => expect(mapStravaType("Run")).toBe("run"));
  it("maps Ride to cycle", () => expect(mapStravaType("Ride")).toBe("cycle"));
  it("maps Swim to swim", () => expect(mapStravaType("Swim")).toBe("swim"));
  it("maps Hike to hike", () => expect(mapStravaType("Hike")).toBe("hike"));
  it("maps Walk to walk", () => expect(mapStravaType("Walk")).toBe("walk"));
  it("maps VirtualRun to run", () => expect(mapStravaType("VirtualRun")).toBe("run"));
  it("maps VirtualRide to cycle", () => expect(mapStravaType("VirtualRide")).toBe("cycle"));
  it("maps unknown to other", () => expect(mapStravaType("Yoga")).toBe("other"));
});

describe("mapStravaActivity", () => {
  it("maps a Strava activity to CardioSession fields", () => {
    const result = mapStravaActivity({
      id: 12345,
      type: "Run",
      start_date: "2026-03-15T10:00:00Z",
      elapsed_time: 1800,
      distance: 5000,
      total_elevation_gain: 50,
      average_heartrate: 150,
      max_heartrate: 175,
      calories: 400,
      description: "Morning run",
    }, "user-123");

    expect(result.externalId).toBe("strava:12345");
    expect(result.type).toBe("run");
    expect(result.source).toBe("strava");
    expect(result.userId).toBe("user-123");
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.elevationGainM).toBe(50);
    expect(result.avgHeartRate).toBe(150);
    expect(result.notes).toBe("Morning run");
  });

  it("handles missing optional fields", () => {
    const result = mapStravaActivity({
      id: 99, type: "Swim", start_date: "2026-03-15T10:00:00Z",
      elapsed_time: 600, distance: 500,
    }, "user-123");

    expect(result.avgHeartRate).toBeUndefined();
    expect(result.elevationGainM).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });
});

describe("mapStravaStreamsToRoutePoints", () => {
  it("maps streams to route point arrays", () => {
    const points = mapStravaStreamsToRoutePoints(
      {
        latlng: { data: [[51.5, -0.1], [51.501, -0.101]] },
        altitude: { data: [10, 15] },
        heartrate: { data: [120, 130] },
        time: { data: [0, 5] },
      },
      "2026-03-15T10:00:00Z",
      "session-1"
    );

    expect(points).toHaveLength(2);
    expect(points[0].latitude).toBe(51.5);
    expect(points[0].longitude).toBe(-0.1);
    expect(points[0].elevationM).toBe(10);
    expect(points[0].heartRate).toBe(120);
    expect(points[1].latitude).toBe(51.501);
  });

  it("handles missing streams gracefully", () => {
    const points = mapStravaStreamsToRoutePoints(
      { latlng: { data: [[51.5, -0.1]] } },
      "2026-03-15T10:00:00Z",
      "session-1"
    );
    expect(points).toHaveLength(1);
    expect(points[0].elevationM).toBeNull();
    expect(points[0].heartRate).toBeNull();
  });
});
```

- [ ] **Step 2: Implement Strava client**

Create `packages/api/src/lib/strava.ts`:

```typescript
const STRAVA_API = "https://www.strava.com/api/v3";

const TYPE_MAP: Record<string, string> = {
  Run: "run", Ride: "cycle", Swim: "swim", Hike: "hike", Walk: "walk",
  VirtualRun: "run", VirtualRide: "cycle",
};

export function mapStravaType(stravaType: string): string {
  return TYPE_MAP[stravaType] ?? "other";
}

export function mapStravaActivity(activity: any, userId: string) {
  return {
    externalId: `strava:${activity.id}`,
    userId,
    type: mapStravaType(activity.type),
    source: "strava",
    startedAt: new Date(activity.start_date),
    durationSeconds: activity.elapsed_time,
    distanceMeters: activity.distance ?? null,
    elevationGainM: activity.total_elevation_gain ?? undefined,
    avgHeartRate: activity.average_heartrate ?? undefined,
    maxHeartRate: activity.max_heartrate ?? undefined,
    calories: activity.calories ?? undefined,
    notes: activity.description ?? undefined,
  };
}

export function mapStravaStreamsToRoutePoints(
  streams: any,
  startDate: string,
  sessionId: string
) {
  const latlng = streams.latlng?.data ?? [];
  const altitude = streams.altitude?.data ?? [];
  const heartrate = streams.heartrate?.data ?? [];
  const time = streams.time?.data ?? [];
  const startMs = new Date(startDate).getTime();

  return latlng.map(([lat, lng]: [number, number], i: number) => ({
    sessionId,
    latitude: lat,
    longitude: lng,
    elevationM: altitude[i] ?? null,
    heartRate: heartrate[i] ?? null,
    timestamp: new Date(startMs + (time[i] ?? 0) * 1000),
  }));
}

export async function fetchStravaApi(path: string, accessToken: string) {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60");
    throw Object.assign(new Error("Strava rate limit"), { retryAfter });
  }
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
  return res.json();
}

export async function getActivity(accessToken: string, activityId: number) {
  return fetchStravaApi(`/activities/${activityId}`, accessToken);
}

export async function getActivityStreams(accessToken: string, activityId: number) {
  return fetchStravaApi(`/activities/${activityId}/streams?keys=latlng,altitude,heartrate,time`, accessToken);
}

export async function getAthleteActivities(accessToken: string, page = 1, perPage = 30) {
  return fetchStravaApi(`/athlete/activities?page=${page}&per_page=${perPage}`, accessToken);
}

export async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

export async function revokeToken(accessToken: string) {
  await fetch("https://www.strava.com/oauth/deauthorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @ironpulse/api test -- strava.test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/lib/strava.ts packages/api/__tests__/strava.test.ts
git commit -m "add Strava API client with type mapping and stream parsing"
```

---

## Chunk 2: Integration Router + Zod Schemas

### Task 4: Integration Zod Schemas

**Files:**
- Create: `packages/shared/src/schemas/integration.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create schemas**

Create `packages/shared/src/schemas/integration.ts`:

```typescript
import { z } from "zod";

export const disconnectProviderSchema = z.object({
  provider: z.enum(["strava", "garmin", "apple_health"]),
});

export const completeStravaAuthSchema = z.object({
  code: z.string().min(1),
});

export const syncNowSchema = z.object({
  provider: z.enum(["strava", "garmin", "apple_health"]),
});
```

- [ ] **Step 2: Export from index**

Add to `packages/shared/src/index.ts`:
```typescript
export * from "./schemas/integration";
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/integration.ts packages/shared/src/index.ts
git commit -m "add integration Zod schemas for Strava auth and sync"
```

### Task 5: Integration tRPC Router

**Files:**
- Create: `packages/api/src/routers/integration.ts`
- Create: `packages/api/__tests__/integration.test.ts`
- Modify: `packages/api/src/root.ts`

- [ ] **Step 1: Write router tests**

Create `packages/api/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { integrationRouter } from "../src/routers/integration";
import { encryptToken } from "../src/lib/encryption";

const db = new PrismaClient();
const createCaller = createCallerFactory(integrationRouter);

function caller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

beforeEach(async () => {
  await cleanupTestData(db);
  await db.deviceConnection.deleteMany();
  testUser = createTestUser({ email: "integration@test.com" });
  await db.user.create({ data: { id: testUser.id, email: testUser.email, name: testUser.name } });
});

describe("integration.listConnections", () => {
  it("returns empty array when no connections", async () => {
    const c = caller({ user: testUser });
    const result = await c.listConnections();
    expect(result).toEqual([]);
  });

  it("returns user connections", async () => {
    await db.deviceConnection.create({
      data: {
        userId: testUser.id,
        provider: "strava",
        providerAccountId: "12345",
        accessToken: encryptToken("test"),
        refreshToken: encryptToken("test"),
        tokenExpiresAt: new Date(Date.now() + 3600000),
        syncEnabled: true,
      },
    });
    const c = caller({ user: testUser });
    const result = await c.listConnections();
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("strava");
    // Should NOT return raw tokens
    expect(result[0]).not.toHaveProperty("accessToken");
  });
});

describe("integration.disconnectProvider", () => {
  it("deletes the connection", async () => {
    await db.deviceConnection.create({
      data: {
        userId: testUser.id,
        provider: "strava",
        providerAccountId: "12345",
        accessToken: encryptToken("test"),
        refreshToken: encryptToken("test"),
        tokenExpiresAt: new Date(Date.now() + 3600000),
      },
    });
    const c = caller({ user: testUser });
    await c.disconnectProvider({ provider: "strava" });
    const remaining = await db.deviceConnection.findMany({ where: { userId: testUser.id } });
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement router**

Create `packages/api/src/routers/integration.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { disconnectProviderSchema, completeStravaAuthSchema, syncNowSchema } from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { encryptToken, decryptToken } from "../lib/encryption";
import { revokeToken } from "../lib/strava";

export const integrationRouter = createTRPCRouter({
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db.deviceConnection.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        lastSyncedAt: true,
        syncEnabled: true,
        createdAt: true,
      },
    });
    return connections;
  }),

  disconnectProvider: protectedProcedure
    .input(disconnectProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.deviceConnection.findUnique({
        where: { userId_provider: { userId: ctx.user.id, provider: input.provider } },
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      // Revoke token on provider side (best-effort)
      try {
        const accessToken = decryptToken(connection.accessToken);
        if (input.provider === "strava") {
          await revokeToken(accessToken);
        }
      } catch {
        // Token revocation failed — still delete locally
      }

      await ctx.db.deviceConnection.delete({
        where: { userId_provider: { userId: ctx.user.id, provider: input.provider } },
      });

      return { success: true };
    }),

  completeStravaAuth: protectedProcedure
    .input(completeStravaAuthSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = process.env.STRAVA_CLIENT_ID;
      const clientSecret = process.env.STRAVA_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Strava not configured" });
      }

      // Exchange code for tokens
      const res = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          grant_type: "authorization_code",
        }),
      });

      if (!res.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Strava auth code" });
      }

      const data = await res.json();

      await ctx.db.deviceConnection.upsert({
        where: { userId_provider: { userId: ctx.user.id, provider: "strava" } },
        create: {
          userId: ctx.user.id,
          provider: "strava",
          providerAccountId: String(data.athlete.id),
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(data.expires_at * 1000),
        },
        update: {
          providerAccountId: String(data.athlete.id),
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(data.expires_at * 1000),
        },
      });

      // TODO: trigger backfill in background

      return { success: true };
    }),
});
```

- [ ] **Step 3: Register in root router**

Add to `packages/api/src/root.ts`:
```typescript
import { integrationRouter } from "./routers/integration";
// Add: integration: integrationRouter
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ironpulse/api test -- integration`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routers/integration.ts packages/api/__tests__/integration.test.ts packages/api/src/root.ts
git commit -m "add integration tRPC router with listConnections, disconnect, and completeStravaAuth"
```

---

## Chunk 3: OAuth + Webhook API Routes

### Task 6: Strava OAuth Routes

**Files:**
- Create: `apps/web/src/app/api/strava/connect/route.ts`
- Create: `apps/web/src/app/api/strava/callback/route.ts`

- [ ] **Step 1: Create connect route**

Create `apps/web/src/app/api/strava/connect/route.ts`:

```typescript
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getRedis } from "@ironpulse/api/src/lib/redis";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "Strava not configured" }, { status: 500 });
  }

  // Generate CSRF state
  const state = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.set(`strava:state:${state}`, session.user.id, "EX", 600); // 10 min expiry

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/strava/callback`;
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=activity:read_all&response_type=code&approval_prompt=auto&state=${state}`;

  return Response.redirect(url);
}
```

- [ ] **Step 2: Create callback route**

Create `apps/web/src/app/api/strava/callback/route.ts`:

```typescript
import { db } from "@ironpulse/db";
import { encryptToken } from "@ironpulse/api/src/lib/encryption";
import { getRedis } from "@ironpulse/api/src/lib/redis";
import { runStravaBackfill } from "@ironpulse/api/src/lib/strava";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return Response.redirect(new URL("/settings/integrations?error=missing_params", request.url));
  }

  // Verify CSRF state
  const redis = getRedis();
  const userId = await redis.get(`strava:state:${state}`);
  await redis.del(`strava:state:${state}`);

  if (!userId) {
    return Response.redirect(new URL("/settings/integrations?error=invalid_state", request.url));
  }

  // Exchange code for tokens
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(new URL("/settings/integrations?error=auth_failed", request.url));
  }

  const data = await tokenRes.json();

  // Store connection with encrypted tokens
  const connection = await db.deviceConnection.upsert({
    where: { userId_provider: { userId, provider: "strava" } },
    create: {
      userId,
      provider: "strava",
      providerAccountId: String(data.athlete.id),
      accessToken: encryptToken(data.access_token),
      refreshToken: encryptToken(data.refresh_token),
      tokenExpiresAt: new Date(data.expires_at * 1000),
    },
    update: {
      providerAccountId: String(data.athlete.id),
      accessToken: encryptToken(data.access_token),
      refreshToken: encryptToken(data.refresh_token),
      tokenExpiresAt: new Date(data.expires_at * 1000),
    },
  });

  // Trigger backfill in background (fire and forget)
  runStravaBackfill(connection.id, db).catch((err) =>
    console.error("Strava backfill error:", err)
  );

  return Response.redirect(new URL("/settings/integrations?connected=strava", request.url));
}
```

Note: `runStravaBackfill` will be added to `strava.ts` — it fetches 30 recent activities and imports them. We'll add it in the next step.

- [ ] **Step 3: Add backfill function to strava.ts**

Add to `packages/api/src/lib/strava.ts`:

```typescript
import { encryptToken, decryptToken } from "./encryption";
import type { PrismaClient } from "@ironpulse/db";

export async function ensureFreshToken(connection: any, db: PrismaClient) {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }
  const clientId = process.env.STRAVA_CLIENT_ID!;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
  const refreshed = await refreshAccessToken(clientId, clientSecret, decryptToken(connection.refreshToken));
  await db.deviceConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      refreshToken: encryptToken(refreshed.refresh_token),
      tokenExpiresAt: new Date(refreshed.expires_at * 1000),
    },
  });
  return refreshed.access_token;
}

export async function importStravaActivity(activityId: number, connection: any, db: PrismaClient) {
  const accessToken = await ensureFreshToken(connection, db);

  // Check dedup
  const existing = await db.cardioSession.findFirst({
    where: { externalId: `strava:${activityId}` },
  });
  if (existing) return null;

  const activity = await getActivity(accessToken, activityId);
  const mapped = mapStravaActivity(activity, connection.userId);

  const session = await db.cardioSession.create({
    data: {
      id: crypto.randomUUID(),
      ...mapped,
      startedAt: mapped.startedAt,
    },
  });

  // Fetch and store route points
  try {
    const streams = await getActivityStreams(accessToken, activityId);
    const points = mapStravaStreamsToRoutePoints(streams, activity.start_date, session.id);
    if (points.length > 0) {
      await db.routePoint.createMany({
        data: points.map((p: any) => ({
          id: crypto.randomUUID(),
          sessionId: session.id,
          latitude: p.latitude,
          longitude: p.longitude,
          elevationM: p.elevationM,
          heartRate: p.heartRate,
          timestamp: p.timestamp,
        })),
      });
    }
  } catch {
    // Streams not available for all activities (e.g., manual entries)
  }

  return session;
}

export async function runStravaBackfill(connectionId: string, db: PrismaClient) {
  const connection = await db.deviceConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return;

  const accessToken = await ensureFreshToken(connection, db);
  const activities = await getAthleteActivities(accessToken, 1, 30);

  for (const activity of activities) {
    try {
      await importStravaActivity(activity.id, connection, db);
    } catch (err: any) {
      if (err.retryAfter) {
        await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
        await importStravaActivity(activity.id, connection, db);
      } else {
        console.error(`Failed to import Strava activity ${activity.id}:`, err);
      }
    }
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
```

Add `import crypto from "crypto";` at the top of `strava.ts` if not already present.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/strava/ packages/api/src/lib/strava.ts
git commit -m "add Strava OAuth connect, callback, and backfill"
```

### Task 7: Webhook Handler

**Files:**
- Create: `apps/web/src/app/api/strava/webhook/route.ts`

- [ ] **Step 1: Create webhook route**

Create `apps/web/src/app/api/strava/webhook/route.ts`:

```typescript
import { db } from "@ironpulse/db";
import { importStravaActivity } from "@ironpulse/api/src/lib/strava";

// Subscription validation
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");

  if (mode === "subscribe" && verifyToken === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return Response.json({ "hub.challenge": challenge });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// Event handler
export async function POST(request: Request) {
  const event = await request.json();

  // Always return 200 to Strava
  if (event.object_type !== "activity" || event.aspect_type !== "create") {
    return Response.json({ received: true });
  }

  const ownerId = String(event.owner_id);
  const activityId = event.object_id;

  // Process in background (don't block response)
  (async () => {
    try {
      const connection = await db.deviceConnection.findFirst({
        where: {
          provider: "strava",
          providerAccountId: ownerId,
          syncEnabled: true,
        },
      });

      if (!connection) return;

      await importStravaActivity(activityId, connection, db);

      await db.deviceConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(`Strava webhook import error for activity ${activityId}:`, err);
    }
  })();

  return Response.json({ received: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/strava/webhook/route.ts
git commit -m "add Strava webhook handler for activity import"
```

---

## Chunk 4: UI + Environment + Verification

### Task 8: Connected Apps Screen (Web + Mobile)

**Files:**
- Create: `apps/web/src/app/(app)/settings/integrations/page.tsx`
- Modify: `apps/web/src/app/(app)/profile/page.tsx`
- Create: `apps/mobile/app/settings/_layout.tsx`
- Create: `apps/mobile/app/settings/integrations.tsx`
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Create web Connected Apps page**

Create `apps/web/src/app/(app)/settings/integrations/page.tsx` — a "use client" page showing integration cards. Uses `trpc.integration.listConnections.useQuery()` (React Query hook from the web tRPC client). Shows Strava card with connect/disconnect/sync now buttons. "Connect" links to `/api/strava/connect`. "Disconnect" calls `trpc.integration.disconnectProvider.useMutation()`. "Sync Now" is a placeholder button for now.

- [ ] **Step 2: Add link from web profile page**

In `apps/web/src/app/(app)/profile/page.tsx`, add a "Connected Apps" link that navigates to `/settings/integrations`.

- [ ] **Step 3: Create mobile settings stack + integrations screen**

Create `apps/mobile/app/settings/_layout.tsx`:
```typescript
import { Stack } from "expo-router";
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" }, headerTintColor: "hsl(213, 31%, 91%)", contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" } }} />;
}
```

Create `apps/mobile/app/settings/integrations.tsx` — shows Strava connection card. Uses `trpc.integration.listConnections.query()` (vanilla tRPC). "Connect" opens Strava OAuth via `expo-web-browser`. "Disconnect" calls `trpc.integration.disconnectProvider.mutate()`.

- [ ] **Step 4: Add link from mobile profile**

In `apps/mobile/app/(tabs)/profile.tsx`, add a "Connected Apps" pressable that navigates to `/settings/integrations`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/ apps/web/src/app/\(app\)/profile/ apps/mobile/app/settings/ apps/mobile/app/\(tabs\)/profile.tsx
git commit -m "add Connected Apps screen on web and mobile with Strava connection"
```

### Task 9: Environment Variables + E2E

**Files:**
- Modify: `.env.example`
- Modify: `docker/.env.example`
- Create: `apps/mobile/e2e/integrations.yaml`

- [ ] **Step 1: Update env files**

Add to `.env.example`:
```env
# Strava Integration
STRAVA_CLIENT_ID=""
STRAVA_CLIENT_SECRET=""
STRAVA_WEBHOOK_VERIFY_TOKEN=""
DEVICE_TOKEN_ENCRYPTION_KEY=""
```

Add same to `docker/.env.example`.

- [ ] **Step 2: Create Maestro E2E flow**

Create `apps/mobile/e2e/integrations.yaml`:
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
- assertVisible: "Strava"
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docker/.env.example apps/mobile/e2e/integrations.yaml
git commit -m "add Strava env vars and Connected Apps E2E flow"
```

### Task 10: Verification

- [ ] **Step 1: Run all API tests**

Run: `pnpm --filter @ironpulse/api test`
Expected: All tests pass (existing + encryption + strava + integration)

- [ ] **Step 2: Verify web build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix Strava integration issues found during verification"
```
