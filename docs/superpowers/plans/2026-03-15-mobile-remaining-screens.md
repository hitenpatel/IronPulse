# Mobile Remaining Screens Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the dashboard, add workout/cardio history + detail views, calendar, stats chart + weight logging, template management, and profile editing — completing the MVP mobile app.

**Architecture:** New stack screens under `app/history/` and `app/calendar/` for list/detail views. Dashboard, stats, exercises, and profile tabs upgraded in-place. All reads from existing `@ironpulse/sync` hooks. SVG weight chart via `react-native-svg`. Route map reuses existing `RouteMap` component.

**Tech Stack:** Expo Router, `@powersync/react`, `react-native-svg`, `@ironpulse/sync` hooks, tRPC

**Spec:** `docs/superpowers/specs/2026-03-15-mobile-remaining-screens-design.md`

---

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
│   │   ├── _layout.tsx                 # CREATE
│   │   ├── workouts.tsx                # CREATE
│   │   ├── workout/[id].tsx            # CREATE
│   │   ├── cardio.tsx                  # CREATE
│   │   └── cardio-detail/[id].tsx      # CREATE
│   └── calendar/
│       ├── _layout.tsx                 # CREATE
│       └── index.tsx                   # CREATE
├── components/
│   ├── stats/
│   │   └── weight-chart.tsx            # CREATE
│   └── calendar/
│       └── month-grid.tsx              # CREATE
└── e2e/
    ├── history-navigation.yaml         # CREATE
    └── weight-log.yaml                 # CREATE
```

---

## Chunk 1: History Screens

### Task 1: History Stack Layout + Workout History

**Files:**
- Create: `apps/mobile/app/history/_layout.tsx`
- Create: `apps/mobile/app/history/workouts.tsx`

- [ ] **Step 1: Create history stack layout**

Create `apps/mobile/app/history/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
        headerTintColor: "hsl(213, 31%, 91%)",
        headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
      }}
    />
  );
}
```

- [ ] **Step 2: Create workout history list**

Create `apps/mobile/app/history/workouts.tsx`:

```typescript
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useWorkouts } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Dumbbell, Clock } from "lucide-react-native";
import { formatElapsed } from "@/lib/workout-utils";

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { data: workouts, isLoading } = useWorkouts();

  return (
    <>
      <Stack.Screen options={{ title: "Workouts" }} />
      <FlatList
        data={workouts ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Dumbbell size={32} color="hsl(215, 20%, 65%)" />
            <Text style={{ color: "hsl(215, 20%, 65%)", marginTop: 12 }}>No workouts yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/history/workout/${item.id}`)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Dumbbell size={20} color="hsl(210, 40%, 98%)" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
                  {item.name || "Workout"}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                  <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                    {new Date(item.started_at).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                    {item.exercise_count ?? 0} exercises
                  </Text>
                  {item.duration_seconds != null && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Clock size={10} color="hsl(215, 20%, 65%)" />
                      <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                        {formatElapsed(item.duration_seconds)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/history/
git commit -m "add history stack layout and workout history list"
```

### Task 2: Workout Detail View

**Files:**
- Create: `apps/mobile/app/history/workout/[id].tsx`

- [ ] **Step 1: Create workout detail**

Create `apps/mobile/app/history/workout/[id].tsx`:

```typescript
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { formatElapsed } from "@/lib/workout-utils";
import { calculateVolume } from "@/lib/workout-utils";
import { useMemo } from "react";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workoutRows } = useQuery("SELECT * FROM workouts WHERE id = ?", [id ?? ""]);
  const workout = workoutRows?.[0];
  const { data: exercises } = useWorkoutExercises(id);
  const { data: allSets } = useWorkoutSets(id);

  const setsByExercise = useMemo(() => {
    const map = new Map<string, typeof allSets>();
    for (const set of allSets ?? []) {
      const list = map.get(set.workout_exercise_id) ?? [];
      list.push(set);
      map.set(set.workout_exercise_id, list);
    }
    return map;
  }, [allSets]);

  const totalVolume = calculateVolume(allSets ?? []);

  if (!workout) return null;

  return (
    <>
      <Stack.Screen options={{ title: workout.name || "Workout" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Summary stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Duration</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {workout.duration_seconds ? formatElapsed(workout.duration_seconds) : "—"}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Volume</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : "—"}
            </Text>
          </Card>
        </View>

        {/* Exercises */}
        {(exercises ?? []).map((ex) => {
          const sets = setsByExercise.get(ex.id) ?? [];
          return (
            <Card key={ex.id}>
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
                {ex.exercise_name}
              </Text>
              {/* Column headers */}
              <View style={{ flexDirection: "row", paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "hsl(216, 34%, 17%)" }}>
                <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, width: 30 }}>#</Text>
                <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, flex: 1 }}>KG</Text>
                <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, flex: 1 }}>REPS</Text>
                <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, width: 40 }}>RPE</Text>
              </View>
              {sets.map((s) => (
                <View key={s.id} style={{ flexDirection: "row", paddingVertical: 6 }}>
                  <Text style={{ color: "hsl(215, 20%, 65%)", width: 30, fontSize: 14 }}>{s.set_number}</Text>
                  <Text style={{ color: "hsl(213, 31%, 91%)", flex: 1, fontSize: 14 }}>
                    {s.weight_kg != null ? s.weight_kg : "—"}
                  </Text>
                  <Text style={{ color: "hsl(213, 31%, 91%)", flex: 1, fontSize: 14 }}>
                    {s.reps != null ? s.reps : "—"}
                  </Text>
                  <Text style={{ color: "hsl(215, 20%, 65%)", width: 40, fontSize: 14 }}>
                    {s.rpe != null ? s.rpe : "—"}
                  </Text>
                </View>
              ))}
            </Card>
          );
        })}
      </ScrollView>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/history/workout/
git commit -m "add workout detail view with exercises and sets"
```

### Task 3: Cardio History + Detail

**Files:**
- Create: `apps/mobile/app/history/cardio.tsx`
- Create: `apps/mobile/app/history/cardio-detail/[id].tsx`

- [ ] **Step 1: Create cardio history list**

Create `apps/mobile/app/history/cardio.tsx`:

```typescript
import { View, Text, FlatList, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useCardioSessions } from "@ironpulse/sync";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react-native";
import { formatElapsed } from "@/lib/workout-utils";
import { metersToKm, metersToMiles } from "@/lib/geo-utils";

export default function CardioHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: sessions } = useCardioSessions();
  const isImperial = user?.unitSystem === "imperial";

  return (
    <>
      <Stack.Screen options={{ title: "Cardio" }} />
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Activity size={32} color="hsl(215, 20%, 65%)" />
            <Text style={{ color: "hsl(215, 20%, 65%)", marginTop: 12 }}>No cardio sessions yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/history/cardio-detail/${item.id}`)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Activity size={20} color="hsl(210, 40%, 98%)" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500", textTransform: "capitalize" }}>
                  {item.type}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                  <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                    {new Date(item.started_at).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                    {formatElapsed(item.duration_seconds)}
                  </Text>
                  {item.distance_meters != null && (
                    <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                      {isImperial
                        ? `${metersToMiles(item.distance_meters).toFixed(1)} mi`
                        : `${metersToKm(item.distance_meters).toFixed(1)} km`}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </>
  );
}
```

- [ ] **Step 2: Create cardio detail view**

Create `apps/mobile/app/history/cardio-detail/[id].tsx`:

```typescript
import { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { RouteMap } from "@/components/cardio/route-map";
import { formatElapsed } from "@/lib/workout-utils";
import { formatPace, calculatePace, metersToKm, metersToMiles } from "@/lib/geo-utils";
import { trpc } from "@/lib/trpc";

export default function CardioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: sessions } = useQuery("SELECT * FROM cardio_sessions WHERE id = ?", [id ?? ""]);
  const session = sessions?.[0];
  const isImperial = user?.unitSystem === "imperial";

  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (session?.source === "gps" && id) {
      trpc.cardio.getRoutePoints.query({ sessionId: id })
        .then((points) => setRoutePoints(points.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }))))
        .catch(() => {});
    }
  }, [id, session?.source]);

  if (!session) return null;

  const distance = session.distance_meters
    ? isImperial
      ? `${metersToMiles(session.distance_meters).toFixed(2)} mi`
      : `${metersToKm(session.distance_meters).toFixed(2)} km`
    : null;

  const pace = session.distance_meters && session.duration_seconds
    ? formatPace(calculatePace(session.distance_meters, session.duration_seconds))
    : null;

  return (
    <>
      <Stack.Screen options={{ title: session.type.charAt(0).toUpperCase() + session.type.slice(1) }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Route map for GPS sessions */}
        {routePoints.length > 1 && (
          <View style={{ height: 200, borderRadius: 12, overflow: "hidden" }}>
            <RouteMap routePoints={routePoints} interactive={false} />
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Duration</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {formatElapsed(session.duration_seconds)}
            </Text>
          </Card>
          {distance && (
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Distance</Text>
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>{distance}</Text>
            </Card>
          )}
        </View>

        {pace && (
          <Card style={{ alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Pace</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>{pace} /km</Text>
          </Card>
        )}

        {session.elevation_gain_m != null && (
          <Card style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)" }}>Elevation</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>{session.elevation_gain_m} m</Text>
          </Card>
        )}

        {session.notes && (
          <Card>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12, marginBottom: 4 }}>Notes</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)" }}>{session.notes}</Text>
          </Card>
        )}
      </ScrollView>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/history/cardio.tsx apps/mobile/app/history/cardio-detail/
git commit -m "add cardio history list and detail view with route map"
```

---

## Chunk 2: Calendar + Dashboard Polish

### Task 4: Calendar Components + Screen

**Files:**
- Create: `apps/mobile/components/calendar/month-grid.tsx`
- Create: `apps/mobile/app/calendar/_layout.tsx`
- Create: `apps/mobile/app/calendar/index.tsx`

- [ ] **Step 1: Create month grid component**

Create `apps/mobile/components/calendar/month-grid.tsx` — a reusable month grid that takes activity data and renders day cells with colored dots. Props: `year`, `month`, `workoutDays: Set<string>`, `cardioDays: Set<string>`, `selectedDate: string | null`, `onSelectDate(dateStr)`. Renders a 7-column grid with day numbers and small colored dots (blue for workout, green for cardio).

- [ ] **Step 2: Create calendar layout and screen**

Create `apps/mobile/app/calendar/_layout.tsx`:
```typescript
import { Stack } from "expo-router";
export default function CalendarLayout() {
  return <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" }, headerTintColor: "hsl(213, 31%, 91%)", contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" } }} />;
}
```

Create `apps/mobile/app/calendar/index.tsx` — Month view with navigation arrows, `MonthGrid`, and a selected-day activity list below using `useWorkouts()` and `useCardioSessions()` filtered client-side by date.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/calendar/ apps/mobile/app/calendar/
git commit -m "add calendar view with month grid and activity dots"
```

### Task 5: Dashboard Polish

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Upgrade dashboard**

Rewrite `apps/mobile/app/(tabs)/index.tsx` with:
- Greeting (keep existing)
- Quick-start cards: two pressable cards side by side — "Start Workout" (opens template picker via existing flow) and "Log Cardio" (navigates to `/cardio/type-picker`)
- Weekly summary: compute from local data — count workouts + cardio this week, total duration
- Activity feed: merge last 10 workouts + cardio, sorted by date, each row tappable to detail
- "Workout History" and "Cardio History" link buttons
- "Calendar" link button

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "polish dashboard with quick-start cards, weekly summary, and activity feed"
```

---

## Chunk 3: Stats, Templates, Profile + E2E

### Task 6: Stats — Weight Chart + Log Form

**Files:**
- Create: `apps/mobile/components/stats/weight-chart.tsx`
- Modify: `apps/mobile/app/(tabs)/stats.tsx`

- [ ] **Step 1: Create weight chart**

Create `apps/mobile/components/stats/weight-chart.tsx` — SVG line chart using `react-native-svg` (`Svg`, `Polyline`, `Circle`, `Text`). Props: `data: { date: string, weight_kg: number }[]`. Renders last 30 data points as a line chart with dots. Simple — no axes labels, just the line with min/max labels.

Note: `react-native-svg` is already installed as a transitive dependency of `react-native-maps`. If not available, install it: `pnpm --filter @ironpulse/mobile add react-native-svg`.

- [ ] **Step 2: Upgrade stats screen**

Modify `apps/mobile/app/(tabs)/stats.tsx`:
- Add `WeightChart` component at the top, fed with `useBodyMetrics()` data (filter to entries with non-null `weight_kg`)
- Add weight log form: TextInput for weight (testID="weight-input"), "Log Weight" button (testID="log-weight")
- On save: `db.execute('INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at) VALUES (?, ?, ?, ?, ?)')` with today's date
- Keep existing body metrics list below

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/stats/ apps/mobile/app/\(tabs\)/stats.tsx
git commit -m "add weight trend chart and logging form to stats screen"
```

### Task 7: Templates Section + Profile Polish

**Files:**
- Modify: `apps/mobile/app/(tabs)/exercises.tsx`
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add templates to exercises tab**

Modify `apps/mobile/app/(tabs)/exercises.tsx`:
- Add a "Templates" section above the search with `useTemplates()` data
- Horizontal FlatList of template cards (name + exercise count)
- Tap starts workout via template picker flow
- Swipeable delete with three-step cascade:
  1. `DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)`
  2. `DELETE FROM template_exercises WHERE template_id = ?`
  3. `DELETE FROM workout_templates WHERE id = ?`

- [ ] **Step 2: Polish profile screen**

Modify `apps/mobile/app/(tabs)/profile.tsx`:
- Make name tappable → `Alert.prompt("Edit Name", ..., (text) => trpc.user.updateProfile.mutate({ name: text }))`
- Add unit system toggle: two pressable options ("Metric" / "Imperial"), currently selected one highlighted. On change: `trpc.user.updateProfile.mutate({ unitSystem: newValue })` + update auth context.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/exercises.tsx apps/mobile/app/\(tabs\)/profile.tsx
git commit -m "add templates management and profile editing"
```

### Task 8: E2E Tests + Verification

**Files:**
- Create: `apps/mobile/e2e/history-navigation.yaml`
- Create: `apps/mobile/e2e/weight-log.yaml`

- [ ] **Step 1: Create E2E flows**

Create `apps/mobile/e2e/history-navigation.yaml`:
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

Create `apps/mobile/e2e/weight-log.yaml`:
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
- tapOn:
    id: "log-weight"
- assertVisible: "75.5"
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/hitenpatel/dev/personal/IronPulse && pnpm --filter @ironpulse/sync test && pnpm --filter @ironpulse/web build`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/e2e/
git commit -m "add Maestro E2E flows for history navigation and weight logging"
```
