# Mobile Dashboard Polish + Remaining Screens — Design Specification

Polish the dashboard, add workout/cardio history and detail views, calendar, stats with weight chart, template management, and profile editing. This is sub-project 4 of 4 — the final MVP mobile piece.

## Scope

- Dashboard polish: quick-start cards, weekly summary, polished activity feed
- Workout history list + detail view (read-only review)
- Cardio history list + detail view with route map
- Calendar view with activity dots and day detail
- Stats: SVG weight trend chart + weight logging form
- Templates: list, delete, start workout from template
- Profile: edit name, unit system toggle
- 2 Maestro E2E flows

## Out of Scope

- Save-as-template (post-MVP)
- Advanced analytics charts (post-MVP Phase 3)
- Social features (post-MVP Phase 4)

## Navigation

New screens pushed from tabs via Expo Router:

```
(tabs)/index (Dashboard)
  → /history/workouts              # Workout history list
    → /history/workout/[id]        # Workout detail
  → /history/cardio                # Cardio history list
    → /history/cardio-detail/[id]  # Cardio detail with route map
  → /calendar                      # Month calendar view

(tabs)/stats
  → Weight chart + log form inline (no new screen)

(tabs)/exercises
  → Templates section at top or as a sub-tab

(tabs)/profile
  → Edit name + unit toggle inline (no new screen)
```

History and calendar screens live under `app/history/` and `app/calendar/` (outside tabs, standard stack navigation with back button).

## Dashboard Polish

Upgrade the existing `app/(tabs)/index.tsx`:

**Greeting section** (keep existing): "Good morning, {name}" + "Ready to train?"

**Quick-start cards**: Two pressable cards side by side:
- "Start Workout" — opens template picker (existing FAB flow, reuse via `router.push`)
- "Log Cardio" — opens cardio type picker

**Weekly summary**: Row of stats computed from local PowerSync data:
- Workouts this week (count where `started_at` is within current week)
- Cardio this week (count)
- Total duration this week (sum of `duration_seconds`)

**Activity feed**: "Recent Activity" heading with "See All" link. Last 10 activities (workouts + cardio merged, sorted by date). Each row: icon (dumbbell/activity), name, date, duration. Tapping navigates to detail view.

**Links**: "Workout History" and "Cardio History" buttons below the feed.

## Workout History + Detail

### History List (`app/history/workouts.tsx`)

FlatList from `useWorkouts()`:
- Each row: Card with workout name, date, exercise count, duration
- Tap → navigate to `/history/workout/[id]`
- Empty state: "No workouts yet"

### Detail View (`app/history/workout/[id].tsx`)

Read-only view of a completed workout:
- Header: workout name, date, total duration, total volume
- Exercise list: for each exercise, name + sets table (set#, weight, reps, RPE, completed checkmark)
- Uses `useWorkoutExercises(id)` and `useWorkoutSets(id)` from `@ironpulse/sync`

## Cardio History + Detail

### History List (`app/history/cardio.tsx`)

FlatList from `useCardioSessions()`:
- Each row: Card with type icon, type name, date, duration, distance
- Tap → navigate to `/history/cardio-detail/[id]`

### Detail View (`app/history/cardio-detail/[id].tsx`)

- Header: type icon + name, date
- Stats: duration, distance (unit-aware), pace, elevation, heart rate, calories (if present)
- Route map: for GPS sessions (`source === 'gps'`), fetch route points via `trpc.cardio.getRoutePoints.query({ sessionId })` and render in a non-interactive `RouteMap` component (reuse from cardio sub-project)
- Notes (if present)

## Calendar

### Calendar Screen (`app/calendar/index.tsx`)

- Month navigation: left/right arrows to change month
- Day grid: 7 columns (Mon-Sun), 5-6 rows
- Each day cell shows colored dots: blue for workouts, green for cardio
- Tap a day → show that day's activities in a section below the grid
- Activity list for selected day: same card format as dashboard feed, tappable to detail views
- Data: `useWorkouts()` and `useCardioSessions()` filtered by month client-side

## Stats Polish

Upgrade existing `app/(tabs)/stats.tsx`:

**Weight trend chart**: SVG line chart via `react-native-svg`:
- X axis: dates (last 30 entries)
- Y axis: weight values
- Line + dots for data points
- Uses `useBodyMetrics()` data

**Weight log form**: Below the chart:
- Date: defaults to today (tappable to change — or just always today for simplicity)
- Weight: TextInput with decimal-pad
- "Log Weight" button
- Writes: `db.execute(INSERT INTO body_metrics ...)` with `date = today`, `user_id` from auth

**Body metrics list**: Below the form, showing recent entries (existing, keep as-is)

## Templates Management

Add to the existing `app/(tabs)/exercises.tsx` or create a separate templates section accessible from dashboard.

Simplest approach: add a "Templates" section at the top of the exercises tab (above the search):
- Horizontal scrollable list of template cards (name + exercise count)
- Tap → start workout from template (reuse template picker logic)
- Long press or swipe → delete template

Delete requires three-step cascade (no FK cascade in PowerSync SQLite):
1. `DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)`
2. `DELETE FROM template_exercises WHERE template_id = ?`
3. `DELETE FROM workout_templates WHERE id = ?`

## Profile Polish

Upgrade existing `app/(tabs)/profile.tsx`:

- **Edit name**: tap name field → `Alert.prompt` → `trpc.user.updateProfile.mutate({ name })` → update auth context user
- **Unit toggle**: "Metric" / "Imperial" segmented control or two pressable options → `trpc.user.updateProfile.mutate({ unitSystem })` → update auth context
- **Sign out**: keep existing

## Data Layer

All reads from existing `@ironpulse/sync` hooks. No new hooks needed.

Writes:
- Weight log: `db.execute('INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at) VALUES (?, ?, ?, ?, ?)')`
- Template delete: three-step cascade via `db.execute()`
- Profile update: `trpc.user.updateProfile.mutate()` (server-side, not PowerSync)

## File Structure

```
apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx                   # MODIFY — dashboard polish
│   │   ├── stats.tsx                   # MODIFY — add chart + log form
│   │   ├── exercises.tsx               # MODIFY — add templates section
│   │   └── profile.tsx                 # MODIFY — add name edit + unit toggle
│   ├── history/
│   │   ├── _layout.tsx                 # CREATE — stack layout with back button
│   │   ├── workouts.tsx                # CREATE — workout history list
│   │   ├── workout/[id].tsx            # CREATE — workout detail
│   │   ├── cardio.tsx                  # CREATE — cardio history list
│   │   └── cardio-detail/[id].tsx      # CREATE — cardio detail with route map
│   └── calendar/
│       ├── _layout.tsx                 # CREATE — stack layout
│       └── index.tsx                   # CREATE — month calendar view
├── components/
│   ├── stats/
│   │   └── weight-chart.tsx            # CREATE — SVG line chart
│   └── calendar/
│       └── month-grid.tsx              # CREATE — calendar grid component
└── e2e/
    ├── history-navigation.yaml         # CREATE
    └── weight-log.yaml                 # CREATE
```

## Testing

### Maestro E2E Flows

**history-navigation.yaml:**
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
- tapOn: "Workout History"
- assertVisible: "Workouts"
```

**weight-log.yaml:**
```yaml
appId: com.ironpulse.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- tapOn: "Stats"
- tapOn:
    id: "weight-input"
- inputText: "75.5"
- tapOn: "Log Weight"
- assertVisible: "75.5"
```

### TestID Convention

- Weight input: `testID="weight-input"`
- Log weight button: `testID="log-weight"`
