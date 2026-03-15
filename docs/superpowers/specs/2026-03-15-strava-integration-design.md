# Strava Integration — Design Specification

Import Strava activities into IronPulse as cardio sessions with route data. Webhook-driven, server-side sync with OAuth connection. First integration in Phase 2.

## Scope

- Strava OAuth connection flow (web + mobile)
- Webhook-driven activity import (Strava → IronPulse)
- Activity metadata + route stream import
- Initial backfill of last 30 activities on first connection
- Token encryption at rest
- Connected Apps settings screen (web + mobile)
- DeviceConnection Prisma model
- Integration tRPC router

## Out of Scope

- Export to Strava (IronPulse → Strava)
- Strava social data (kudos, comments, segments)
- Real-time activity tracking via Strava
- Other integrations (Garmin, HealthKit, Google Fit — separate specs)

## OAuth Flow

### Connection

1. User taps "Connect Strava" on Connected Apps screen
2. **Web:** Opens Strava OAuth URL in same window. **Mobile:** Opens in system browser via `expo-web-browser`.
3. URL: `https://www.strava.com/oauth/authorize?client_id={STRAVA_CLIENT_ID}&redirect_uri={callback_url}&scope=activity:read_all&response_type=code&approval_prompt=auto`
4. User authorizes on Strava → redirected to `/api/strava/callback?code=...`
5. Server exchanges code for tokens: `POST https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `code`, `grant_type=authorization_code`
6. Response: `{ access_token, refresh_token, expires_at, athlete: { id, ... } }`
7. Server creates `DeviceConnection` row with encrypted tokens and Strava athlete ID
8. Server triggers initial backfill (last 30 activities)
9. Redirects user back to Connected Apps screen

### Scope

`activity:read_all` — read all activities including private. No write scope.

### Token Refresh

Strava access tokens expire every 6 hours. Before each Strava API call:
1. Check if `tokenExpiresAt < now`
2. If expired: `POST https://www.strava.com/oauth/token` with `grant_type=refresh_token`, `refresh_token`
3. Update `accessToken`, `refreshToken`, `tokenExpiresAt` in the database

### Disconnection

User taps "Disconnect" → server calls `POST https://www.strava.com/oauth/deauthorize` with the access token → deletes `DeviceConnection` row. Previously imported activities remain in IronPulse.

### Mobile OAuth

Mobile uses `expo-web-browser` (`WebBrowser.openAuthSessionAsync()`) to open the Strava OAuth URL. The redirect URI uses the app's deep link scheme: `ironpulse://strava/callback`. The app intercepts the redirect via Expo Router linking, extracts the auth code, and sends it to the server via a tRPC mutation: `integration.completeStravaAuth.mutate({ code })`.

## Webhook

### Subscription Setup

Strava webhooks are per-app, not per-user. A single subscription covers all IronPulse users. Registered via Strava API during deployment (one-time setup, documented in the spec):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_ID \
  -d client_secret=YOUR_SECRET \
  -d callback_url=https://app.ironpulse.com/api/strava/webhook \
  -d verify_token=YOUR_VERIFY_TOKEN
```

### Validation Endpoint

`GET /api/strava/webhook` — Strava sends a validation request with `hub.mode=subscribe`, `hub.challenge`, `hub.verify_token`. Respond with `{ "hub.challenge": value }` if verify_token matches.

### Event Endpoint

`POST /api/strava/webhook` — receives events:

```json
{
  "object_type": "activity",
  "object_id": 12345678,
  "aspect_type": "create",
  "owner_id": 67890,
  "subscription_id": 1234,
  "event_time": 1234567890
}
```

Processing:
1. Only handle `object_type === "activity"` and `aspect_type === "create"` (ignore updates/deletes for now)
2. Look up `DeviceConnection` where `provider = 'strava'` and `providerAccountId = owner_id`
3. If not found or `syncEnabled = false`, return 200 (acknowledge but ignore)
4. Check deduplication: `CardioSession` where `external_id = "strava:{object_id}"` — skip if exists
5. Refresh token if needed
6. Fetch full activity: `GET https://www.strava.com/api/v3/activities/{object_id}`
7. Fetch route streams: `GET https://www.strava.com/api/v3/activities/{object_id}/streams?keys=latlng,altitude,heartrate,time`
8. Create `CardioSession` + `RoutePoint` rows
9. Update `lastSyncedAt` on `DeviceConnection`
10. Return 200

Always return 200 to Strava regardless of processing outcome — Strava retries on non-200 responses and will disable the subscription after repeated failures.

### Strava Rate Limits

Strava allows 100 requests per 15 minutes, 1000 per day per app. Each activity import uses 2 API calls (activity + streams). This supports ~50 new activities per 15-minute window, which is more than sufficient.

## Activity Import

### Type Mapping

| Strava Type | IronPulse Type |
|-------------|----------------|
| Run | run |
| Ride | cycle |
| Swim | swim |
| Hike | hike |
| Walk | walk |
| VirtualRun | run |
| VirtualRide | cycle |
| * (other) | other |

### Data Mapping

Strava activity → `CardioSession`:

| Strava Field | CardioSession Field |
|--------------|---------------------|
| `id` | `externalId` = `"strava:{id}"` |
| `type` | `type` (mapped) |
| — | `source` = `"strava"` |
| `start_date` | `startedAt` |
| `elapsed_time` | `durationSeconds` |
| `distance` | `distanceMeters` |
| `total_elevation_gain` | `elevationGainM` |
| `average_heartrate` | `avgHeartRate` |
| `max_heartrate` | `maxHeartRate` |
| `calories` | `calories` |
| `description` | `notes` |

### Route Streams

Strava streams API returns arrays keyed by type:

```json
{
  "latlng": { "data": [[51.5, -0.1], [51.5001, -0.1001], ...] },
  "altitude": { "data": [10.5, 10.8, ...] },
  "heartrate": { "data": [120, 125, ...] },
  "time": { "data": [0, 3, 6, ...] }
}
```

Each index maps to a `RoutePoint`:

| Stream | RoutePoint Field |
|--------|-----------------|
| `latlng[i][0]` | `latitude` |
| `latlng[i][1]` | `longitude` |
| `altitude[i]` | `elevationM` |
| `heartrate[i]` | `heartRate` |
| `start_date + time[i]` | `timestamp` |

Route points are stored in PostgreSQL via Prisma (same path as `trpc.cardio.completeGpsSession`). They are NOT synced via PowerSync — fetched on-demand via `trpc.cardio.getRoutePoints`.

### Initial Backfill

On first connection, after OAuth callback:
1. Fetch `GET https://www.strava.com/api/v3/athlete/activities?per_page=30&page=1`
2. For each activity: check dedup → fetch details + streams → create rows
3. Process sequentially to respect rate limits (2 calls per activity)
4. This uses ~60 API calls, well within the 100/15min limit

## Data Model

### New Prisma Model

Add to `packages/db/prisma/schema.prisma`:

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

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("device_connections")
}
```

Add `deviceConnections DeviceConnection[]` relation to the `User` model.

### Existing Models Used

- `CardioSession` — `externalId` field stores `"strava:{activity_id}"` for dedup
- `RoutePoint` — stores imported GPS track
- `CardioSource` enum — add `"strava"` value (currently has `manual`, `gps`, `gpx`)

## Token Encryption

Access and refresh tokens encrypted at rest using AES-256-GCM.

Create `packages/api/src/lib/encryption.ts`:

```typescript
import crypto from "crypto";

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
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

Tokens are encrypted before storing and decrypted when making Strava API calls.

## Backend

### tRPC Router (`integration`)

```
integration.listConnections     (query)    — list user's DeviceConnections (provider, syncEnabled, lastSyncedAt)
integration.disconnectProvider  (mutation) — revoke token + delete connection
integration.completeStravaAuth  (mutation) — exchange auth code for tokens (for mobile OAuth flow)
integration.syncNow             (mutation) — manually trigger sync for a provider (fetches latest activities)
```

### API Routes (Next.js, not tRPC)

```
GET  /api/strava/connect          — redirects to Strava OAuth URL (web flow)
GET  /api/strava/callback         — handles OAuth callback, stores tokens, triggers backfill
GET  /api/strava/webhook          — Strava subscription validation (hub.challenge)
POST /api/strava/webhook          — receives activity events, processes import
```

### Strava API Client (`packages/api/src/lib/strava.ts`)

Encapsulates all Strava API calls:
- `getActivity(accessToken, activityId)` — fetch activity details
- `getActivityStreams(accessToken, activityId)` — fetch route streams
- `getAthleteActivities(accessToken, page, perPage)` — list activities
- `refreshAccessToken(refreshToken)` — refresh expired token
- `revokeToken(accessToken)` — deauthorize

Each function handles HTTP errors and returns typed responses.

## UI

### Connected Apps Screen

Accessible from Profile → "Connected Apps" link.

**Card for each provider:**
- Provider icon + name ("Strava")
- Status: "Connected" (green) or "Not connected" (muted)
- If connected: last synced timestamp, "Sync Now" button, "Disconnect" button
- If not connected: "Connect" button

**Web:** `apps/web/src/app/(app)/settings/integrations/page.tsx`
**Mobile:** `apps/mobile/app/settings/integrations.tsx` (pushed from profile tab)

### Profile Link

Add "Connected Apps" navigation link to both web and mobile profile screens.

## Environment Variables

```env
STRAVA_CLIENT_ID=""
STRAVA_CLIENT_SECRET=""
STRAVA_WEBHOOK_VERIFY_TOKEN=""
```

Add to `.env.example` and `docker/.env.example`.

## Testing

### Unit Tests (Vitest)

| What | File |
|------|------|
| Token encryption round-trip | `packages/api/__tests__/encryption.test.ts` |
| Activity type mapping | `packages/api/__tests__/strava.test.ts` |
| Data mapping (Strava → CardioSession) | `packages/api/__tests__/strava.test.ts` |
| Deduplication logic | `packages/api/__tests__/strava.test.ts` |
| Webhook event parsing | `packages/api/__tests__/strava.test.ts` |

### Integration Tests (Vitest, real PostgreSQL)

| What | File |
|------|------|
| Integration router (listConnections, disconnect) | `packages/api/__tests__/integration.test.ts` |
| Activity import creates CardioSession + RoutePoints | `packages/api/__tests__/strava-import.test.ts` |

### E2E

- Web: Navigate to Connected Apps, verify it renders
- Mobile: Maestro flow to navigate to Connected Apps

## File Structure

```
packages/db/prisma/
└── schema.prisma                           # MODIFY — add DeviceConnection model

packages/shared/src/
├── enums.ts                                # MODIFY — add 'strava' to CardioSource
└── schemas/
    └── integration.ts                      # CREATE — Zod schemas for integration router

packages/api/src/
├── lib/
│   ├── encryption.ts                       # CREATE — AES-256-GCM encrypt/decrypt
│   └── strava.ts                           # CREATE — Strava API client
├── routers/
│   └── integration.ts                      # CREATE — integration tRPC router
└── root.ts                                 # MODIFY — register integration router

packages/api/__tests__/
├── encryption.test.ts                      # CREATE
├── strava.test.ts                          # CREATE
├── strava-import.test.ts                   # CREATE
└── integration.test.ts                     # CREATE

apps/web/src/app/
├── (app)/settings/integrations/page.tsx     # CREATE — Connected Apps page
├── (app)/profile/page.tsx                  # MODIFY — add Connected Apps link
└── api/strava/
    ├── connect/route.ts                    # CREATE — OAuth redirect
    ├── callback/route.ts                   # CREATE — OAuth callback
    └── webhook/route.ts                    # CREATE — webhook handler

apps/mobile/
├── app/settings/
│   ├── _layout.tsx                         # CREATE — settings stack
│   └── integrations.tsx                    # CREATE — Connected Apps screen
├── app/(tabs)/profile.tsx                  # MODIFY — add Connected Apps link
└── e2e/
    └── integrations.yaml                   # CREATE — Maestro flow
```
