# Cycle 1: Security, Bugs & Production Readiness

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security vulnerabilities, GDPR gaps, critical bugs, and set up production infrastructure — all blockers before launch.

**Architecture:** 13 independent tickets, each modifying isolated files. Security fixes touch `next.config.ts`, middleware, and tRPC routers. GDPR adds new procedures and pages. Infrastructure adds Sentry, deployment workflow, and backup scripts.

**Tech Stack:** Next.js 15, tRPC v11, Prisma, PostgreSQL/PostGIS, Redis, Sentry, Expo, GitHub Actions

---

## Task 1: Fix Google Maps API Key Placeholder (IRONPULSE-T38)

**Priority:** URGENT — Android route maps broken without this

**Files:**
- Modify: `apps/mobile/app.json` → convert to `apps/mobile/app.config.ts`
- Create: `apps/mobile/.env.example`
- Modify: `.github/workflows/ci.yml` (add env var to Android build)

- [ ] **Step 1: Convert app.json to app.config.ts**

Replace `apps/mobile/app.json` with `apps/mobile/app.config.ts` that reads from environment variables:

```typescript
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "IronPulse",
  slug: "ironpulse",
  scheme: "ironpulse",
  // ... keep all existing config ...
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
      },
    },
  },
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    },
  },
});
```

- [ ] **Step 2: Create .env.example with required keys**
- [ ] **Step 3: Add GOOGLE_MAPS_API_KEY to CI workflow env for build-android job**
- [ ] **Step 4: Verify expo prebuild still works with app.config.ts**
- [ ] **Step 5: Commit**

---

## Task 2: Add HTTP Security Headers (IRONPULSE-T21)

**Priority:** URGENT

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add headers() function to next.config.ts**

```typescript
const nextConfig: NextConfig = {
  // ... existing config ...
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.amazonaws.com",
              "connect-src 'self' https://*.amazonaws.com https://api.strava.com https://connect.garmin.com wss:",
              "worker-src 'self' blob:",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
```

- [ ] **Step 2: Run `pnpm build` in apps/web to verify no CSP breaks**
- [ ] **Step 3: Test locally — verify headers appear in browser devtools Network tab**
- [ ] **Step 4: Commit**

---

## Task 3: Fix Shared Workout Page Privacy (IRONPULSE-T22)

**Priority:** URGENT

**Files:**
- Modify: `apps/web/src/middleware.ts` — add `/share` to publicRoutes
- Modify: `packages/db/prisma/schema.prisma` — add `isPublic` and `shareToken` to Workout
- Modify: `apps/web/src/app/share/workout/[id]/page.tsx` — query by shareToken
- Modify: `packages/api/src/routers/workout.ts` — add share/unshare mutation

- [ ] **Step 1: Add `/share` prefix to middleware publicRoutes**

In `apps/web/src/middleware.ts`, add to publicRoutes array:
```typescript
const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/share"];
```

Update the check to use `startsWith` for `/share`:
```typescript
const isPublic = publicRoutes.some((route) =>
  route === "/share" ? pathname.startsWith("/share") : pathname === route
);
```

- [ ] **Step 2: Add fields to Workout model in Prisma schema**

```prisma
model Workout {
  // ... existing fields ...
  isPublic    Boolean  @default(false)
  shareToken  String?  @unique @default(uuid())
}
```

- [ ] **Step 3: Run `npx prisma migrate dev --name add-workout-share-token`**

- [ ] **Step 4: Update share page to query by shareToken and check isPublic**

In `apps/web/src/app/share/workout/[id]/page.tsx`, change the query:
```typescript
const workout = await db.workout.findFirst({
  where: { shareToken: params.id, isPublic: true },
  // ... existing include ...
});
```

- [ ] **Step 5: Add share/unshare mutation to workout router**

```typescript
toggleShare: protectedProcedure
  .input(z.object({ workoutId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const workout = await ctx.db.workout.findFirst({
      where: { id: input.workoutId, userId: ctx.user.id },
    });
    if (!workout) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.workout.update({
      where: { id: input.workoutId },
      data: { isPublic: !workout.isPublic },
      select: { isPublic: true, shareToken: true },
    });
  }),
```

- [ ] **Step 6: Add test for share page privacy**
- [ ] **Step 7: Commit**

---

## Task 4: Fix User Search Email Exposure (IRONPULSE-T23)

**Priority:** URGENT

**Files:**
- Modify: `packages/api/src/routers/social.ts:92-108` — remove email from select and OR clause
- Modify: `apps/web/src/app/(app)/users/page.tsx` — remove email display

- [ ] **Step 1: Remove email from searchUsers query**

In `packages/api/src/routers/social.ts`, update `searchUsers`:
```typescript
searchUsers: protectedProcedure
  .input(searchUsersSchema)
  .query(async ({ ctx, input }) => {
    const users = await ctx.db.user.findMany({
      where: {
        id: { not: ctx.user.id },
        name: { contains: input.query, mode: "insensitive" },
      },
      select: { id: true, name: true, avatarUrl: true },
      take: 20,
    });
    return { users };
  }),
```

Key changes: removed `email` from `select`, removed `email` from `OR` search (search by name only).

- [ ] **Step 2: Remove email display from users page**

In `apps/web/src/app/(app)/users/page.tsx`, remove the line rendering `user.email` (around line 92).

- [ ] **Step 3: Verify TypeScript compiles — `pnpm typecheck`**
- [ ] **Step 4: Commit**

---

## Task 5: Add Account Deletion — GDPR Article 17 (IRONPULSE-T24)

**Priority:** URGENT

**Files:**
- Modify: `packages/db/prisma/schema.prisma` — add `deletionRequestedAt` to User
- Modify: `packages/api/src/routers/user.ts` — add `requestDeletion`, `cancelDeletion` procedures
- Create: `packages/api/src/lib/account-deletion.ts` — deletion logic
- Modify: `apps/web/src/app/(app)/settings/page.tsx` — add delete account UI section
- Create: `packages/api/__tests__/account-deletion.test.ts`

- [ ] **Step 1: Add deletionRequestedAt field to User model**

```prisma
model User {
  // ... existing fields ...
  deletionRequestedAt DateTime?
}
```

- [ ] **Step 2: Run migration**

`npx prisma migrate dev --name add-user-deletion-requested-at`

- [ ] **Step 3: Create account deletion helper**

In `packages/api/src/lib/account-deletion.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

export async function performAccountDeletion(db: PrismaClient, userId: string) {
  // Clean up non-cascading records
  await db.magicLinkToken.deleteMany({
    where: { email: { in: [await db.user.findUnique({ where: { id: userId }, select: { email: true } }).then(u => u!.email)] } },
  });
  await db.passkeyChallenge.deleteMany({ where: { userId } });

  // Cascade delete handles everything else
  await db.user.delete({ where: { id: userId } });
}
```

- [ ] **Step 4: Add requestDeletion and cancelDeletion procedures to user router**

```typescript
requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.db.user.update({
    where: { id: ctx.user.id },
    data: { deletionRequestedAt: new Date() },
  });
  return { message: "Account deletion requested. You have 7 days to cancel." };
}),

cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.db.user.update({
    where: { id: ctx.user.id },
    data: { deletionRequestedAt: null },
  });
  return { message: "Account deletion cancelled." };
}),
```

- [ ] **Step 5: Add Delete Account section to settings page**

Add a danger zone section at the bottom of settings with a "Delete Account" button that opens a confirmation dialog, calls `user.requestDeletion`, and shows the 7-day grace period message with a "Cancel Deletion" option.

- [ ] **Step 6: Write tests for account deletion flow**
- [ ] **Step 7: Commit**

---

## Task 6: Add Privacy Policy & Terms of Service (IRONPULSE-T25)

**Priority:** HIGH

**Files:**
- Create: `apps/web/src/app/privacy/page.tsx`
- Create: `apps/web/src/app/terms/page.tsx`
- Modify: `apps/web/src/middleware.ts` — add `/privacy` and `/terms` to publicRoutes
- Modify: `apps/web/src/app/(auth)/signup/page.tsx` — add consent checkbox
- Modify: `packages/db/prisma/schema.prisma` — add `consentedAt` to User

- [ ] **Step 1: Add /privacy and /terms to middleware publicRoutes**
- [ ] **Step 2: Add consentedAt field to User model and migrate**
- [ ] **Step 3: Create privacy policy page with fitness-app-appropriate content**
- [ ] **Step 4: Create terms of service page**
- [ ] **Step 5: Add consent checkbox to signup form that stores consentedAt on registration**
- [ ] **Step 6: Add footer links to landing page**
- [ ] **Step 7: Commit**

---

## Task 7: Set Up Production Deployment Pipeline (IRONPULSE-T17)

**Priority:** HIGH

**Files:**
- Modify: `.github/workflows/ci.yml` — add deploy job
- Modify: `docker/docker-compose.yml` — add production profile
- Create: `.github/workflows/deploy.yml` (or extend ci.yml)

- [ ] **Step 1: Add deploy job to CI workflow**

Add a `deploy` job that runs on `main` branch only, after `build` succeeds. Uses SSH to deploy Docker container to production server:

```yaml
deploy:
  name: Deploy to Production
  needs: [build]
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Build and push Docker image
      run: |
        docker build -t ironpulse:latest -f docker/Dockerfile .
        docker save ironpulse:latest | gzip > ironpulse.tar.gz
    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.DEPLOY_HOST }}
        username: ${{ secrets.DEPLOY_USER }}
        key: ${{ secrets.DEPLOY_SSH_KEY }}
        script: |
          cd /opt/ironpulse
          docker compose pull
          docker compose up -d --build
          docker exec ironpulse npx prisma migrate deploy
```

- [ ] **Step 2: Document required GitHub secrets**
- [ ] **Step 3: Add health check endpoint at `/api/health`**

Create `apps/web/src/app/api/health/route.ts`:
```typescript
import { db } from "@ironpulse/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
```

- [ ] **Step 4: Add /api/health to middleware publicRoutes**
- [ ] **Step 5: Commit**

---

## Task 8: Add Monitoring & Error Tracking — Sentry (IRONPULSE-T18)

**Priority:** HIGH

**Files:**
- Modify: `apps/web/package.json` — add `@sentry/nextjs`
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/sentry.edge.config.ts`
- Modify: `apps/web/next.config.ts` — wrap with `withSentryConfig`
- Modify: `apps/mobile/package.json` — add `@sentry/react-native`

- [ ] **Step 1: Install @sentry/nextjs in web app**

`cd apps/web && pnpm add @sentry/nextjs`

- [ ] **Step 2: Create Sentry config files**

`sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

`sentry.server.config.ts` and `sentry.edge.config.ts` — same pattern.

- [ ] **Step 3: Wrap next.config.ts with withSentryConfig**

```typescript
import { withSentryConfig } from "@sentry/nextjs";
// ... existing config ...
export default withSentryConfig(nextConfig, {
  silent: true,
  org: "ironpulse",
  project: "web",
});
```

- [ ] **Step 4: Install sentry-expo in mobile app**

`cd apps/mobile && pnpm add @sentry/react-native`

- [ ] **Step 5: Add Sentry.init to mobile app entry point**
- [ ] **Step 6: Add SENTRY_DSN to .env.example and CI secrets**
- [ ] **Step 7: Verify build passes with Sentry**
- [ ] **Step 8: Commit**

---

## Task 9: Set Up PostgreSQL Backup Strategy (IRONPULSE-T20)

**Priority:** HIGH

**Files:**
- Create: `docker/backup.sh` — automated pg_dump script
- Modify: `docker/docker-compose.yml` — add backup service or cron
- Create: `docs/runbooks/database-restore.md`

- [ ] **Step 1: Create backup script**

`docker/backup.sh`:
```bash
#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/ironpulse_$TIMESTAMP.sql.gz"

pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc | gzip > "$BACKUP_FILE"

# Keep last 30 daily backups
find "$BACKUP_DIR" -name "ironpulse_*.sql.gz" -mtime +30 -delete

echo "Backup complete: $BACKUP_FILE"
```

- [ ] **Step 2: Add backup volume and cron to docker-compose.yml**
- [ ] **Step 3: Write restore runbook**
- [ ] **Step 4: Test backup and restore locally**
- [ ] **Step 5: Commit**

---

## Task 10: Fix Non-Functional "Add Note" Stub (IRONPULSE-T31)

**Priority:** HIGH

**Files:**
- Modify: `apps/web/src/components/workout/exercise-card.tsx:74` — wire up onClick
- Modify: `packages/api/src/routers/workout.ts` — add `updateExerciseNotes` mutation

- [ ] **Step 1: Add updateExerciseNotes mutation to workout router**

```typescript
updateExerciseNotes: protectedProcedure
  .input(z.object({
    workoutExerciseId: z.string(),
    notes: z.string().max(500),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.workoutExercise.update({
      where: { id: input.workoutExerciseId },
      data: { notes: input.notes },
    });
  }),
```

- [ ] **Step 2: Wire up Add Note dropdown in exercise-card.tsx**

Add state for notes modal, onClick handler on the DropdownMenuItem, and a dialog/popover with a textarea that calls the mutation.

- [ ] **Step 3: Display saved notes in the exercise card header area**
- [ ] **Step 4: Test manually — add note, refresh, verify persistence**
- [ ] **Step 5: Commit**

---

## Task 11: Apply Rate Limiting to All Routers (IRONPULSE-T19)

**Priority:** MEDIUM — infrastructure exists, just needs wiring

**Files:**
- Modify: `packages/api/src/routers/*.ts` — replace `protectedProcedure` with `rateLimitedProcedure` on all mutation/query procedures

**Discovery:** `rateLimitedProcedure` is already defined in `packages/api/src/trpc.ts` with Redis sliding window (100 req/min per user). It just needs to be applied.

- [ ] **Step 1: In each router file, import rateLimitedProcedure from trpc.ts**

Replace `protectedProcedure` with `rateLimitedProcedure` for general queries/mutations. Keep `protectedProcedure` only for procedures that are already behind other rate-limited wrappers.

Routers to update: `workout`, `cardio`, `bodyMetric`, `analytics`, `template`, `exercise`, `social`, `challenge`, `coach`, `program`, `message`, `integration`, `progressPhoto`, `export`, `user`, `stripe`.

Keep `authRateLimitedProcedure` on auth/passkey procedures (already applied).
Keep `uploadProcedure` on file upload procedures.

- [ ] **Step 2: Add rate limit response headers to tRPC error handler**

In the rate limit middleware, add `X-RateLimit-Remaining` and `Retry-After` headers to 429 responses.

- [ ] **Step 3: Run existing API tests to verify no regressions**
- [ ] **Step 4: Commit**

---

## Task 12: Clean Up WebAuthn Bundling Workarounds (IRONPULSE-T6)

**Priority:** MEDIUM — current solution is already working

**Discovery:** The current state is actually clean:
- `serverExternalPackages: ["@simplewebauthn/server"]` in `next.config.ts` (proper Next.js 15 approach)
- Dynamic import with `webpackIgnore` comment in `packages/api/src/lib/passkey.ts`

These two together ARE the clean solution. The 3 commits were iterative — the final state is good.

**Files:**
- Modify: `packages/api/src/lib/passkey.ts` — add `"server-only"` import guard
- Verify: `apps/web/next.config.ts` — confirm `serverExternalPackages` is sufficient

- [ ] **Step 1: Add "server-only" import to passkey.ts**

```typescript
import "server-only";
```

This ensures the file is never accidentally imported from client components.

- [ ] **Step 2: Verify build passes — `cd apps/web && pnpm build`**
- [ ] **Step 3: Test passkey registration and login on web**
- [ ] **Step 4: Commit**

---

## Task 13: Enforce Coach Client Limit Server-Side (IRONPULSE-T28)

**Priority:** MEDIUM

**Files:**
- Modify: `packages/api/src/routers/coach.ts:42-84` — add count check in `addClient`

- [ ] **Step 1: Add client count validation to addClient**

Before creating the ProgramAssignment, add:
```typescript
const MAX_CLIENTS = 25;
const clientCount = await ctx.db.programAssignment.count({
  where: { coachId: ctx.user.id, status: { not: "cancelled" } },
});
if (clientCount >= MAX_CLIENTS) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Client limit reached (${MAX_CLIENTS}). Upgrade your plan to add more.`,
  });
}
```

- [ ] **Step 2: Write test for client limit enforcement**
- [ ] **Step 3: Show remaining slots in coach dashboard UI**
- [ ] **Step 4: Commit**

---

## Execution Order

These tasks are independent and can run in parallel. Recommended priority:

1. **Parallel batch 1 (URGENT fixes):** Tasks 1, 2, 3, 4 — quick, isolated changes
2. **Parallel batch 2 (HIGH):** Tasks 5, 6, 7, 8, 9, 10 — each modifies different files
3. **Parallel batch 3 (MEDIUM):** Tasks 11, 12, 13 — cleanup and enforcement
