# Expo Mobile App Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the IronPulse Expo mobile app with navigation, auth, PowerSync sync, dark theme, placeholder screens with real data, and Maestro E2E tests.

**Architecture:** Migrate `packages/sync` to platform-agnostic imports (`@powersync/common`), add bearer token auth to the API, scaffold an Expo Router app at `apps/mobile/` with 4-tab navigation, connect PowerSync via the shared connector, and write Maestro E2E flows.

**Tech Stack:** Expo SDK 52+, Expo Router, `@powersync/react-native`, `@powersync/react`, NativeWind 4, `@gorhom/bottom-sheet`, `expo-secure-store`, tRPC v11, Maestro

**Spec:** `docs/superpowers/specs/2026-03-15-expo-foundation-design.md`

---

## File Structure

```
# Shared package changes
packages/sync/
├── package.json                              # MODIFY — swap @powersync/web → @powersync/common
├── src/
│   ├── schema.ts                             # MODIFY — import from @powersync/common
│   ├── connector.ts                          # MODIFY — import from @powersync/common, add baseUrl + authToken
│   ├── index.ts                              # MODIFY — re-export hooks
│   ├── hooks/                                # CREATE — move hooks from apps/web
│   │   ├── use-workouts.ts
│   │   ├── use-workout-detail.ts
│   │   ├── use-cardio-sessions.ts
│   │   ├── use-cardio-detail.ts
│   │   ├── use-exercises.ts
│   │   ├── use-templates.ts
│   │   ├── use-body-metrics.ts
│   │   ├── use-personal-records.ts
│   │   └── use-sync-status.ts
│   └── __tests__/
│       └── schema.test.ts                    # MODIFY — update import if needed

# Backend changes
packages/api/src/
├── trpc.ts                                   # MODIFY — add bearerAuthProcedure
├── lib/
│   └── mobile-auth.ts                        # CREATE — JWT sign/verify for mobile bearer tokens
├── routers/
│   └── auth.ts                               # MODIFY — add mobileSignIn, mobileSignUp

packages/api/__tests__/
└── mobile-auth.test.ts                       # CREATE — bearer auth tests

# Web app import updates
apps/web/src/
├── hooks/                                    # DELETE — all PowerSync hooks (moved to packages/sync)
├── app/(app)/workouts/page.tsx               # MODIFY — update import paths
├── app/(app)/cardio/page.tsx                 # MODIFY — update import paths
├── app/(app)/calendar/page.tsx               # MODIFY — update import paths
├── app/(app)/dashboard/page.tsx              # MODIFY — update import paths (if component imports changed)
├── app/(app)/stats/page.tsx                  # MODIFY — update import paths
├── app/(app)/exercises/page.tsx              # MODIFY — update import paths
├── app/(app)/templates/page.tsx              # MODIFY — update import paths
├── components/layout/app-shell.tsx           # MODIFY — update sync-status import
├── components/workout/active-workout.tsx     # MODIFY — update import paths
├── components/workout/add-exercise-sheet.tsx  # MODIFY — update import paths
├── components/dashboard/weekly-stats.tsx     # MODIFY — update import paths
├── components/dashboard/activity-feed.tsx    # MODIFY — update import paths
└── lib/powersync/provider.tsx                # MODIFY — update connector instantiation

# New mobile app
apps/mobile/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.ts
├── nativewind-env.d.ts
├── global.css
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── stats.tsx
│       ├── exercises.tsx
│       └── profile.tsx
├── components/ui/
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── badge.tsx
├── components/layout/
│   └── new-session-sheet.tsx
├── lib/
│   ├── auth.tsx
│   ├── trpc.ts
│   └── powersync.ts
└── e2e/
    ├── auth-signup.yaml
    ├── auth-signin.yaml
    ├── auth-signout.yaml
    ├── navigation-tabs.yaml
    └── sync-offline.yaml
```

---

## Chunk 1: Shared Package Migration

### Task 1: Migrate `packages/sync` to `@powersync/common`

**Files:**
- Modify: `packages/sync/package.json`
- Modify: `packages/sync/src/schema.ts`
- Modify: `packages/sync/src/connector.ts`
- Modify: `packages/sync/src/__tests__/schema.test.ts`

- [ ] **Step 1: Update package.json dependency**

In `packages/sync/package.json`, replace `"@powersync/web": "^1.0.0"` with `"@powersync/common": "^1.0.0"`.

Also add `"@powersync/react": "^1.0.0"` as a dependency (hooks use `useQuery` from it).

- [ ] **Step 2: Update schema.ts import**

In `packages/sync/src/schema.ts`, change the first line from:
```typescript
import { column, Schema, Table } from "@powersync/web";
```
to:
```typescript
import { column, Schema, Table } from "@powersync/common";
```

- [ ] **Step 3: Update connector.ts imports and add auth token support**

Replace the entire `packages/sync/src/connector.ts` with:

```typescript
import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/common";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ironpulse/api";

export interface BackendConnectorOptions {
  baseUrl?: string;
  getAuthToken?: () => Promise<string | null>;
}

export class BackendConnector implements PowerSyncBackendConnector {
  private trpc;

  constructor(opts?: BackendConnectorOptions) {
    this.trpc = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${opts?.baseUrl ?? ""}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const token = await opts?.getAuthToken?.();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    });
  }

  async fetchCredentials() {
    const result = await this.trpc.sync.getToken.query();
    return {
      endpoint: result.endpoint,
      token: result.token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        switch (op.op) {
          case UpdateType.PUT:
            await this.trpc.sync.applyChange.mutate({
              table: op.table as any,
              record: { id: op.id, ...op.opData },
            });
            break;
          case UpdateType.PATCH:
            await this.trpc.sync.update.mutate({
              table: op.table as any,
              id: op.id,
              data: op.opData ?? {},
            });
            break;
          case UpdateType.DELETE:
            await this.trpc.sync.delete.mutate({
              table: op.table as any,
              id: op.id,
            });
            break;
        }
      }
      await transaction.complete();
    } catch (error: any) {
      if (
        error?.data?.code === "FORBIDDEN" ||
        error?.data?.code === "BAD_REQUEST"
      ) {
        console.error("PowerSync upload permanent error (discarding):", error);
        await transaction.complete();
      } else {
        console.error("PowerSync upload error (will retry):", error);
      }
    }
  }
}
```

- [ ] **Step 4: Update index.ts exports**

Update `packages/sync/src/index.ts`:

```typescript
export { AppSchema, type Database } from "./schema";
export { BackendConnector, type BackendConnectorOptions } from "./connector";
```

- [ ] **Step 5: Run pnpm install and tests**

Run: `pnpm install && pnpm --filter @ironpulse/sync test`
Expected: All tests pass. If the import from `@powersync/common` differs (e.g., the types are in a different subpath), adjust accordingly.

- [ ] **Step 6: Commit**

```bash
git add packages/sync/
git commit -m "migrate packages/sync from @powersync/web to @powersync/common"
```

### Task 2: Move PowerSync Hooks to `packages/sync`

**Files:**
- Create: `packages/sync/src/hooks/` (move from `apps/web/src/hooks/`)
- Modify: `packages/sync/src/index.ts`
- Modify: all web app files that import hooks

- [ ] **Step 1: Move hook files**

Move these files from `apps/web/src/hooks/` to `packages/sync/src/hooks/`:
- `use-workouts.ts`
- `use-workout-detail.ts`
- `use-cardio-sessions.ts`
- `use-cardio-detail.ts`
- `use-exercises.ts`
- `use-templates.ts`
- `use-body-metrics.ts`
- `use-personal-records.ts`
- `use-sync-status.ts`

Run:
```bash
mkdir -p packages/sync/src/hooks
mv apps/web/src/hooks/use-workouts.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-workout-detail.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-cardio-sessions.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-cardio-detail.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-exercises.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-templates.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-body-metrics.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-personal-records.ts packages/sync/src/hooks/
mv apps/web/src/hooks/use-sync-status.ts packages/sync/src/hooks/
```

Note: Leave `use-debounced-mutation.ts` in `apps/web/src/hooks/` — it's web-specific (not a PowerSync hook).

- [ ] **Step 2: Remove `"use client"` directives from moved hooks**

The `"use client"` directive is Next.js-specific and will cause issues in React Native. Remove the `"use client";` line from each moved hook file. The hooks work in client components on both platforms without the directive (the consuming component declares `"use client"` on web).

- [ ] **Step 3: Export hooks from packages/sync/src/index.ts**

Update `packages/sync/src/index.ts`:

```typescript
export { AppSchema, type Database } from "./schema";
export { BackendConnector, type BackendConnectorOptions } from "./connector";

// Hooks
export { useWorkouts, type WorkoutRow } from "./hooks/use-workouts";
export { useWorkoutExercises, useWorkoutSets, type WorkoutExerciseRow, type SetRow } from "./hooks/use-workout-detail";
export { useCardioSessions, type CardioSessionRow } from "./hooks/use-cardio-sessions";
export { useCardioSession, useCardioLaps, type LapRow } from "./hooks/use-cardio-detail";
export { useExercises, type ExerciseRow } from "./hooks/use-exercises";
export { useTemplates, type TemplateRow } from "./hooks/use-templates";
export { useBodyMetrics, type BodyMetricRow } from "./hooks/use-body-metrics";
export { usePersonalRecords, type PersonalRecordRow } from "./hooks/use-personal-records";
export { useSyncStatus } from "./hooks/use-sync-status";
```

- [ ] **Step 4: Update all web app imports**

Find and replace all imports of `@/hooks/use-workouts` (and similar) in `apps/web/src/` with `@ironpulse/sync`. Do a codebase-wide search for `from "@/hooks/use-` and replace with `from "@ironpulse/sync"`.

Files to update (search for the pattern):
- `apps/web/src/app/(app)/workouts/page.tsx`
- `apps/web/src/app/(app)/workouts/[id]/page.tsx`
- `apps/web/src/app/(app)/cardio/page.tsx`
- `apps/web/src/app/(app)/cardio/[id]/page.tsx`
- `apps/web/src/app/(app)/calendar/page.tsx`
- `apps/web/src/app/(app)/stats/page.tsx`
- `apps/web/src/app/(app)/exercises/page.tsx`
- `apps/web/src/app/(app)/templates/page.tsx`
- `apps/web/src/components/layout/app-shell.tsx` (imports `SyncStatus` → update to `useSyncStatus` from `@ironpulse/sync` if applicable, or update `sync-status.tsx`)
- `apps/web/src/components/layout/sync-status.tsx`
- `apps/web/src/components/workout/active-workout.tsx`
- `apps/web/src/components/workout/add-exercise-sheet.tsx`
- `apps/web/src/components/dashboard/weekly-stats.tsx`
- `apps/web/src/components/dashboard/activity-feed.tsx`

Example change in each file:
```typescript
// Before:
import { useWorkouts } from "@/hooks/use-workouts";
// After:
import { useWorkouts } from "@ironpulse/sync";
```

- [ ] **Step 5: Update web PowerSync provider**

In `apps/web/src/lib/powersync/provider.tsx`, update the `BackendConnector` instantiation to use the new constructor (no options needed for web — cookie auth still works):

```typescript
const connector = new BackendConnector();
```

This should already work since the constructor options are all optional.

- [ ] **Step 6: Verify web app still builds**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add packages/sync/ apps/web/
git commit -m "move PowerSync hooks to packages/sync for cross-platform sharing"
```

---

## Chunk 2: Server-Side Bearer Auth

### Task 3: Mobile Auth JWT Utilities

**Files:**
- Create: `packages/api/src/lib/mobile-auth.ts`
- Create: `packages/api/__tests__/mobile-auth.test.ts`

- [ ] **Step 1: Write tests**

Create `packages/api/__tests__/mobile-auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { signMobileToken, verifyMobileToken } from "../src/lib/mobile-auth";
import type { SessionUser } from "@ironpulse/shared";

const testUser: SessionUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  tier: "athlete",
  subscriptionStatus: "none",
  unitSystem: "metric",
  onboardingComplete: true,
};

describe("signMobileToken", () => {
  it("returns a JWT string", () => {
    const token = signMobileToken(testUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyMobileToken", () => {
  it("round-trips: sign then verify returns the user", () => {
    const token = signMobileToken(testUser);
    const result = verifyMobileToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-123");
    expect(result!.email).toBe("test@example.com");
  });

  it("returns null for invalid tokens", () => {
    const result = verifyMobileToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("returns null for expired tokens", () => {
    // We can't easily test expiry without mocking time,
    // so we just verify the token has an exp claim
    const token = signMobileToken(testUser);
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ironpulse/api test -- mobile-auth`
Expected: FAIL — module not found

- [ ] **Step 3: Implement mobile-auth.ts**

Create `packages/api/src/lib/mobile-auth.ts`:

```typescript
import jwt from "jsonwebtoken";
import type { SessionUser } from "@ironpulse/shared";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function signMobileToken(user: SessionUser): string {
  return jwt.sign(
    { sub: user.id, user },
    getSecret(),
    { expiresIn: "30d" }
  );
}

export function verifyMobileToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { user: SessionUser };
    return payload.user;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ironpulse/api test -- mobile-auth`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/mobile-auth.ts packages/api/__tests__/mobile-auth.test.ts
git commit -m "add mobile JWT auth sign/verify utilities"
```

### Task 4: Bearer Auth Middleware + Mobile Auth Routes

**Files:**
- Modify: `packages/api/src/trpc.ts`
- Modify: `packages/api/src/routers/auth.ts`
- Modify: `packages/shared/src/schemas/auth.ts`

- [ ] **Step 1: Add bearerOrSessionProcedure to trpc.ts**

Add to `packages/api/src/trpc.ts` after the existing `protectedProcedure`:

```typescript
import { verifyMobileToken } from "./lib/mobile-auth";

// Accepts either cookie session (web) or bearer token (mobile)
export const flexAuthProcedure = t.procedure.use(({ ctx, next }) => {
  // First try existing session (cookie auth from web)
  if (ctx.session?.user) {
    return next({
      ctx: { session: ctx.session, user: ctx.session.user },
    });
  }

  // Then try bearer token (mobile auth)
  // Note: ctx needs to carry raw headers — see tRPC route handler changes
  const authHeader = (ctx as any).authHeader as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyMobileToken(token);
    if (user) {
      return next({
        ctx: { session: { user }, user },
      });
    }
  }

  throw new TRPCError({ code: "UNAUTHORIZED" });
});
```

Also update `CreateContextOptions` to include `authHeader`:

```typescript
export interface CreateContextOptions {
  db: PrismaClient;
  session: { user: SessionUser } | null;
  clientIp?: string;
  authHeader?: string;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    db: opts.db,
    session: opts.session,
    clientIp: opts.clientIp,
    authHeader: opts.authHeader,
  };
};
```

- [ ] **Step 2: Update tRPC route handler to pass auth header**

In `apps/web/src/app/api/trpc/[trpc]/route.ts`, update the `createContext` call to include the auth header:

```typescript
createContext: () =>
  createTRPCContext({
    db,
    session: session?.user ? { user: { ... } } : null,
    authHeader: req.headers.get("authorization") ?? undefined,
  }),
```

- [ ] **Step 3: Update protectedProcedure to also accept bearer tokens**

Replace the existing `protectedProcedure` with `flexAuthProcedure` logic, so ALL protected routes accept either cookie or bearer auth. This way the existing `sync.getToken` and other routes work for both web and mobile without changes.

Actually, the simplest approach: modify `protectedProcedure` itself to check both:

```typescript
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // Cookie session (web)
  if (ctx.session?.user) {
    return next({
      ctx: { session: ctx.session, user: ctx.session.user },
    });
  }

  // Bearer token (mobile)
  const authHeader = (ctx as any).authHeader as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyMobileToken(token);
    if (user) {
      return next({
        ctx: { session: { user }, user },
      });
    }
  }

  throw new TRPCError({ code: "UNAUTHORIZED" });
});
```

This way all existing protected routes (sync, workout, cardio, etc.) automatically work with mobile bearer auth.

- [ ] **Step 4: Add mobileSignIn and mobileSignUp to auth router**

Add to `packages/api/src/routers/auth.ts`:

```typescript
import { signMobileToken } from "../lib/mobile-auth";

// Add these after the existing signIn/signUp:

mobileSignIn: publicProcedure
  .input(signInSchema)
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        tier: true,
        subscriptionStatus: true,
        unitSystem: true,
        onboardingComplete: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const { passwordHash: _, ...sessionUser } = user;
    const token = signMobileToken(sessionUser as any);

    return { token, user: sessionUser };
  }),

mobileSignUp: publicProcedure
  .input(signUpSchema)
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await ctx.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        accounts: {
          create: { provider: "email", providerAccountId: input.email },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        unitSystem: true,
        onboardingComplete: true,
      },
    });

    const token = signMobileToken(user as any);

    return { token, user };
  }),
```

- [ ] **Step 5: Verify existing tests still pass**

Run: `pnpm --filter @ironpulse/api test`
Expected: All tests pass (existing + new)

- [ ] **Step 6: Verify web app still builds**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add packages/api/ apps/web/src/app/api/trpc/
git commit -m "add bearer token auth for mobile: mobileSignIn, mobileSignUp, flexible protectedProcedure"
```

---

## Chunk 3: Expo App Scaffold

### Task 5: Create Expo App with Dependencies

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/nativewind-env.d.ts`
- Create: `apps/mobile/global.css`

- [ ] **Step 1: Scaffold with Expo CLI**

Run: `cd apps && npx create-expo-app@latest mobile --template blank-typescript && cd ..`

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm --filter @ironpulse/mobile add expo-router expo-secure-store expo-linking expo-constants expo-status-bar @powersync/react-native @powersync/react @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-screens @ironpulse/sync @ironpulse/shared @trpc/client superjson nativewind tailwindcss @expo/vector-icons
```

- [ ] **Step 3: Update app.json**

Update `apps/mobile/app.json` to include Expo Router scheme, dark mode, and bundle ID:

```json
{
  "expo": {
    "name": "IronPulse",
    "slug": "ironpulse",
    "version": "1.0.0",
    "scheme": "ironpulse",
    "userInterfaceStyle": "dark",
    "ios": {
      "bundleIdentifier": "com.ironpulse.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.ironpulse.app",
      "adaptiveIcon": {
        "backgroundColor": "#0a0e1a"
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

- [ ] **Step 4: Configure Metro for monorepo**

Create `apps/mobile/metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

- [ ] **Step 5: Configure NativeWind**

Create `apps/mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

Create `apps/mobile/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(224 71% 4%)",
        foreground: "hsl(213 31% 91%)",
        primary: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        muted: {
          DEFAULT: "hsl(223 47% 11%)",
          foreground: "hsl(215 20% 65%)",
        },
        accent: {
          DEFAULT: "hsl(216 34% 17%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(224 71% 4%)",
          foreground: "hsl(213 31% 91%)",
        },
        border: "hsl(216 34% 17%)",
        destructive: {
          DEFAULT: "hsl(0 63% 31%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Create `apps/mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `apps/mobile/nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Update tsconfig.json**

Create `apps/mobile/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "nativewind-env.d.ts"]
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/
git commit -m "scaffold Expo app with NativeWind, Metro monorepo config, and dependencies"
```

### Task 6: Base UI Components

**Files:**
- Create: `apps/mobile/components/ui/button.tsx`
- Create: `apps/mobile/components/ui/card.tsx`
- Create: `apps/mobile/components/ui/input.tsx`
- Create: `apps/mobile/components/ui/badge.tsx`

- [ ] **Step 1: Create Button component**

Create `apps/mobile/components/ui/button.tsx`:

```typescript
import { Pressable, Text, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost";
  children: React.ReactNode;
}

const variantClasses = {
  default: "bg-primary",
  outline: "border border-border bg-transparent",
  ghost: "bg-transparent",
};

const textClasses = {
  default: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
};

export function Button({ variant = "default", children, ...props }: ButtonProps) {
  return (
    <Pressable
      className={`rounded-lg px-4 py-3 items-center justify-center ${variantClasses[variant]} active:opacity-70`}
      {...props}
    >
      <Text className={`text-sm font-semibold ${textClasses[variant]}`}>
        {typeof children === "string" ? children : null}
      </Text>
      {typeof children !== "string" ? children : null}
    </Pressable>
  );
}
```

- [ ] **Step 2: Create Card component**

Create `apps/mobile/components/ui/card.tsx`:

```typescript
import { View, type ViewProps } from "react-native";

export function Card({ className = "", children, ...props }: ViewProps & { children: React.ReactNode }) {
  return (
    <View className={`rounded-xl border border-border bg-card p-4 ${className}`} {...props}>
      {children}
    </View>
  );
}
```

- [ ] **Step 3: Create Input component**

Create `apps/mobile/components/ui/input.tsx`:

```typescript
import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground"
        placeholderTextColor="hsl(215 20% 65%)"
        {...props}
      />
    </View>
  );
}
```

- [ ] **Step 4: Create Badge component**

Create `apps/mobile/components/ui/badge.tsx`:

```typescript
import { View, Text } from "react-native";

interface BadgeProps {
  children: string;
  variant?: "default" | "secondary";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const bg = variant === "default" ? "bg-primary" : "bg-muted";
  const text = variant === "default" ? "text-primary-foreground" : "text-muted-foreground";

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{children}</Text>
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/
git commit -m "add base UI components: Button, Card, Input, Badge"
```

---

## Chunk 4: Auth & PowerSync Integration

### Task 7: Mobile tRPC Client & Auth Provider

**Files:**
- Create: `apps/mobile/lib/trpc.ts`
- Create: `apps/mobile/lib/auth.tsx`
- Create: `apps/mobile/lib/powersync.ts`

- [ ] **Step 1: Create tRPC client**

Create `apps/mobile/lib/trpc.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "expo-secure-store";
import type { AppRouter } from "@ironpulse/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        const token = await SecureStore.getItemAsync("auth-token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
```

- [ ] **Step 2: Create Auth provider**

Create `apps/mobile/lib/auth.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import type { SessionUser } from "@ironpulse/shared";
import { trpc } from "./trpc";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    async function restore() {
      try {
        const storedToken = await SecureStore.getItemAsync("auth-token");
        const storedUser = await SecureStore.getItemAsync("auth-user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as SessionUser;
          setToken(storedToken);
          setUser(parsedUser);

          // Verify token is still valid (best-effort)
          try {
            await trpc.auth.getSession.query();
          } catch {
            // Token expired or network unavailable — use stored user optimistically
            // PowerSync works offline anyway
          }
        }
      } catch {
        // Secure store read failed — stay logged out
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await trpc.auth.mobileSignIn.mutate({ email, password });
    await SecureStore.setItemAsync("auth-token", result.token);
    await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user as SessionUser);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await trpc.auth.mobileSignUp.mutate({ name, email, password });
    await SecureStore.setItemAsync("auth-token", result.token);
    await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user as SessionUser);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync("auth-token");
    await SecureStore.deleteItemAsync("auth-user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create PowerSync init**

Create `apps/mobile/lib/powersync.ts`:

```typescript
import { PowerSyncDatabase } from "@powersync/react-native";
import { AppSchema, BackendConnector } from "@ironpulse/sync";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

let dbInstance: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  dbInstance = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: "ironpulse.db" },
  });

  return dbInstance;
}

export function createMobileConnector(): BackendConnector {
  return new BackendConnector({
    baseUrl: API_URL,
    getAuthToken: () => SecureStore.getItemAsync("auth-token"),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/
git commit -m "add mobile tRPC client, auth provider, and PowerSync init"
```

### Task 8: Root Layout & Auth Screens

**Files:**
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/signup.tsx`

- [ ] **Step 1: Create root layout**

Create `apps/mobile/app/_layout.tsx`:

```typescript
import "../global.css";
import { useEffect } from "react";
import { Redirect, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PowerSyncContext } from "@powersync/react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { getPowerSyncDatabase, createMobileConnector } from "@/lib/powersync";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const db = getPowerSyncDatabase();

  useEffect(() => {
    if (user) {
      const connector = createMobileConnector();
      db.connect(connector);
    } else {
      db.disconnect();
    }
  }, [user]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="hsl(210 40% 98%)" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <Redirect href="/(tabs)" />
    </PowerSyncContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Create auth layout**

Create `apps/mobile/app/(auth)/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "hsl(224 71% 4%)" },
      }}
    />
  );
}
```

- [ ] **Step 3: Create login screen**

Create `apps/mobile/app/(auth)/login.tsx`:

```typescript
import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Sign In Failed", error?.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-foreground mb-2">IronPulse</Text>
        <Text className="text-muted-foreground mb-8">Sign in to your account</Text>

        <View className="gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button onPress={handleSignIn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </View>

        <Link href="/(auth)/signup" asChild>
          <Text className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account? <Text className="text-primary font-medium">Sign Up</Text>
          </Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Create signup screen**

Create `apps/mobile/app/(auth)/signup.tsx`:

```typescript
import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await signUp(name, email, password);
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error?.message ?? "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-foreground mb-2">Create Account</Text>
        <Text className="text-muted-foreground mb-8">Start tracking your fitness</Text>

        <View className="gap-4">
          <Input label="Name" value={name} onChangeText={setName} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button onPress={handleSignUp} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </View>

        <Link href="/(auth)/login" asChild>
          <Text className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Text className="text-primary font-medium">Sign In</Text>
          </Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/
git commit -m "add root layout, auth layout, login and signup screens"
```

---

## Chunk 5: Tab Navigation & Screens

### Task 9: Tab Layout with FAB

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/components/layout/new-session-sheet.tsx`

- [ ] **Step 1: Create tab layout**

Create `apps/mobile/app/(tabs)/_layout.tsx`:

```typescript
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Tabs } from "expo-router";
import { Home, BarChart3, Dumbbell, User, Plus } from "lucide-react-native";
import { NewSessionSheet } from "@/components/layout/new-session-sheet";

export default function TabLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "hsl(224 71% 4%)",
            borderTopColor: "hsl(216 34% 17%)",
          },
          tabBarActiveTintColor: "hsl(210 40% 98%)",
          tabBarInactiveTintColor: "hsl(215 20% 65%)",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="fab"
          options={{
            title: "",
            tabBarIcon: () => (
              <View className="bg-primary rounded-full w-12 h-12 items-center justify-center -mt-4">
                <Plus size={24} color="hsl(222.2 47.4% 11.2%)" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setSheetOpen(true);
            },
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: "Exercises",
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
      <NewSessionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
```

Note: The "fab" tab is a dummy — it intercepts the press and opens the sheet instead.

- [ ] **Step 2: Create placeholder fab screen**

Create `apps/mobile/app/(tabs)/fab.tsx`:

```typescript
import { View } from "react-native";

// This screen is never shown — the tab press is intercepted to open the new session sheet
export default function FabPlaceholder() {
  return <View />;
}
```

- [ ] **Step 3: Create new session sheet**

Create `apps/mobile/components/layout/new-session-sheet.tsx`:

```typescript
import { useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Dumbbell, Activity } from "lucide-react-native";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewSessionSheet({ open, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["30%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223 47% 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215 20% 65%)" }}
    >
      <BottomSheetView className="px-6 py-4 gap-3">
        <Text className="text-lg font-bold text-foreground mb-2">New Session</Text>

        <Pressable
          className="flex-row items-center gap-4 rounded-xl bg-accent p-4 active:opacity-70"
          onPress={() => {
            onClose();
            // TODO: Navigate to new workout (sub-project 2)
          }}
        >
          <Dumbbell size={24} color="hsl(210 40% 98%)" />
          <Text className="text-foreground font-medium">Start Workout</Text>
        </Pressable>

        <Pressable
          className="flex-row items-center gap-4 rounded-xl bg-accent p-4 active:opacity-70"
          onPress={() => {
            onClose();
            // TODO: Navigate to new cardio (sub-project 3)
          }}
        >
          <Activity size={24} color="hsl(210 40% 98%)" />
          <Text className="text-foreground font-medium">Log Cardio</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/ apps/mobile/components/layout/
git commit -m "add tab navigation with center FAB and new session bottom sheet"
```

### Task 10: Placeholder Tab Screens

**Files:**
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/stats.tsx`
- Create: `apps/mobile/app/(tabs)/exercises.tsx`
- Create: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Create dashboard screen**

Create `apps/mobile/app/(tabs)/index.tsx`:

```typescript
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Dumbbell, Activity } from "lucide-react-native";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();

  const recentWorkouts = (workouts ?? []).slice(0, 5);
  const recentCardio = (cardioSessions ?? []).slice(0, 5);

  const activities = [
    ...recentWorkouts.map((w) => ({ type: "workout" as const, id: w.id, name: w.name ?? "Workout", date: w.started_at })),
    ...recentCardio.map((c) => ({ type: "cardio" as const, id: c.id, name: c.type, date: c.started_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </Text>
        <Text className="text-muted-foreground mt-1">Ready to train?</Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Card>
            <Text className="text-muted-foreground text-center py-8">
              No activity yet. Start your first workout!
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card className="flex-row items-center gap-3">
            {item.type === "workout" ? (
              <Dumbbell size={20} color="hsl(210 40% 98%)" />
            ) : (
              <Activity size={20} color="hsl(210 40% 98%)" />
            )}
            <View className="flex-1">
              <Text className="text-foreground font-medium capitalize">{item.name}</Text>
              <Text className="text-muted-foreground text-xs">
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Create stats screen**

Create `apps/mobile/app/(tabs)/stats.tsx`:

```typescript
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBodyMetrics } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";

export default function StatsScreen() {
  const { data: metrics } = useBodyMetrics();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">Stats</Text>
      </View>

      {(metrics ?? []).length > 0 ? (
        <FlatList
          data={metrics}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Card className="flex-row items-center justify-between">
              <Text className="text-foreground">{new Date(item.date).toLocaleDateString()}</Text>
              <Text className="text-foreground font-medium">
                {item.weight_kg != null ? `${item.weight_kg} kg` : "—"}
              </Text>
            </Card>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground text-center">
            More analytics coming soon
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Create exercises screen**

Create `apps/mobile/app/(tabs)/exercises.tsx`:

```typescript
import { useState } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExercises } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises({ search: search || undefined });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground mb-4">Exercises</Text>
        <Input
          label=""
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text className="text-muted-foreground text-center py-8">
            {search ? "No exercises found" : "Syncing exercises..."}
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text className="text-foreground font-medium">{item.name}</Text>
            <View className="flex-row gap-2 mt-1">
              {item.category && (
                <Text className="text-xs text-muted-foreground capitalize">{item.category}</Text>
              )}
              {item.primary_muscles && (
                <Text className="text-xs text-muted-foreground">
                  {(() => {
                    try { return JSON.parse(item.primary_muscles).join(", "); }
                    catch { return item.primary_muscles; }
                  })()}
                </Text>
              )}
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Create profile screen**

Create `apps/mobile/app/(tabs)/profile.tsx`:

```typescript
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground mb-6">Profile</Text>

        <Card className="gap-4 mb-6">
          <View>
            <Text className="text-xs text-muted-foreground uppercase tracking-wide">Name</Text>
            <Text className="text-foreground text-lg">{user?.name}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted-foreground uppercase tracking-wide">Email</Text>
            <Text className="text-foreground">{user?.email}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted-foreground uppercase tracking-wide">Units</Text>
            <Text className="text-foreground capitalize">{user?.unitSystem}</Text>
          </View>
        </Card>

        <Button variant="outline" onPress={signOut}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/
git commit -m "add placeholder tab screens: dashboard, stats, exercises, profile"
```

---

## Chunk 6: E2E Tests & Verification

### Task 11: Maestro E2E Flows

**Files:**
- Create: `apps/mobile/e2e/auth-signup.yaml`
- Create: `apps/mobile/e2e/auth-signin.yaml`
- Create: `apps/mobile/e2e/auth-signout.yaml`
- Create: `apps/mobile/e2e/navigation-tabs.yaml`
- Create: `apps/mobile/e2e/sync-offline.yaml`

- [ ] **Step 1: Create all E2E flows**

Create `apps/mobile/e2e/auth-signup.yaml`:

```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Sign Up"
- tapOn: "Name"
- inputText: "Test User"
- tapOn: "Email"
- inputText: "test-signup@example.com"
- tapOn: "Password"
- inputText: "Password123!"
- tapOn: "Create Account"
- assertVisible: "Good morning"
```

Create `apps/mobile/e2e/auth-signin.yaml`:

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
```

Create `apps/mobile/e2e/auth-signout.yaml`:

```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Profile"
- tapOn: "Sign Out"
- assertVisible: "Sign In"
```

Create `apps/mobile/e2e/navigation-tabs.yaml`:

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
- tapOn: "Stats"
- assertVisible: "Stats"
- tapOn: "Exercises"
- assertVisible: "Exercises"
- tapOn: "Profile"
- assertVisible: "Profile"
- tapOn: "Dashboard"
- assertVisible: "Good morning"
```

Create `apps/mobile/e2e/sync-offline.yaml`:

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
- toggleAirplaneMode
- assertVisible: "Good morning"
- toggleAirplaneMode
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/e2e/
git commit -m "add Maestro E2E test flows for auth, navigation, and offline sync"
```

### Task 12: Verification

- [ ] **Step 1: Verify sync package tests pass**

Run: `pnpm --filter @ironpulse/sync test`
Expected: All tests pass

- [ ] **Step 2: Verify API tests pass**

Run: `pnpm --filter @ironpulse/api test`
Expected: All tests pass (existing + mobile auth)

- [ ] **Step 3: Verify web app builds**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds (import paths updated correctly)

- [ ] **Step 4: Verify mobile app starts**

Run: `cd apps/mobile && npx expo start`
Expected: Metro bundler starts, no module resolution errors

- [ ] **Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "fix Expo foundation issues found during verification"
```
