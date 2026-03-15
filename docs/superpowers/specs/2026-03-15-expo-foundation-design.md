# Expo Mobile App Foundation — Design Specification

Scaffold the IronPulse Expo mobile app with navigation, authentication, PowerSync offline-first sync, dark theme, placeholder screens with real synced data, and Maestro E2E tests. This is sub-project 1 of 4 for the mobile app.

## Scope

- Expo app at `apps/mobile/` in the existing Turborepo monorepo
- Auth via tRPC endpoints + `expo-secure-store` (email/password only, OAuth deferred)
- PowerSync via `@powersync/react-native` reusing `@ironpulse/sync` schema + connector
- 4-tab navigation + center FAB, matching web app structure
- NativeWind dark theme matching web app CSS variables
- Placeholder screens with real synced data
- Maestro E2E tests for auth, navigation, sync, and offline flows

## Out of Scope (Later Sub-Projects)

- Sub-project 2: Workout logging UI (mobile)
- Sub-project 3: Cardio + GPS live tracking (expo-location, background tasks)
- Sub-project 4: Dashboard polish + remaining feature screens

## Architecture

### Monorepo Integration

The mobile app consumes shared packages but does NOT depend on `@ironpulse/db` (Prisma is server-only):

```
apps/mobile/
  depends on:
    @ironpulse/sync    → PowerSync schema + connector
    @ironpulse/shared  → Zod schemas, enums, types
    @ironpulse/api     → AppRouter type (for tRPC client typing)
```

### Metro Configuration

Metro requires explicit configuration for Turborepo monorepo resolution. `metro.config.js` must set:
- `watchFolders`: point to root `node_modules/` and shared `packages/` directories
- `nodeModulesPaths`: include root `node_modules/` for hoisted dependencies
- `extraNodeModules`: alias `@ironpulse/*` packages for Metro resolution

This is a known pain point with Expo in monorepos — the config prevents "module not found" errors for workspace dependencies.

### App Structure

```
apps/mobile/
├── app.json                         # Expo config (scheme, plugins, dark mode)
├── package.json
├── tsconfig.json
├── babel.config.js                  # NativeWind + module aliases
├── tailwind.config.ts               # Dark theme values matching web
├── nativewind-env.d.ts
├── global.css                       # Tailwind directives + dark theme CSS vars
├── metro.config.js                  # Metro bundler config for monorepo
├── app/                             # Expo Router (file-based routing)
│   ├── _layout.tsx                  # Root layout (providers: Auth, tRPC, PowerSync)
│   ├── (auth)/
│   │   ├── _layout.tsx              # Auth layout (no tabs)
│   │   ├── login.tsx                # Email/password sign in
│   │   └── signup.tsx               # Email/password registration
│   └── (tabs)/
│       ├── _layout.tsx              # Tab bar config (4 tabs + FAB)
│       ├── index.tsx                # Dashboard placeholder
│       ├── stats.tsx                # Stats placeholder
│       ├── exercises.tsx            # Exercise list (real data)
│       └── profile.tsx              # Profile + sign out
├── components/
│   ├── ui/
│   │   ├── button.tsx               # Pressable with variants
│   │   ├── card.tsx                 # Container with background
│   │   ├── input.tsx                # TextInput with label
│   │   └── badge.tsx                # Small status indicator
│   └── layout/
│       └── new-session-sheet.tsx     # Bottom sheet for new workout/cardio
├── lib/
│   ├── auth.tsx                     # AuthProvider context + secure storage
│   ├── trpc.ts                      # tRPC client with EXPO_PUBLIC_API_URL
│   └── powersync.ts                 # PowerSync database init for RN
└── e2e/                             # Maestro E2E flows
    ├── auth-signup.yaml
    ├── auth-signin.yaml
    ├── auth-signout.yaml
    ├── navigation-tabs.yaml
    └── sync-offline.yaml
```

## Shared Package Migration (`packages/sync`)

### Problem

The `packages/sync/` package currently imports from `@powersync/web`, which bundles WASM/IndexedDB code that fails on React Native. To share the package between web and mobile, imports must be platform-agnostic.

### Solution

Migrate `packages/sync` imports from `@powersync/web` to `@powersync/common`:

**schema.ts:** Change `import { column, Schema, Table } from "@powersync/web"` to `import { column, Schema, Table } from "@powersync/common"`. These types are defined in `@powersync/common` and re-exported by both `@powersync/web` and `@powersync/react-native`.

**connector.ts:** Change `import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from "@powersync/web"` to import from `@powersync/common`. The `BackendConnector` interface is platform-agnostic — only the database construction differs.

**package.json:** Replace `@powersync/web` dependency with `@powersync/common`. Web app adds `@powersync/web` as its own dependency; mobile adds `@powersync/react-native`.

This is a non-breaking change — `@powersync/common` is already installed as a transitive dependency of `@powersync/web`.

### Connector Auth Token Injection

The current connector relies on browser cookie-based auth (relative `/api/trpc` URL, cookies sent automatically). Mobile has no cookies — it uses bearer tokens stored in `expo-secure-store`.

The connector must accept both a `baseUrl` and an `authTokenGetter` for injecting the bearer token:

```typescript
export class BackendConnector implements PowerSyncBackendConnector {
  private trpc;

  constructor(opts?: { baseUrl?: string; getAuthToken?: () => Promise<string | null> }) {
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
}
```

Web passes nothing (relative URL, cookie auth). Mobile passes `{ baseUrl: EXPO_PUBLIC_API_URL, getAuthToken: () => SecureStore.getItemAsync("auth-token") }`.

### PowerSync Hooks

The PowerSync hooks (`useWorkouts`, `useCardioSessions`, `useExercises`, etc.) currently live in `apps/web/src/hooks/`. Since they are just SQL queries over the PowerSync database using `useQuery` from `@powersync/react` (which is platform-agnostic), they should be moved to `packages/sync/src/hooks/` so both web and mobile can import them.

The hooks files move from `apps/web/src/hooks/use-workouts.ts` etc. to `packages/sync/src/hooks/use-workouts.ts` etc. The web app updates its imports from `@/hooks/use-workouts` to `@ironpulse/sync`.

## Authentication

### Server-Side Changes

The existing `auth.signIn` and `auth.signUp` tRPC mutations use NextAuth session cookies on web. Mobile needs bearer token auth. Required backend changes:

1. **New tRPC mutations**: `auth.mobileSignIn` and `auth.mobileSignUp` — same validation as existing mutations but return a signed JWT bearer token instead of setting a cookie. The JWT contains the `SessionUser` payload and is signed with `NEXTAUTH_SECRET`.

2. **New middleware**: A `bearerAuthProcedure` in `trpc.ts` that extracts the `Authorization: Bearer <token>` header, verifies the JWT, and populates `ctx.session.user`. This sits alongside the existing cookie-based `protectedProcedure`. Routes used by both web and mobile (like `sync.getToken`) use whichever auth method is present.

3. **Token format**: `{ sub: userId, user: SessionUser, exp: 30d }`. Long expiry since mobile apps stay signed in. The token is opaque to the client — stored and forwarded as-is.

### Mobile Auth Flow

1. User enters email/password on login screen
2. App calls `trpc.auth.mobileSignIn.mutate({ email, password })`
3. Server validates credentials, returns `{ token: string, user: SessionUser }`
4. App stores token in `expo-secure-store` under key `"auth-token"`
5. App stores serialized user in `expo-secure-store` under key `"auth-user"`
6. tRPC client includes `Authorization: Bearer <token>` on all subsequent requests
7. PowerSync connector calls `trpc.sync.getToken.query()` (authenticated via bearer token) which returns the PowerSync JWT

### Session Persistence & Expiry

On app launch:
1. Read token and user from `expo-secure-store`
2. If both exist, call `trpc.auth.getSession.query()` to verify the token is still valid
3. If valid → set user in auth context, connect PowerSync, show tabs
4. If expired/invalid (401) → clear stored token, show login screen
5. If network unavailable → use stored user optimistically, PowerSync works offline

### Token Expiry Mid-Session

If any tRPC call returns 401 during use (token expired while app was backgrounded):
- Clear stored token and user
- Disconnect PowerSync
- Navigate to login screen
- Show a toast: "Session expired, please sign in again"

This is handled by a tRPC link that intercepts 401 responses.

### Sign-Out

Clear token + user from secure store → disconnect PowerSync → navigate to login.

### Auth Context

```typescript
interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

## PowerSync on Mobile

### Mobile PowerSync Database

Uses `@powersync/react-native` instead of `@powersync/web`. Native SQLite, not WASM:

```typescript
import { PowerSyncDatabase } from "@powersync/react-native";
import { AppSchema } from "@ironpulse/sync";

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "ironpulse.db" },
});
```

### Hook Compatibility

`useQuery`, `useStatus`, `usePowerSync` from `@powersync/react` work identically on React Native — the hooks are platform-agnostic, only the database implementation differs. The shared hooks from `packages/sync/src/hooks/` work on both platforms.

### Init Flow

1. App launches → read auth token from secure store
2. If authenticated → create `PowerSyncDatabase` + `BackendConnector({ baseUrl: EXPO_PUBLIC_API_URL, getAuthToken })` → `db.connect(connector)`
3. `fetchCredentials()` calls `sync.getToken` (authenticated via bearer token) → returns PowerSync JWT
4. Data syncs automatically → screens show real synced data

## Navigation

### Tab Bar

4 tabs using Expo Router's `(tabs)` layout:

| Tab | Icon | Screen |
|-----|------|--------|
| Dashboard | `Home` | Recent activity, quick stats |
| Stats | `BarChart3` | Analytics placeholder |
| Exercises | `Dumbbell` | Exercise library (real data) |
| Profile | `User` | Settings, sign out |

### Center FAB

A "+" button overlaid at the center of the tab bar. Opens a bottom sheet (`@gorhom/bottom-sheet`) with two options: "New Workout" and "Log Cardio". For the foundation these navigate to placeholder screens — real UIs come in sub-projects 2-3.

### Stack Navigation

Each tab can push detail screens onto a stack via Expo Router nested layouts. For the foundation, only tab screens exist. Detail screens are added in later sub-projects.

## Dark Theme

NativeWind with the same CSS variable values as the web app:

```css
:root {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  --primary: 210 40% 98%;
  --muted: 223 47% 11%;
  --muted-foreground: 215 20% 65%;
  --accent: 216 34% 17%;
  --card: 224 71% 4%;
  --border: 216 34% 17%;
  --destructive: 0 63% 31%;
}
```

`colorScheme: "dark"` set in `app.json`. All components use NativeWind classes (`bg-background`, `text-foreground`, `bg-card`, etc.).

## Base UI Components

Small set in `components/ui/`, built with NativeWind on React Native primitives:

| Component | RN Primitive | Purpose |
|-----------|-------------|---------|
| `Button` | `Pressable` + `Text` | Variants: default, outline, ghost. Press states. |
| `Card` | `View` | Rounded container with `bg-card` and border |
| `Input` | `View` + `Text` + `TextInput` | Label + text input with focus ring |
| `Badge` | `View` + `Text` | Small status pill |

These mirror the web app's shadcn/ui components in API shape but use RN primitives.

## Placeholder Screens

### Dashboard (`(tabs)/index.tsx`)

Functional placeholder proving sync works:
- Greeting: "Good morning, {name}" (from auth context)
- Quick-start cards: "Start Workout" / "Log Cardio" (navigate to placeholder)
- Recent activity list: last 5 workouts + last 5 cardio sessions from PowerSync hooks (`useWorkouts()`, `useCardioSessions()` from `@ironpulse/sync`)
- Shows real synced data, validating the full stack

### Stats (`(tabs)/stats.tsx`)

Minimal placeholder:
- "Stats" heading
- Body weight entries from `useBodyMetrics()` if any exist
- "More analytics coming soon" message

### Exercises (`(tabs)/exercises.tsx`)

Functional — proves exercise database syncs:
- Search input
- List of exercises from `useExercises({ search })`
- Shows name, category, primary muscles

### Profile (`(tabs)/profile.tsx`)

Functional:
- User name, email (from auth context)
- Unit system display
- Sign out button

## E2E Testing (Maestro)

### Why Maestro

Maestro over Detox for simplicity: YAML-based flows, no native build configuration, works with any Expo build, readable by non-developers. Maestro drives the app via the accessibility tree (black-box) which is more resilient to implementation changes.

### Setup

Install: `brew install maestro` (or `curl -Ls "https://get.maestro.mobile.dev" | bash`)

No project-level config file needed. Flows reference the app by bundle ID from `app.json`.

### Test Flows

```
apps/mobile/e2e/
├── auth-signup.yaml          # Sign up → lands on dashboard
├── auth-signin.yaml          # Sign in → lands on dashboard
├── auth-signout.yaml         # Sign out → lands on login
├── navigation-tabs.yaml      # Tap each tab, verify screen renders
└── sync-offline.yaml         # Sign in → data appears → airplane mode → data persists
```

#### auth-signup.yaml
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

#### auth-signin.yaml
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

#### auth-signout.yaml
```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Profile"
- tapOn: "Sign Out"
- assertVisible: "Sign In"
```

#### navigation-tabs.yaml
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

#### sync-offline.yaml
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

### Test Environment

E2E tests require a running backend with seeded data. For local testing:
1. Run `docker compose up` (starts PostgreSQL, Redis, MinIO, PowerSync)
2. Run `pnpm --filter @ironpulse/web dev` (starts the API server)
3. Seed a test user via `prisma db seed` or a setup script
4. Run `maestro test apps/mobile/e2e/`

CI integration deferred — Maestro tests require a macOS runner with a simulator. Maestro Cloud offers managed runners as a future option.

## Environment Variables

```env
# Required: API server URL (absolute — no relative URLs on mobile)
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
```

Note: `EXPO_PUBLIC_POWERSYNC_URL` is NOT needed as a separate env var. The PowerSync URL is returned by the `sync.getToken` server endpoint, which already knows the correct URL. This keeps configuration centralized on the server.

For production builds, `EXPO_PUBLIC_API_URL` points to the cloud deployment URL.
