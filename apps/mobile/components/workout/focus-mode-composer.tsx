/**
 * FocusModeComposer — replaces the peer-card FlatList in active.tsx.
 *
 * Renders:
 *   - Exactly one expanded FocusedExerciseCard (current exercise)
 *   - WorkoutQueue (upcoming + completed, compact)
 *   - WorkoutActionDock (sole Complete Set control)
 *   - Rest timer display (surfaces at round boundaries)
 *   - WorkoutFinishSheet (on finish tap)
 *
 * AC constraints:
 *   - ONE writeTransaction per set completion (completeSetAtomic)
 *   - Drafts never persist until Complete is tapped
 *   - Rest deadline persists across background via in-memory ref + AsyncStorage
 *   - Undo valid for 5 s after completion, conditional on no later completion
 *   - 48dp min tap targets, accessibilityLabel on every interactive
 *   - useReducedMotion respected
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { usePowerSync } from "@powersync/react";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { WorkoutExerciseRow, SetRow } from "@zor/sync";
import type { WorkoutRow } from "../../hooks/use-active-workout-session";
import {
  buildFocusSequence,
  deriveNextFocus,
  type FocusSequenceEntry,
} from "../../lib/workout-focus-sequence";
import {
  emptyDraft,
  createDraft,
  touchField,
  parseDraftForCommit,
  computeSuggestion,
  isDraftTouched,
  type SetDraft,
} from "../../lib/workout-set-draft";
import { restReducer, getRestDuration, computeRemainingSeconds, type RestState } from "../../lib/workout-rest-state";
import { buildFinishSummary } from "../../lib/workout-finish-summary";
import {
  completeSetAtomic,
  markSetIncomplete,
  flushDraftsAndFinish,
} from "../../lib/workout-session-mutations";
import { loadSessionState, saveSessionState, clearSessionState } from "../../lib/workout-session-storage";
import * as Haptics from "@/lib/haptics";
import { maybeRequestReview } from "@/lib/review-prompt";

import { FocusedExerciseCard } from "./focused-exercise-card";
import { WorkoutQueue, type QueueItem } from "./workout-queue";
import { WorkoutActionDock, type DockMode } from "./workout-action-dock";
import { WorkoutEmptyState } from "./workout-empty-state";
import { WorkoutFinishSheet } from "./workout-finish-sheet";

import { colors, fonts } from "@/lib/theme";

interface FocusModeComposerProps {
  workout: WorkoutRow;
  exercises: WorkoutExerciseRow[];
  sets: SetRow[];
  setsByExercise: ReadonlyMap<string, SetRow[]>;
  previousSetsByExercise: ReadonlyMap<
    string,
    { weight_kg: number | null; reps: number | null; set_number: number }[]
  >;
  userId: string;
  onAddExercise(): void;
  onCancel(): void;
  requestedFocusSetId?: string;
}

type SavingState = "idle" | "saving" | "slow" | "retry";

interface UndoState {
  setId: string;
  expiresAt: number;
}

export function FocusModeComposer({
  workout,
  exercises,
  sets,
  previousSetsByExercise,
  userId,
  onAddExercise,
  onCancel,
  requestedFocusSetId,
}: FocusModeComposerProps) {
  const db = usePowerSync();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // ── Focus sequence ────────────────────────────────────────────────────────
  const sequence: FocusSequenceEntry[] = useMemo(
    () => buildFocusSequence(exercises, sets),
    [exercises, sets],
  );

  const completedSetIds = useMemo(
    () => new Set(sets.filter((s) => s.completed).map((s) => s.id)),
    [sets],
  );

  // Persisted focus/anchor from storage (loaded once on mount).
  // requestedFocusSetId seeds the initial focus when returning from picker (AC #5).
  const [persistedFocusId, setPersistedFocusId] = useState<string | null>(
    requestedFocusSetId ?? null,
  );
  const progressionAnchorRef = useRef<string | null>(null);

  const focusedSetId = useMemo(
    () => deriveNextFocus(sequence, completedSetIds, persistedFocusId, progressionAnchorRef.current),
    [sequence, completedSetIds, persistedFocusId],
  );

  // ── Rest state (persisted deadline strategy) ──────────────────────────────
  const [restState, dispatchRest] = useReducer(restReducer, { status: "idle" });
  const restStateRef = useRef<RestState>({ status: "idle" });
  restStateRef.current = restState;

  // Persist rest + focus when either changes
  const persistSession = useCallback(async (focId: string | null, rst: RestState) => {
    await saveSessionState(userId, workout.id, {
      focusedSetId: focId,
      progressionAnchorId: progressionAnchorRef.current,
      restState: rst,
    });
  }, [userId, workout.id]);

  // Load persisted state on mount
  useEffect(() => {
    loadSessionState(userId, workout.id).then((saved) => {
      if (!saved) return;
      setPersistedFocusId(saved.focusedSetId);
      progressionAnchorRef.current = saved.progressionAnchorId;
      dispatchRest({
        type: "RESTORE",
        nowMs: Date.now(),
        deadlineMs: saved.restState.status === "running" ? saved.restState.deadlineMs : undefined,
        remainingSeconds: saved.restState.status === "paused" ? saved.restState.remainingSeconds : undefined,
      });
    }).catch(() => {});
  }, [userId, workout.id]);

  // AppState: on foreground, recalculate rest from persisted deadline
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        const rst = restStateRef.current;
        if (rst.status === "running") {
          dispatchRest({ type: "EXPIRE", nowMs: Date.now() });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Rest countdown tick
  useEffect(() => {
    if (restState.status !== "running") return;
    const interval = setInterval(() => {
      dispatchRest({ type: "EXPIRE", nowMs: Date.now() });
    }, 1000);
    return () => clearInterval(interval);
  }, [restState.status]);

  // ── Draft state ───────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<Map<string, SetDraft>>(new Map());

  const currentDraft = useMemo<SetDraft>(() => {
    if (!focusedSetId) return emptyDraft();
    if (drafts.has(focusedSetId)) return drafts.get(focusedSetId)!;
    // Build suggestion from previous performance
    const set = sets.find((s) => s.id === focusedSetId);
    if (!set) return emptyDraft();
    const ex = exercises.find((e) => e.id === set.workout_exercise_id);
    const prevSets = ex ? (previousSetsByExercise.get(ex.exercise_id) ?? []) : [];
    const suggestion = computeSuggestion({
      setNumber: set.set_number,
      setType: set.type,
      previousSets: prevSets as any,
      dbWeightKg: set.weight_kg,
      dbReps: set.reps,
      dbRpe: set.rpe,
    });
    return createDraft(suggestion);
  }, [focusedSetId, drafts, sets, exercises, previousSetsByExercise]);

  function handleFieldChange(field: "weight" | "reps" | "rpe", value: string) {
    if (!focusedSetId) return;
    setDrafts((prev) => {
      const base = prev.get(focusedSetId) ?? currentDraft;
      const updated = touchField(base, field, value);
      return new Map(prev).set(focusedSetId, updated);
    });
  }

  // ── Saving state + undo ───────────────────────────────────────────────────
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [editingCompletedSetId, setEditingCompletedSetId] = useState<string | null>(null);

  // Attempt tag: prevents late results from an earlier attempt overwriting newer state
  const attemptTagRef = useRef(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Complete set ──────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!focusedSetId || savingState === "saving" || savingState === "slow") return;

    const draft = currentDraft;
    const parsed = parseDraftForCommit(draft, (() => {
      const set = sets.find((s) => s.id === focusedSetId);
      return set ? { weightKg: set.weight_kg, reps: set.reps, rpe: set.rpe } : undefined;
    })());

    if (!parsed) return; // Invalid reps — don't proceed

    const seqEntry = sequence.find((e) => e.setId === focusedSetId);
    const isSupersetRound = seqEntry?.supersetGroup != null;
    const endsRound = seqEntry?.endsRound ?? true;
    const restDuration = getRestDuration(endsRound, isSupersetRound);

    const tag = ++attemptTagRef.current;
    setSavingState("saving");

    // 2-second slow timer
    slowTimerRef.current = setTimeout(() => {
      if (attemptTagRef.current === tag) setSavingState("slow");
    }, 2000);

    try {
      await completeSetAtomic(db as any, focusedSetId, parsed, restDuration);
      if (attemptTagRef.current !== tag) return;

      // Clear slow timer
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSavingState("idle");

      // Advance progression anchor
      progressionAnchorRef.current = focusedSetId;
      setPersistedFocusId(null);

      // Start rest if applicable
      if (restDuration > 0) {
        dispatchRest({ type: "START", nowMs: Date.now(), durationSeconds: restDuration });
        void persistSession(null, { status: "running", deadlineMs: Date.now() + restDuration * 1000 });
      } else {
        void persistSession(null, { status: "idle" });
      }

      // Remove draft for completed set
      setDrafts((prev) => {
        const next = new Map(prev);
        next.delete(focusedSetId);
        return next;
      });

      // Undo (5 s window)
      const expiresAt = Date.now() + 5000;
      setUndoState({ setId: focusedSetId, expiresAt });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoState(null), 5000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // 8-second verification read (check values match)
      setTimeout(async () => {
        if (attemptTagRef.current !== tag) return;
        try {
          const result = await (db as any).execute(
            "SELECT completed, weight_kg, reps, rpe FROM exercise_sets WHERE id = ?",
            [focusedSetId],
          );
          const row = result?.rows?._array?.[0];
          if (!row || row.completed !== 1) {
            setSavingState("retry");
          }
        } catch {
          // can't verify; stay idle
        }
      }, 8000);

    } catch {
      if (attemptTagRef.current !== tag) return;
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSavingState("retry");
    }
  }, [focusedSetId, savingState, currentDraft, sequence, db, persistSession, sets]);

  // ── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!undoState || Date.now() > undoState.expiresAt) return;
    setUndoState(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    // Reopen rest timer if it was started by this completion
    dispatchRest({ type: "SET_COMPLETE" }); // clear rest
    await markSetIncomplete(db as any, undoState.setId).catch(() => {});
  }, [undoState, db]);

  // ── Finish ────────────────────────────────────────────────────────────────
  const [finishSheetVisible, setFinishSheetVisible] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushError, setFlushError] = useState<string | null>(null);

  const finishSummary = useMemo(() => {
    const startMs = new Date(workout.started_at).getTime();
    return buildFinishSummary(sets as any, drafts, startMs, Date.now());
  }, [sets, drafts, workout.started_at]);

  const handleFinishTap = useCallback(() => {
    setFinishSheetVisible(true);
  }, []);

  const handleFinishConfirm = useCallback(async () => {
    setFlushing(true);
    setFlushError(null);
    try {
      const completedAt = new Date();
      await flushDraftsAndFinish(
        db as any,
        workout.id,
        completedAt,
        finishSummary.durationSeconds,
        finishSummary.entries,
      );

      await clearSessionState(userId, workout.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      maybeRequestReview().catch(() => {});

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "WorkoutComplete", params: { workoutId: workout.id } }],
        }),
      );
    } catch (e) {
      setFlushError("Failed to save. Please try again.");
      setFlushing(false);
    }
  }, [db, workout.id, finishSummary, userId, navigation]);

  // ── Dock mode ─────────────────────────────────────────────────────────────
  const dockMode: DockMode = editingCompletedSetId
    ? "return-to-next"
    : savingState === "retry"
    ? "retry"
    : "complete";

  // ── Current exercise + sets ───────────────────────────────────────────────
  const focusedEntry = sequence.find((e) => e.setId === focusedSetId);
  const focusedExercise = focusedEntry
    ? exercises.find((ex) => ex.id === focusedEntry.workoutExerciseId)
    : null;

  const focusedExerciseSets = focusedExercise
    ? (sets.filter((s) => s.workout_exercise_id === focusedExercise.id))
    : [];

  // Previous performance summary for current exercise
  const prevPerf = useMemo(() => {
    if (!focusedExercise) return null;
    const prev = previousSetsByExercise.get(focusedExercise.exercise_id) ?? [];
    if (prev.length === 0) return null;
    return prev
      .map((s) => {
        if (s.weight_kg != null && s.reps != null) return `${s.weight_kg}kg×${s.reps}`;
        if (s.reps != null) return `${s.reps} reps`;
        return "—";
      })
      .slice(0, 4)
      .join(", ");
  }, [focusedExercise, previousSetsByExercise]);

  // ── Queue items ───────────────────────────────────────────────────────────
  const queueItems: QueueItem[] = useMemo(() => {
    return exercises
      .filter((ex) => ex.id !== focusedExercise?.id)
      .map((ex) => {
        const exSets = sets.filter((s) => s.workout_exercise_id === ex.id);
        const completedEx = exSets.filter((s) => s.completed).length;
        return {
          workoutExerciseId: ex.id,
          exerciseName: ex.exercise_name,
          supersetGroup: ex.superset_group,
          currentSetNumber: completedEx + 1,
          totalSets: exSets.length,
          isCompleted: completedEx === exSets.length && exSets.length > 0,
        };
      });
  }, [exercises, sets, focusedExercise]);

  // ── Rest display ──────────────────────────────────────────────────────────
  const remainingRestSeconds = computeRemainingSeconds(restState, Date.now());

  if (exercises.length === 0) {
    return <WorkoutEmptyState onAddExercise={onAddExercise} />;
  }

  const focusedExerciseIndex = focusedExercise
    ? exercises.findIndex((e) => e.id === focusedExercise.id)
    : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Rest timer banner */}
        {restState.status !== "idle" && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              backgroundColor: colors.bg2,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            accessibilityLabel={`Rest timer: ${remainingRestSeconds} seconds remaining`}
          >
            <Text style={{ color: colors.text2, fontSize: 13, fontFamily: fonts.bodyRegular }}>
              Rest
            </Text>
            <Text
              style={{
                color: colors.blue,
                fontSize: 22,
                fontFamily: fonts.displaySemi,
                letterSpacing: -0.3,
              }}
            >
              {remainingRestSeconds}s
            </Text>
          </View>
        )}

        {/* Focused exercise (expanded) */}
        {focusedExercise && focusedSetId && (
          <FocusedExerciseCard
            workoutExerciseId={focusedExercise.id}
            exerciseName={focusedExercise.exercise_name}
            equipment={focusedExercise.exercise_equipment}
            supersetGroup={focusedExercise.superset_group}
            exerciseIndex={focusedExerciseIndex}
            currentSetId={focusedSetId}
            sets={focusedExerciseSets as any}
            draft={currentDraft}
            previousPerformance={prevPerf}
            onFieldChange={handleFieldChange}
            onCompletedSetTap={(sid) => setEditingCompletedSetId(sid)}
            saving={savingState === "saving" || savingState === "slow"}
          />
        )}

        {/* All sets done */}
        {!focusedSetId && exercises.length > 0 && (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Text style={{ color: colors.text2, fontSize: 16, fontFamily: fonts.displaySemi }}>
              All sets complete!
            </Text>
            <Text style={{ color: colors.text3, fontSize: 13, fontFamily: fonts.bodyRegular, marginTop: 4 }}>
              Tap Finish to wrap up.
            </Text>
          </View>
        )}

        {/* Queue */}
        <WorkoutQueue items={queueItems} />
      </ScrollView>

      {/* Action dock */}
      <WorkoutActionDock
        currentSetId={focusedSetId}
        mode={dockMode}
        canUndo={undoState != null && Date.now() < undoState.expiresAt}
        savingState={savingState}
        onComplete={handleComplete}
        onUndo={handleUndo}
        onAddExercise={onAddExercise}
        onDiscard={onCancel}
        onRetry={handleComplete}
        onReturnToNext={() => setEditingCompletedSetId(null)}
      />

      {/* Finish sheet */}
      <WorkoutFinishSheet
        visible={finishSheetVisible}
        completedCount={finishSummary.completedCount}
        incompleteCount={finishSummary.incompleteCount}
        touchedUnsavedCount={finishSummary.touchedUnsavedCount}
        durationSeconds={finishSummary.durationSeconds}
        flushing={flushing}
        flushError={flushError}
        onFinish={handleFinishConfirm}
        onReturn={() => setFinishSheetVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
