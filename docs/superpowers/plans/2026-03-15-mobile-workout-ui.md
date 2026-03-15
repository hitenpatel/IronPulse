# Mobile Workout Logging UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile-first workout logging UI for the IronPulse Expo app — fullscreen active workout screen with swipe gestures, haptic feedback, rest timer, template picker, and completion summary.

**Architecture:** Workout screens live under `app/workout/` (outside tabs, fullscreen stack). Components in `components/workout/` handle individual UI pieces. All data reads use shared PowerSync hooks from `@ironpulse/sync`. All writes use `usePowerSync()` → `db.execute()`. Template hydration uses two new shared hooks. `trpc.workout.complete` handles server-side PR detection.

**Tech Stack:** Expo Router, React Native, `@powersync/react`, `expo-haptics`, `react-native-gesture-handler` (Swipeable), `@gorhom/bottom-sheet`, `lucide-react-native`

**Spec:** `docs/superpowers/specs/2026-03-15-mobile-workout-ui-design.md`

---

## File Structure

```
# Shared hooks (new)
packages/sync/src/hooks/
├── use-template-detail.ts              # CREATE — useTemplateExercises, useTemplateSets

packages/sync/src/
└── index.ts                            # MODIFY — export new hooks

# Mobile app
apps/mobile/
├── app/workout/
│   ├── _layout.tsx                     # CREATE — fullscreen Stack layout
│   ├── active.tsx                      # CREATE — active workout orchestrator
│   ├── add-exercise.tsx                # CREATE — fullscreen exercise search modal
│   └── complete.tsx                    # CREATE — completion summary
├── components/workout/
│   ├── workout-header.tsx              # CREATE — elapsed timer, name, cancel/finish
│   ├── exercise-card.tsx               # CREATE — swipeable card with set rows
│   ├── set-row.tsx                     # CREATE — weight/reps/RPE inputs + checkmark
│   ├── rpe-picker.tsx                  # CREATE — RPE value picker bottom sheet
│   ├── rest-timer.tsx                  # CREATE — floating countdown with progress
│   └── template-picker.tsx             # CREATE — bottom sheet for template selection
├── components/layout/
│   └── new-session-sheet.tsx           # MODIFY — wire "Start Workout" to template picker
├── lib/
│   └── workout-utils.ts               # CREATE — volume calc, name gen, elapsed formatting
└── e2e/
    ├── workout-empty.yaml              # CREATE
    ├── workout-template.yaml           # CREATE
    └── workout-cancel.yaml             # CREATE
```

---

## Chunk 1: Shared Hooks & Utilities

### Task 1: Template Detail Hooks

**Files:**
- Create: `packages/sync/src/hooks/use-template-detail.ts`
- Modify: `packages/sync/src/index.ts`

- [ ] **Step 1: Create template detail hooks**

Create `packages/sync/src/hooks/use-template-detail.ts`:

```typescript
import { useQuery } from "@powersync/react";

export interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  order: number;
  notes: string | null;
  exercise_name: string;
}

export interface TemplateSetRow {
  id: string;
  template_exercise_id: string;
  set_number: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  type: string;
}

export function useTemplateExercises(templateId: string | undefined) {
  return useQuery<TemplateExerciseRow>(
    `SELECT te.*, e.name as exercise_name
     FROM template_exercises te
     LEFT JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te."order"`,
    [templateId ?? ""]
  );
}

export function useTemplateSets(templateId: string | undefined) {
  return useQuery<TemplateSetRow>(
    `SELECT ts.* FROM template_sets ts
     INNER JOIN template_exercises te ON ts.template_exercise_id = te.id
     WHERE te.template_id = ?
     ORDER BY te."order", ts.set_number`,
    [templateId ?? ""]
  );
}
```

- [ ] **Step 2: Export from index.ts**

Add to `packages/sync/src/index.ts`:

```typescript
export { useTemplateExercises, useTemplateSets, type TemplateExerciseRow, type TemplateSetRow } from "./hooks/use-template-detail";
```

- [ ] **Step 3: Run sync package tests**

Run: `pnpm --filter @ironpulse/sync test`
Expected: All tests pass (existing tests unaffected)

- [ ] **Step 4: Commit**

```bash
git add packages/sync/
git commit -m "add template detail hooks for workout template hydration"
```

### Task 2: Workout Utilities + Install expo-haptics

**Files:**
- Create: `apps/mobile/lib/workout-utils.ts`

- [ ] **Step 1: Install expo-haptics**

Run: `pnpm --filter @ironpulse/mobile add expo-haptics`

- [ ] **Step 2: Create workout utilities**

Create `apps/mobile/lib/workout-utils.ts`:

```typescript
export function getWorkoutName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning Workout";
  if (hour < 17) return "Afternoon Workout";
  return "Evening Workout";
}

export function calculateVolume(
  sets: { weight_kg: number | null; reps: number | null; completed: number }[]
): number {
  return sets.reduce((sum, set) => {
    if (!set.completed || set.weight_kg == null || set.reps == null) return sum;
    return sum + set.weight_kg * set.reps;
  }, 0);
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}
```

Note: uses `weight_kg` and `completed` as number (snake_case, SQLite integer) — matches PowerSync schema.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/workout-utils.ts apps/mobile/package.json pnpm-lock.yaml
git commit -m "add workout utilities and install expo-haptics"
```

---

## Chunk 2: Core Workout Components

### Task 3: Workout Header

**Files:**
- Create: `apps/mobile/components/workout/workout-header.tsx`

- [ ] **Step 1: Create workout header component**

Create `apps/mobile/components/workout/workout-header.tsx`:

```typescript
import { useEffect, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatElapsed } from "@/lib/workout-utils";

interface Props {
  workoutId: string;
  name: string;
  startedAt: string;
  onCancel: () => void;
  onFinish: () => void;
  onNameChange: (name: string) => void;
}

export function WorkoutHeader({ workoutId, name, startedAt, onCancel, onFinish, onNameChange }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  function handleCancel() {
    Alert.alert("Discard Workout?", "All logged sets will be lost.", [
      { text: "Keep Going", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onCancel },
    ]);
  }

  function handleEditName() {
    Alert.prompt("Workout Name", undefined, (text) => {
      if (text?.trim()) onNameChange(text.trim());
    }, "plain-text", name);
  }

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={handleCancel} hitSlop={8}>
          <Text style={{ color: "hsl(0, 63%, 31%)", fontSize: 16, fontWeight: "500" }}>Cancel</Text>
        </Pressable>

        <Pressable onPress={handleEditName} style={{ alignItems: "center" }}>
          <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16, fontWeight: "bold" }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 14, fontVariant: ["tabular-nums"] }}>
            {formatElapsed(elapsed)}
          </Text>
        </Pressable>

        <Pressable onPress={onFinish} testID="finish-button" hitSlop={8}>
          <Text style={{ color: "hsl(210, 40%, 98%)", fontSize: 16, fontWeight: "bold" }}>Finish</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/workout/workout-header.tsx
git commit -m "add workout header with elapsed timer, name editing, cancel/finish"
```

### Task 4: Set Row

**Files:**
- Create: `apps/mobile/components/workout/set-row.tsx`

- [ ] **Step 1: Create set row component**

Create `apps/mobile/components/workout/set-row.tsx`:

```typescript
import { useRef, useCallback } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { usePowerSync } from "@powersync/react";
import { Check, Minus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface Props {
  setId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: number;
  exerciseIndex: number;
  setIndex: number;
  onComplete: () => void;
  onRpePick: (setId: string, currentRpe: number | null) => void;
}

export function SetRow({
  setId, setNumber, weightKg, reps, rpe, completed,
  exerciseIndex, setIndex, onComplete, onRpePick,
}: Props) {
  const db = usePowerSync();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedUpdate = useCallback(
    (field: string, value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const numValue = value === "" ? null : Number(value);
        await db.execute(
          `UPDATE exercise_sets SET ${field} = ? WHERE id = ?`,
          [numValue, setId]
        );
      }, 500);
    },
    [db, setId]
  );

  async function handleComplete() {
    const newVal = completed ? 0 : 1;
    await db.execute("UPDATE exercise_sets SET completed = ? WHERE id = ?", [newVal, setId]);
    if (newVal === 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onComplete();
    }
  }

  async function handleDelete() {
    await db.execute("DELETE FROM exercise_sets WHERE id = ?", [setId]);
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: "hsl(215, 20%, 65%)", width: 24, fontSize: 14, textAlign: "center" }}>
        {setNumber}
      </Text>

      <TextInput
        testID={`weight-input-${exerciseIndex}-${setIndex}`}
        style={{
          flex: 1, backgroundColor: "hsl(223, 47%, 11%)", borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 8, color: "hsl(213, 31%, 91%)",
          fontSize: 16, textAlign: "center", minHeight: 44,
        }}
        placeholder="kg"
        placeholderTextColor="hsl(215, 20%, 65%)"
        keyboardType="decimal-pad"
        defaultValue={weightKg != null ? String(weightKg) : ""}
        onChangeText={(v) => debouncedUpdate("weight_kg", v)}
      />

      <TextInput
        testID={`reps-input-${exerciseIndex}-${setIndex}`}
        style={{
          flex: 1, backgroundColor: "hsl(223, 47%, 11%)", borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 8, color: "hsl(213, 31%, 91%)",
          fontSize: 16, textAlign: "center", minHeight: 44,
        }}
        placeholder="reps"
        placeholderTextColor="hsl(215, 20%, 65%)"
        keyboardType="number-pad"
        defaultValue={reps != null ? String(reps) : ""}
        onChangeText={(v) => debouncedUpdate("reps", v)}
      />

      <Pressable
        onPress={() => onRpePick(setId, rpe)}
        style={{
          width: 48, minHeight: 44, backgroundColor: "hsl(223, 47%, 11%)",
          borderRadius: 8, alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ color: rpe != null ? "hsl(213, 31%, 91%)" : "hsl(215, 20%, 65%)", fontSize: 14 }}>
          {rpe != null ? rpe : "RPE"}
        </Text>
      </Pressable>

      <Pressable
        testID={`complete-set-${exerciseIndex}-${setIndex}`}
        onPress={handleComplete}
        style={{
          width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center",
          backgroundColor: completed ? "hsl(142, 71%, 45%)" : "hsl(223, 47%, 11%)",
        }}
      >
        <Check size={20} color={completed ? "white" : "hsl(215, 20%, 65%)"} />
      </Pressable>

      <Pressable onPress={handleDelete} style={{ width: 32, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Minus size={16} color="hsl(0, 63%, 31%)" />
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/workout/set-row.tsx
git commit -m "add set row component with debounced inputs and haptic completion"
```

### Task 5: RPE Picker

**Files:**
- Create: `apps/mobile/components/workout/rpe-picker.tsx`

- [ ] **Step 1: Create RPE picker**

Create `apps/mobile/components/workout/rpe-picker.tsx`:

```typescript
import { useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { usePowerSync } from "@powersync/react";

const RPE_VALUES = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

interface Props {
  open: boolean;
  setId: string | null;
  currentRpe: number | null;
  onClose: () => void;
}

export function RpePicker({ open, setId, currentRpe, onClose }: Props) {
  const db = usePowerSync();
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  async function selectRpe(value: number) {
    if (setId) {
      await db.execute("UPDATE exercise_sets SET rpe = ? WHERE id = ?", [value, setId]);
    }
    onClose();
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["35%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223, 47%, 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215, 20%, 65%)" }}
    >
      <BottomSheetView style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "hsl(213, 31%, 91%)", marginBottom: 12 }}>
          Rate of Perceived Exertion
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {RPE_VALUES.map((v) => (
            <Pressable
              key={v}
              onPress={() => selectRpe(v)}
              style={{
                paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8,
                backgroundColor: currentRpe === v ? "hsl(210, 40%, 98%)" : "hsl(216, 34%, 17%)",
                minWidth: 56, alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 16, fontWeight: "600",
                color: currentRpe === v ? "hsl(222.2, 47.4%, 11.2%)" : "hsl(213, 31%, 91%)",
              }}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/workout/rpe-picker.tsx
git commit -m "add RPE picker bottom sheet with Borg CR10 values"
```

### Task 6: Exercise Card with Swipe-to-Delete

**Files:**
- Create: `apps/mobile/components/workout/exercise-card.tsx`

- [ ] **Step 1: Create exercise card**

Create `apps/mobile/components/workout/exercise-card.tsx`:

```typescript
import { View, Text, Pressable } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { usePowerSync } from "@powersync/react";
import { Trash2, Plus } from "lucide-react-native";
import type { SetRow as SetRowType } from "@ironpulse/sync";
import { SetRow } from "./set-row";

interface Props {
  exerciseId: string;
  workoutExerciseId: string;
  exerciseName: string;
  sets: SetRowType[];
  exerciseIndex: number;
  workoutId: string;
  onSetComplete: () => void;
  onRpePick: (setId: string, currentRpe: number | null) => void;
}

export function ExerciseCard({
  exerciseId, workoutExerciseId, exerciseName, sets,
  exerciseIndex, workoutId, onSetComplete, onRpePick,
}: Props) {
  const db = usePowerSync();

  async function handleDeleteExercise() {
    // Two-step delete — no CASCADE in PowerSync SQLite
    await db.execute("DELETE FROM exercise_sets WHERE workout_exercise_id = ?", [workoutExerciseId]);
    await db.execute("DELETE FROM workout_exercises WHERE id = ?", [workoutExerciseId]);
  }

  async function handleAddSet() {
    const nextNumber = sets.length + 1;
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, ?, 'working', 0)`,
      [id, workoutExerciseId, nextNumber]
    );
  }

  function renderRightActions() {
    return (
      <Pressable
        onPress={handleDeleteExercise}
        style={{
          backgroundColor: "hsl(0, 63%, 31%)", justifyContent: "center",
          alignItems: "center", width: 80, borderRadius: 12, marginLeft: 8,
        }}
      >
        <Trash2 size={24} color="white" />
      </Pressable>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={{
        backgroundColor: "hsl(224, 71%, 4%)", borderRadius: 12,
        borderWidth: 1, borderColor: "hsl(216, 34%, 17%)", overflow: "hidden",
      }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "hsl(216, 34%, 17%)" }}>
          <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16, fontWeight: "600" }}>
            {exerciseName}
          </Text>
        </View>

        {/* Column headers */}
        <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, gap: 8 }}>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, width: 24, textAlign: "center" }}>#</Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, flex: 1, textAlign: "center" }}>KG</Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, flex: 1, textAlign: "center" }}>REPS</Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 11, width: 48, textAlign: "center" }}>RPE</Text>
          <View style={{ width: 44 }} />
          <View style={{ width: 32 }} />
        </View>

        {sets.map((set, setIndex) => (
          <SetRow
            key={set.id}
            setId={set.id}
            setNumber={set.set_number}
            weightKg={set.weight_kg}
            reps={set.reps}
            rpe={set.rpe}
            completed={set.completed}
            exerciseIndex={exerciseIndex}
            setIndex={setIndex}
            onComplete={onSetComplete}
            onRpePick={onRpePick}
          />
        ))}

        <Pressable
          onPress={handleAddSet}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 }}
        >
          <Plus size={16} color="hsl(210, 40%, 98%)" />
          <Text style={{ color: "hsl(210, 40%, 98%)", fontSize: 14, fontWeight: "500" }}>Add Set</Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/workout/exercise-card.tsx
git commit -m "add exercise card with swipeable delete and inline set rows"
```

### Task 7: Rest Timer

**Files:**
- Create: `apps/mobile/components/workout/rest-timer.tsx`

- [ ] **Step 1: Create rest timer**

Create `apps/mobile/components/workout/rest-timer.tsx`:

```typescript
import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { X, Plus, Minus } from "lucide-react-native";

const DEFAULT_REST = 90;

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function RestTimer({ visible, onDismiss }: Props) {
  const [duration, setDuration] = useState(DEFAULT_REST);
  const [remaining, setRemaining] = useState(DEFAULT_REST);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDuration(DEFAULT_REST);
    setRemaining(DEFAULT_REST);
    setExpanded(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || remaining <= 0) {
      if (remaining <= 0 && visible) onDismiss();
      return;
    }
    const interval = setInterval(() => {
      setRemaining((r) => r - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, remaining, onDismiss]);

  const adjustDuration = useCallback((delta: number) => {
    setDuration((d) => Math.max(15, d + delta));
    setRemaining((r) => Math.max(1, r + delta));
  }, []);

  if (!visible) return null;

  const progress = remaining / duration;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingBottom: 34, // safe area
    }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          backgroundColor: "hsl(223, 47%, 11%)", borderRadius: 16,
          padding: 16, borderWidth: 1, borderColor: "hsl(216, 34%, 17%)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* Simple progress bar */}
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: "hsl(216, 34%, 17%)", alignItems: "center", justifyContent: "center" }}>
              <View style={{
                position: "absolute", width: 40, height: 40, borderRadius: 20,
                borderWidth: 3, borderColor: "hsl(210, 40%, 98%)",
                borderTopColor: progress > 0.75 ? "hsl(210, 40%, 98%)" : "transparent",
                borderRightColor: progress > 0.5 ? "hsl(210, 40%, 98%)" : "transparent",
                borderBottomColor: progress > 0.25 ? "hsl(210, 40%, 98%)" : "transparent",
                borderLeftColor: "transparent",
              }} />
            </View>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 24, fontWeight: "bold", fontVariant: ["tabular-nums"] }}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
          </View>

          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={{ color: "hsl(210, 40%, 98%)", fontSize: 14, fontWeight: "600" }}>Skip</Text>
          </Pressable>
        </View>

        {expanded && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <Pressable onPress={() => adjustDuration(-15)} style={{
              backgroundColor: "hsl(216, 34%, 17%)", borderRadius: 8,
              paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 4,
            }}>
              <Minus size={14} color="hsl(213, 31%, 91%)" />
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 14 }}>15s</Text>
            </Pressable>
            <Pressable onPress={() => adjustDuration(15)} style={{
              backgroundColor: "hsl(216, 34%, 17%)", borderRadius: 8,
              paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 4,
            }}>
              <Plus size={14} color="hsl(213, 31%, 91%)" />
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 14 }}>15s</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/workout/rest-timer.tsx
git commit -m "add rest timer with countdown, progress, and ±15s adjustment"
```

### Task 8: Template Picker

**Files:**
- Create: `apps/mobile/components/workout/template-picker.tsx`
- Modify: `apps/mobile/components/layout/new-session-sheet.tsx`

- [ ] **Step 1: Create template picker**

Create `apps/mobile/components/workout/template-picker.tsx`:

```typescript
import { useRef, useEffect } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useRouter } from "expo-router";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { usePowerSync } from "@powersync/react";
import { useTemplates, useTemplateExercises, useTemplateSets } from "@ironpulse/sync";
import { Dumbbell } from "lucide-react-native";
import { getWorkoutName } from "@/lib/workout-utils";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TemplatePicker({ open, onClose }: Props) {
  const router = useRouter();
  const db = usePowerSync();
  const { user } = useAuth();
  const sheetRef = useRef<BottomSheet>(null);
  const { data: templates } = useTemplates();

  useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  async function startEmpty() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, user!.id, getWorkoutName(), now, now]
    );
    onClose();
    router.push({ pathname: "/workout/active", params: { workoutId: id } });
  }

  async function startFromTemplate(templateId: string) {
    const workoutId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create workout
    await db.execute(
      `INSERT INTO workouts (id, user_id, name, started_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [workoutId, user!.id, getWorkoutName(), now, now]
    );

    // Read template data
    const texResult = await db.execute(
      `SELECT te.*, e.name as exercise_name FROM template_exercises te LEFT JOIN exercises e ON te.exercise_id = e.id WHERE te.template_id = ? ORDER BY te."order"`,
      [templateId]
    );

    for (const tex of texResult.rows?._array ?? []) {
      const weId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)`,
        [weId, workoutId, tex.exercise_id, tex.order]
      );

      const tsResult = await db.execute(
        `SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number`,
        [tex.id]
      );

      for (const ts of tsResult.rows?._array ?? []) {
        await db.execute(
          `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, completed) VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [crypto.randomUUID(), weId, ts.set_number, ts.type, ts.target_weight_kg, ts.target_reps]
        );
      }
    }

    onClose();
    router.push({ pathname: "/workout/active", params: { workoutId } });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["50%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223, 47%, 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215, 20%, 65%)" }}
    >
      <BottomSheetView style={{ paddingHorizontal: 24, paddingVertical: 16, flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "hsl(213, 31%, 91%)", marginBottom: 16 }}>
          Start Workout
        </Text>

        <Pressable
          onPress={startEmpty}
          style={{
            backgroundColor: "hsl(210, 40%, 98%)", borderRadius: 12,
            padding: 16, alignItems: "center", marginBottom: 16,
          }}
        >
          <Text style={{ color: "hsl(222.2, 47.4%, 11.2%)", fontSize: 16, fontWeight: "bold" }}>
            Empty Workout
          </Text>
        </Pressable>

        {(templates ?? []).length > 0 && (
          <>
            <View style={{ height: 1, backgroundColor: "hsl(216, 34%, 17%)", marginBottom: 12 }} />
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => startFromTemplate(item.id)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12,
                    backgroundColor: "hsl(216, 34%, 17%)", borderRadius: 12,
                    padding: 14, marginBottom: 8,
                  }}
                >
                  <Dumbbell size={20} color="hsl(210, 40%, 98%)" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>{item.name}</Text>
                    <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                      {item.exercise_count ?? 0} exercises
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Update NewSessionSheet to open template picker**

Modify `apps/mobile/components/layout/new-session-sheet.tsx`: the "Start Workout" press should close this sheet and open the template picker. The simplest approach: add a callback prop `onStartWorkout` and call it from the "Start Workout" press handler.

Update the component to accept and call `onStartWorkout`:

```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  onStartWorkout?: () => void;
}
```

In the "Start Workout" `Pressable`'s `onPress`:

```typescript
onPress={() => {
  onClose();
  onStartWorkout?.();
}}
```

Then in `apps/mobile/app/(tabs)/_layout.tsx`, add state for the template picker and wire it:

```typescript
const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

// In NewSessionSheet:
<NewSessionSheet
  open={sheetOpen}
  onClose={() => setSheetOpen(false)}
  onStartWorkout={() => setTemplatePickerOpen(true)}
/>
<TemplatePicker
  open={templatePickerOpen}
  onClose={() => setTemplatePickerOpen(false)}
/>
```

Import `TemplatePicker` from `@/components/workout/template-picker`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/workout/template-picker.tsx apps/mobile/components/layout/new-session-sheet.tsx apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "add template picker and wire FAB Start Workout flow"
```

---

## Chunk 3: Workout Screens

### Task 9: Workout Stack Layout

**Files:**
- Create: `apps/mobile/app/workout/_layout.tsx`

- [ ] **Step 1: Create workout stack layout**

Create `apps/mobile/app/workout/_layout.tsx`:

```typescript
import { Stack } from "expo-router";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
        gestureEnabled: false, // Prevent accidental back swipe during workout
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/workout/
git commit -m "add workout stack layout with disabled back gesture"
```

### Task 10: Active Workout Screen

**Files:**
- Create: `apps/mobile/app/workout/active.tsx`

- [ ] **Step 1: Create the active workout orchestrator**

Create `apps/mobile/app/workout/active.tsx`:

```typescript
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { View, FlatList, Pressable, Text, Keyboard } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePowerSync, useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WorkoutHeader } from "@/components/workout/workout-header";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { RpePicker } from "@/components/workout/rpe-picker";
import { RestTimer } from "@/components/workout/rest-timer";
import { trpc } from "@/lib/trpc";

export default function ActiveWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const db = usePowerSync();
  const flatListRef = useRef<FlatList>(null);

  // Read workout data
  const { data: workoutRows } = useQuery(`SELECT * FROM workouts WHERE id = ?`, [workoutId ?? ""]);
  const workout = workoutRows?.[0];
  const { data: exercises } = useWorkoutExercises(workoutId);
  const { data: allSets } = useWorkoutSets(workoutId);

  // Group sets by exercise
  const setsByExercise = useMemo(() => {
    const map = new Map<string, typeof allSets>();
    for (const set of allSets ?? []) {
      const list = map.get(set.workout_exercise_id) ?? [];
      list.push(set);
      map.set(set.workout_exercise_id, list);
    }
    return map;
  }, [allSets]);

  // Rest timer state
  const [restTimerVisible, setRestTimerVisible] = useState(false);

  // RPE picker state
  const [rpePicker, setRpePicker] = useState<{ open: boolean; setId: string | null; rpe: number | null }>({
    open: false, setId: null, rpe: null,
  });

  // Keyboard height for bottom padding
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleSetComplete = useCallback(() => {
    setRestTimerVisible(true);
  }, []);

  const handleRpePick = useCallback((setId: string, currentRpe: number | null) => {
    setRpePicker({ open: true, setId, rpe: currentRpe });
  }, []);

  async function handleNameChange(name: string) {
    await db.execute("UPDATE workouts SET name = ? WHERE id = ?", [name, workoutId]);
  }

  async function handleCancel() {
    // Delete all workout data
    for (const ex of exercises ?? []) {
      await db.execute("DELETE FROM exercise_sets WHERE workout_exercise_id = ?", [ex.id]);
    }
    await db.execute("DELETE FROM workout_exercises WHERE workout_id = ?", [workoutId]);
    await db.execute("DELETE FROM workouts WHERE id = ?", [workoutId]);
    router.back();
  }

  async function handleFinish() {
    if (!workoutId) return;
    const now = new Date().toISOString();
    const startedAt = workout?.started_at;
    const duration = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;

    await db.execute(
      "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ?",
      [now, duration, workoutId]
    );

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // PR detection (best-effort, may fail offline)
    let newPRs: any[] = [];
    try {
      const result = await trpc.workout.complete.mutate({ id: workoutId });
      newPRs = (result as any)?.newPRs ?? [];
    } catch {
      // Offline — PRs will be detected on next sync
    }

    router.replace({
      pathname: "/workout/complete",
      params: {
        workoutId,
        prs: JSON.stringify(newPRs),
      },
    });
  }

  if (!workout) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <WorkoutHeader
        workoutId={workoutId!}
        name={workout.name ?? "Workout"}
        startedAt={workout.started_at}
        onCancel={handleCancel}
        onFinish={handleFinish}
        onNameChange={handleNameChange}
      />

      <FlatList
        ref={flatListRef}
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Math.max(keyboardHeight, 100) }}
        renderItem={({ item, index }) => (
          <ExerciseCard
            exerciseId={item.exercise_id}
            workoutExerciseId={item.id}
            exerciseName={item.exercise_name}
            sets={setsByExercise.get(item.id) ?? []}
            exerciseIndex={index}
            workoutId={workoutId!}
            onSetComplete={handleSetComplete}
            onRpePick={handleRpePick}
          />
        )}
      />

      {/* Add Exercise button */}
      {!restTimerVisible && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 34 }}>
          <Pressable
            testID="add-exercise-button"
            onPress={() => router.push({ pathname: "/workout/add-exercise", params: { workoutId } })}
            style={{
              backgroundColor: "hsl(216, 34%, 17%)", borderRadius: 12,
              padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Plus size={20} color="hsl(210, 40%, 98%)" />
            <Text style={{ color: "hsl(210, 40%, 98%)", fontSize: 16, fontWeight: "600" }}>Add Exercise</Text>
          </Pressable>
        </View>
      )}

      <RestTimer visible={restTimerVisible} onDismiss={() => setRestTimerVisible(false)} />

      <RpePicker
        open={rpePicker.open}
        setId={rpePicker.setId}
        currentRpe={rpePicker.rpe}
        onClose={() => setRpePicker({ open: false, setId: null, rpe: null })}
      />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/workout/active.tsx
git commit -m "add active workout screen orchestrator"
```

### Task 11: Add Exercise Modal

**Files:**
- Create: `apps/mobile/app/workout/add-exercise.tsx`

- [ ] **Step 1: Create add exercise screen**

Create `apps/mobile/app/workout/add-exercise.tsx`:

```typescript
import { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useExercises } from "@ironpulse/sync";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react-native";

export default function AddExerciseScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const db = usePowerSync();
  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises({ search: search || undefined });

  async function selectExercise(exerciseId: string) {
    // Get current exercise count for ordering
    const countResult = await db.execute(
      "SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?",
      [workoutId]
    );
    const order = (countResult.rows?._array?.[0]?.count ?? 0) + 1;

    // Insert workout exercise
    const weId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)`,
      [weId, workoutId, exerciseId, order]
    );

    // Insert first empty set
    await db.execute(
      `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, completed) VALUES (?, ?, 1, 'working', 0)`,
      [crypto.randomUUID(), weId]
    );

    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color="hsl(213, 31%, 91%)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Input
            label=""
            placeholder="Search exercises..."
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "hsl(216, 34%, 17%)" }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectExercise(item.id)}
            style={{ paddingVertical: 14 }}
          >
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>{item.name}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
              {item.category && (
                <Text style={{ fontSize: 12, color: "hsl(215, 20%, 65%)", textTransform: "capitalize" }}>
                  {item.category}
                </Text>
              )}
              {item.primary_muscles && (
                <Text style={{ fontSize: 12, color: "hsl(215, 20%, 65%)" }}>
                  {(() => { try { return JSON.parse(item.primary_muscles).join(", "); } catch { return item.primary_muscles; } })()}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/workout/add-exercise.tsx
git commit -m "add fullscreen exercise search modal for workout"
```

### Task 12: Completion Summary

**Files:**
- Create: `apps/mobile/app/workout/complete.tsx`

- [ ] **Step 1: Create completion summary**

Create `apps/mobile/app/workout/complete.tsx`:

```typescript
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@powersync/react";
import { useWorkoutExercises, useWorkoutSets } from "@ironpulse/sync";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react-native";
import { calculateVolume, formatElapsed } from "@/lib/workout-utils";

export default function CompletionScreen() {
  const { workoutId, prs: prsParam } = useLocalSearchParams<{ workoutId: string; prs: string }>();
  const router = useRouter();

  const { data: workoutRows } = useQuery("SELECT * FROM workouts WHERE id = ?", [workoutId ?? ""]);
  const workout = workoutRows?.[0];
  const { data: exercises } = useWorkoutExercises(workoutId);
  const { data: allSets } = useWorkoutSets(workoutId);

  const newPRs = (() => {
    try { return JSON.parse(prsParam ?? "[]"); } catch { return []; }
  })();

  const totalVolume = calculateVolume(allSets ?? []);
  const duration = workout?.duration_seconds ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "hsl(213, 31%, 91%)" }}>
            Workout Complete
          </Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", marginTop: 4, fontSize: 16 }}>
            {workout?.name ?? "Workout"}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Duration</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {formatElapsed(duration)}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>Volume</Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 20, fontWeight: "bold" }}>
              {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : "—"}
            </Text>
          </Card>
        </View>

        {/* PR Callouts */}
        {newPRs.length > 0 && (
          <View style={{ gap: 8 }}>
            {newPRs.map((pr: any, i: number) => (
              <Card key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderColor: "hsl(142, 71%, 45%)" }}>
                <Trophy size={20} color="hsl(142, 71%, 45%)" />
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "600" }}>
                  New PR: {pr.exerciseName ?? "Exercise"} — {pr.value}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Exercise Summary */}
        <View style={{ gap: 8 }}>
          {(exercises ?? []).map((ex) => {
            const exSets = (allSets ?? []).filter((s) => s.workout_exercise_id === ex.id);
            const completedSets = exSets.filter((s) => s.completed);
            return (
              <Card key={ex.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>{ex.exercise_name}</Text>
                <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 14 }}>
                  {completedSets.length} set{completedSets.length !== 1 ? "s" : ""}
                </Text>
              </Card>
            );
          })}
        </View>

        <Button onPress={() => router.replace("/(tabs)")}>
          Done
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/workout/complete.tsx
git commit -m "add workout completion summary with PR callouts"
```

---

## Chunk 4: E2E Tests & Verification

### Task 13: Maestro E2E Flows

**Files:**
- Create: `apps/mobile/e2e/workout-empty.yaml`
- Create: `apps/mobile/e2e/workout-template.yaml`
- Create: `apps/mobile/e2e/workout-cancel.yaml`

- [ ] **Step 1: Create E2E flows**

Create `apps/mobile/e2e/workout-empty.yaml`:

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
- tapOn:
    id: "fab-button"
- tapOn: "Start Workout"
- tapOn: "Empty Workout"
- assertVisible: "Finish"
- tapOn:
    id: "add-exercise-button"
- inputText: "Bench"
- tapOn: "Bench Press"
- tapOn:
    id: "weight-input-0-0"
- inputText: "80"
- tapOn:
    id: "reps-input-0-0"
- inputText: "8"
- tapOn:
    id: "complete-set-0-0"
- tapOn:
    id: "finish-button"
- assertVisible: "Workout Complete"
- tapOn: "Done"
- assertVisible: "Good morning"
```

Create `apps/mobile/e2e/workout-template.yaml`:

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
- tapOn:
    id: "fab-button"
- tapOn: "Start Workout"
- assertVisible: "Empty Workout"
```

Create `apps/mobile/e2e/workout-cancel.yaml`:

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
- tapOn:
    id: "fab-button"
- tapOn: "Start Workout"
- tapOn: "Empty Workout"
- assertVisible: "Finish"
- tapOn: "Cancel"
- tapOn: "Discard"
- assertVisible: "Good morning"
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/e2e/
git commit -m "add Maestro E2E flows for workout empty, template, and cancel"
```

### Task 14: Verification

- [ ] **Step 1: Run sync package tests**

Run: `pnpm --filter @ironpulse/sync test`
Expected: All tests pass

- [ ] **Step 2: Run API tests**

Run: `pnpm --filter @ironpulse/api test`
Expected: All tests pass

- [ ] **Step 3: Verify web build**

Run: `pnpm --filter @ironpulse/web build`
Expected: Build succeeds

- [ ] **Step 4: Verify Expo config**

Run: `cd apps/mobile && npx expo config`
Expected: Config resolves without errors

- [ ] **Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "fix mobile workout UI issues found during verification"
```
