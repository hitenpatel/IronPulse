# Dashboard UI Design Spec

**Goal:** Implement the app shell (bottom tab bar, dark theme) and dashboard page (greeting, quick-start actions, weekly stats, recent activity feed) as the first UI surface for IronPulse.

**Prerequisite:** Core data layer (exercise, workout, cardio, bodyMetric, analytics routers) — completed.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui (new-york style), lucide-react, tRPC React Query hooks.

---

## Scope

### In Scope

- App shell with responsive bottom tab bar (mobile) / sidebar (desktop)
- Dark theme with CSS variable tokens
- shadcn/ui setup and core component installation
- Dashboard page with four sections: greeting, quick-start cards, weekly stats bar, recent activity feed
- tRPC data fetching for real data
- Empty states for new users

### Out of Scope

- Workout logging flow (start/complete a workout)
- Cardio logging flow (manual/GPS/GPX)
- Exercise browser page
- Analytics/Stats page
- Profile/Settings page
- Body metrics page
- Light mode toggle

Each out-of-scope item gets its own spec/plan cycle.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation model | Bottom tab bar (mobile-first) | Standard for fitness apps (Strong, Strava). Collapses to sidebar on desktop. |
| Color theme | Dark mode default | Gym-friendly, better data visualization contrast, market norm for fitness apps. Light mode added later via CSS variables. |
| Dashboard layout | Stats-forward | Weekly stats bar always visible for at-a-glance snapshot. Activity feed below with compact rows. |
| Component library | shadcn/ui (new-york style) | Tailwind-native, owns the code, great dark mode support. Standard for Next.js projects. |
| Quick-start actions | Workout + Cardio side-by-side | Both are first-class activities. Gradient cards with distinct colors (red=workout, blue=cardio). |

---

## Architecture

### App Shell

Responsive layout wrapping all `(app)` route group pages:

- **Mobile (< 768px):** Content area + fixed bottom tab bar. The "+" FAB in the center opens a Sheet (shadcn/ui) to choose Workout or Cardio.
- **Desktop (>= 768px):** Left sidebar with icon + label nav items. Content area with max-width constraint. The "+" becomes a prominent button in the sidebar.

**Tab bar items (5):**

| Position | Icon | Label | Route |
|----------|------|-------|-------|
| 1 | Home | Home | `/dashboard` |
| 2 | BarChart3 | Stats | `/stats` (placeholder) |
| 3 | Plus (FAB) | — | Opens new-session sheet |
| 4 | Search | Exercises | `/exercises` (placeholder) |
| 5 | User | Profile | `/profile` (placeholder) |

Placeholder routes render a simple "Coming soon" page for now.

### Dark Theme

CSS variables in `globals.css` following shadcn/ui's theming convention:

```
--background: 240 10% 6%        (#0f0f17)
--foreground: 0 0% 98%
--card: 240 15% 10%
--card-foreground: 0 0% 98%
--primary: 348 83% 60%           (#e94560 — workout red)
--secondary: 199 89% 48%         (#0ea5e9 — cardio blue)
--accent: 142 71% 45%            (#22c55e — success green)
--warning: 38 92% 50%            (#f59e0b — PR gold)
--muted: 240 10% 16%
--muted-foreground: 240 5% 55%
--border: 240 10% 14%
```

### Component Structure

```
src/
├── components/
│   ├── ui/                       # shadcn/ui generated components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── sheet.tsx
│   │   ├── separator.tsx
│   │   ├── avatar.tsx
│   │   └── badge.tsx
│   ├── layout/
│   │   ├── app-shell.tsx         # Responsive wrapper: sidebar (desktop) + bottom nav (mobile)
│   │   ├── bottom-nav.tsx        # Mobile bottom tab bar with FAB
│   │   ├── sidebar-nav.tsx       # Desktop left sidebar
│   │   └── new-session-sheet.tsx # Sheet triggered by "+" — choose Workout or Cardio
│   └── dashboard/
│       ├── greeting.tsx          # Header: "Good morning, {name}" + date + avatar
│       ├── quick-start.tsx       # Two gradient CTA cards (Workout / Cardio)
│       ├── weekly-stats.tsx      # Stats bar: workouts, cardio, volume, PRs
│       └── activity-feed.tsx     # Mixed workout + cardio list, sorted by date
├── app/(app)/
│   ├── layout.tsx                # Modified: wraps children in AppShell
│   ├── dashboard/
│   │   └── page.tsx              # Composes greeting + quick-start + weekly-stats + activity-feed
│   ├── stats/
│   │   └── page.tsx              # Placeholder
│   ├── exercises/
│   │   └── page.tsx              # Placeholder
│   └── profile/
│       └── page.tsx              # Placeholder
```

---

## Dashboard Page Sections

### 1. Greeting

- Left: "Good morning/afternoon/evening, {firstName}" based on time of day. Date below in muted text (e.g., "Thursday, Mar 12").
- Right: User avatar (initials fallback if no avatarUrl).
- Data: `session.user.name` from NextAuth session.

### 2. Quick-Start Cards

Two side-by-side cards with gradient backgrounds:

**Start Workout** (red gradient `#e94560` → `#c23152`):
- Label: "Start"
- Title: "Workout"
- Subtitle: contextual hint — if templates exist, show next template name; otherwise "Empty workout"
- On click: navigate to `/workouts/new` (placeholder for now)

**Start Cardio** (blue gradient `#0ea5e9` → `#0284c7`):
- Label: "Start"
- Title: "Cardio"
- Subtitle: "Run · Hike · Cycle"
- On click: navigate to `/cardio/new` (placeholder for now)

### 3. Weekly Stats Bar

Single row inside a subtle card, 4 metrics evenly spaced:

| Metric | Color | Source |
|--------|-------|--------|
| Workouts this week | Primary red | Count from `workout.list` where `completedAt` is within current ISO week |
| Cardio this week | Secondary blue | Count from `cardio.list` where `startedAt` is within current ISO week |
| Total volume (kg) | Accent green | Sum from `analytics.weeklyVolume({ weeks: 1 })` across all muscle groups |
| New PRs | Warning gold | Count of PRs with `achievedAt` within current ISO week (derived from workout completion data) |

**Implementation note for PR count:** There's no dedicated "PRs this week" endpoint. Two options:
1. Derive from the `analytics.personalRecords` endpoint by filtering recent entries — but this requires knowing all exerciseIds.
2. Add a simple count query. For MVP, hardcode to 0 and add a proper endpoint later.

Recommended: option 2 — show the stat slot but display 0 until a `analytics.weeklyPRCount` query is added. This avoids an N+1 query problem on the dashboard.

### 4. Activity Feed

Mixed list of recent workouts and cardio sessions, merged and sorted by date descending. Limited to 10 items.

**Workout row:**
- Icon: Dumbbell (lucide) in red-tinted background
- Title: Workout name (or "Workout" if unnamed)
- Subtitle: "{exerciseCount} exercises · {duration}" — exercise count from `_count.workoutExercises`, duration formatted from `durationSeconds`
- PR badge: gold "New PR" badge if the workout had PRs (requires checking `personalRecord` table — defer to future, omit badge for MVP)
- Timestamp: relative ("Today", "Yesterday", "Mon", etc.)

**Cardio row:**
- Icon: Activity (lucide) in blue-tinted background
- Title: Capitalized type (e.g., "Run", "Hike")
- Subtitle: "{distance} · {duration} · {pace}" — distance formatted as km, duration as mm:ss, pace as min/km
- Timestamp: relative

**Data fetching:**
```typescript
const workouts = trpc.workout.list.useQuery({ limit: 10 });
const cardio = trpc.cardio.list.useQuery({ limit: 10 });
```
Merge results client-side, sort by `startedAt` descending, take first 10.

**Empty state:** Centered illustration-free message: "No activity yet. Start your first workout!" with a CTA button linking to the quick-start action.

---

## Formatting Utilities

Shared formatting functions needed across dashboard components:

- `formatDuration(seconds: number): string` — "52 min", "1h 12min"
- `formatDistance(meters: number): string` — "5.2 km"
- `formatPace(meters: number, seconds: number): string` — "5:29/km"
- `formatRelativeDate(date: Date): string` — "Today", "Yesterday", "Mon", "Mar 5"
- `formatVolume(kg: number): string` — "12,400 kg"
- `getGreeting(): string` — "Good morning/afternoon/evening"

Location: `src/lib/format.ts`

---

## Responsive Behavior

| Breakpoint | Navigation | Dashboard Grid |
|------------|-----------|----------------|
| < 768px (mobile) | Bottom tab bar, fixed | Single column, full width with 16px padding |
| >= 768px (tablet) | Bottom tab bar, fixed | Single column, max-width 640px centered |
| >= 1024px (desktop) | Left sidebar, 64px wide | Single column, max-width 640px, offset by sidebar |

The dashboard content is intentionally single-column at all sizes — it's a feed-style layout that works best narrow. The extra space on desktop is whitespace, not additional columns.

---

## Placeholder Pages

Three placeholder pages for nav items that aren't built yet:

- `/stats` — "Stats — Coming soon"
- `/exercises` — "Exercises — Coming soon"
- `/profile` — "Profile — Coming soon"

Each is a simple centered heading. They exist so the nav items have valid destinations.

---

## New Session Sheet

When the user taps the "+" FAB, a Sheet (shadcn/ui) slides up from the bottom (mobile) or appears as a dialog (desktop) with two options:

- **Start Workout** — same styling as the quick-start card, navigates to `/workouts/new`
- **Log Cardio** — same styling as the quick-start card, navigates to `/cardio/new`

This duplicates the quick-start cards intentionally — the FAB is accessible from any page, not just the dashboard.

---

## Testing Strategy

- **Component tests (Vitest + React Testing Library):** Test each dashboard component renders correctly with mock tRPC data. Test empty states render when data is empty.
- **No E2E tests** for this phase — visual verification is sufficient for a dashboard layout.
- **TypeScript compilation:** Verify `pnpm --filter @ironpulse/web build` succeeds.
