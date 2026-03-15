# Expo Mobile App Foundation — Design Specification

Scaffold the IronPulse Expo mobile app with navigation, authentication, PowerSync offline-first sync, dark theme, placeholder screens with real synced data, and Detox E2E tests. This is sub-project 1 of 4 for the mobile app.

## Scope

- Expo app at `apps/mobile/` in the existing Turborepo monorepo
- Auth via tRPC endpoints + `expo-secure-store` (email/password only, OAuth deferred)
- PowerSync via `@powersync/react-native` reusing `@ironpulse/sync` schema + connector
- 4-tab navigation + center FAB, matching web app structure
- NativeWind dark theme matching web app CSS variables
- Placeholder screens with real synced data
- Detox E2E tests for auth, navigation, sync, and offline flows

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
├── e2e/
│   ├── auth.test.ts                 # Sign up, sign in, sign out flows
│   ├── navigation.test.ts           # Tab switching, screen rendering
│   └── sync.test.ts                 # Data appears, offline resilience
└── .detoxrc.js                      # Detox config (iOS + Android)
```

## Authentication

Auth uses the existing tRPC `auth` router — no new backend work.

### Sign-In Flow

1. User enters email/password on login screen
2. App calls `trpc.auth.signIn.mutate({ email, password })`
3. Server returns session data (`SessionUser`: id, name, email, tier, unitSystem, etc.)
4. App stores session token in `expo-secure-store` (encrypted, per-device)
5. Subsequent tRPC calls include the token via an `Authorization` header
6. PowerSync connector calls `trpc.sync.getToken.query()` which returns the PowerSync JWT

### Sign-Up Flow

Same pattern: `trpc.auth.signUp.mutate(...)` → store token → navigate to tabs.

### OAuth

Deferred. Login screen shows email/password only. Google/Apple OAuth buttons added in a follow-up once `expo-auth-session` is wired. Server-side OAuth already exists.

### Session Persistence

On app launch, check `expo-secure-store` for a stored token. If valid, skip login and go to tabs. If expired/missing, show login screen.

### Sign-Out

Clear stored token → disconnect PowerSync → navigate to login screen.

### Auth Context

`AuthProvider` wraps the app, providing:

```typescript
interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

The root layout checks `user` and renders either `(auth)` or `(tabs)` route group.

## PowerSync on Mobile

### Shared Package Change

Modify `packages/sync/src/connector.ts` to accept an optional base URL:

```typescript
export class BackendConnector implements PowerSyncBackendConnector {
  private trpc;

  constructor(baseUrl?: string) {
    this.trpc = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${baseUrl ?? ""}/api/trpc`,
          transformer: superjson,
        }),
      ],
    });
  }
}
```

Web continues passing nothing (relative URL). Mobile passes `EXPO_PUBLIC_API_URL`.

### Mobile PowerSync Database

Uses `@powersync/react-native` instead of `@powersync/web`. The SQLite adapter uses native SQLite, not WASM:

```typescript
import { PowerSyncDatabase } from "@powersync/react-native";
import { AppSchema } from "@ironpulse/sync";

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "ironpulse.db" },
});
```

### Hook Compatibility

`useQuery`, `useStatus`, `usePowerSync` from `@powersync/react` work identically on React Native — the hooks are platform-agnostic, only the database implementation differs.

### Init Flow

1. App launches → check auth token in secure store
2. If authenticated → create `PowerSyncDatabase` + `BackendConnector(EXPO_PUBLIC_API_URL)` → `db.connect(connector)`
3. Data syncs automatically → screens show real synced data

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

Each tab can push detail screens onto a stack via Expo Router nested layouts. For the foundation, only tab screens exist. Detail screens (workout detail, exercise detail, etc.) are added in later sub-projects.

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
- Recent activity list: last 5 workouts + last 5 cardio sessions from PowerSync hooks (`useWorkouts()`, `useCardioSessions()`)
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

## E2E Testing (Detox)

### Framework Setup

- Detox with `jest-circus` test runner
- iOS Simulator and Android Emulator configurations in `.detoxrc.js`
- Tests at `apps/mobile/e2e/`

### Test Flows

| Test File | Flows | What It Validates |
|-----------|-------|-------------------|
| `auth.test.ts` | Sign up → dashboard; Sign in → dashboard; Sign out → login | Auth works, token stored/cleared, PowerSync connects/disconnects |
| `navigation.test.ts` | Tap each tab, verify screen renders | All 4 tabs render without crash, tab bar works |
| `sync.test.ts` | Sign in → data appears on dashboard; Kill network → app still shows data; Reconnect → data syncs | PowerSync offline-first works on real device |

### Test Structure

```
apps/mobile/e2e/
├── auth.test.ts
├── navigation.test.ts
└── sync.test.ts
```

### CI Consideration

Detox tests require a simulator (macOS runners). For now these run locally via `detox test`. CI integration deferred until a macOS GitHub Actions runner is configured.

## Environment Variables

```env
# Required: API server URL
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000

# Required: PowerSync service URL
EXPO_PUBLIC_POWERSYNC_URL=http://192.168.1.x:8080
```

For production builds, these point to the cloud deployment URLs.
