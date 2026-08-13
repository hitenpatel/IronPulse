/**
 * WorkoutEntryCard
 *
 * Single hero card on the Home/Dashboard screen that adapts to three states:
 *
 *  1. active   — "Continue Workout — {name}" CTA; navigates directly to the
 *                active workout screen without creating anything new.
 *  2. first    — "Your first workout" guidance + concise steps, inline.
 *  3. default  — "Start Workout" CTA, creates a new empty workout atomically.
 *
 * Replaces the separate <NextUpHeroCard> and <FirstWorkoutTutorial> panels
 * so only ONE entry card ever appears on the dashboard.
 */

import React, { useRef, useState } from "react";
import { Alert, Pressable, Text, View, ActivityIndicator } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Play, CheckCircle2, X, Zap } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { colors, fonts, radii } from "@/lib/theme";
import * as Haptics from "@/lib/haptics";
import {
  startEmptyWorkoutAtomic,
  DuplicateActiveWorkoutError,
} from "@/lib/workout-start";
import type { PowerSyncDatabase } from "@powersync/react-native";

// ─── Deco ─────────────────────────────────────────────────────────────────────

function ConcentricDeco() {
  return (
    <Svg
      width={120}
      height={120}
      viewBox="0 0 100 100"
      style={{ position: "absolute", right: -14, top: -14, opacity: 0.08 }}
    >
      <Circle cx="50" cy="50" r="40" stroke={colors.blue} strokeWidth={1} fill="none" />
      <Circle cx="50" cy="50" r="30" stroke={colors.blue} strokeWidth={1} fill="none" />
      <Circle cx="50" cy="50" r="20" stroke={colors.blue} strokeWidth={1} fill="none" />
    </Svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkoutEntryCardProps {
  /** Database instance for transactional creation. */
  db: PowerSyncDatabase;
  /** Authenticated user id. */
  userId: string;
  /**
   * When non-null, the card shows "Continue Workout" instead of "Start Workout".
   * onStart is NOT called — navigation goes directly to the active workout.
   */
  activeWorkout: { id: string; name: string; startedAt: string } | null;
  /**
   * Whether this is the user's first-ever workout (zero completed workouts).
   * When true, the card shows inline first-workout guidance steps.
   */
  isFirstWorkout: boolean;
  /** Called when the first-workout panel is dismissed. */
  onDismissFirstWorkout?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FIRST_WORKOUT_STEPS = [
  "Tap Start Workout to begin a session",
  "Add an exercise from the library",
  "Log sets — weight, reps, tap the ✓",
  "Tap Finish to save your workout",
];

export function WorkoutEntryCard({
  db,
  userId,
  activeWorkout,
  isFirstWorkout,
  onDismissFirstWorkout,
}: WorkoutEntryCardProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const handleContinue = () => {
    if (!activeWorkout) return;
    Haptics.selectionAsync();
    navigation.navigate("WorkoutActive", { workoutId: activeWorkout.id });
  };

  const handleStart = async () => {
    // Double-tap guard
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy(true);

    try {
      const { workoutId } = await startEmptyWorkoutAtomic(db, userId);
      Haptics.selectionAsync();
      navigation.navigate("WorkoutActive", { workoutId });
    } catch (err) {
      if (err instanceof DuplicateActiveWorkoutError) {
        // Race: another workout appeared between renders — confirm discard
        Alert.alert(
          "Active Workout",
          "You already have an active workout. Discard it and start a new one?",
          [
            { text: "Keep Active", style: "cancel" },
            {
              text: "Start New",
              style: "destructive",
              onPress: async () => {
                try {
                  const { workoutId } = await startEmptyWorkoutAtomic(db, userId, {
                    discardExisting: true,
                  });
                  navigation.navigate("WorkoutActive", { workoutId });
                } catch {
                  // ignore — user can retry
                }
              },
            },
          ],
        );
      }
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  };

  if (activeWorkout) {
    // ── Continue state ────────────────────────────────────────────────────────
    return (
      <Pressable
        testID="next-up-hero"
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel={`Continue workout: ${activeWorkout.name}`}
      >
        <View
          style={{
            position: "relative",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.green,
            backgroundColor: `${colors.green}18`,
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <ConcentricDeco />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.green,
              }}
            />
            <Text
              style={{
                color: colors.green,
                fontSize: 10,
                fontFamily: fonts.bodySemi,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              In progress
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.displaySemi,
              fontSize: 22,
              fontWeight: "600",
              letterSpacing: -0.5,
              color: colors.text,
              marginBottom: 2,
            }}
          >
            {activeWorkout.name}
          </Text>
          <Text style={{ color: colors.text3, fontSize: 11.5, marginBottom: 14, fontFamily: fonts.body }}>
            Tap to continue logging
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              backgroundColor: colors.green,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: radii.button,
            }}
          >
            <Zap size={14} color={colors.bg} />
            <Text
              style={{
                fontFamily: fonts.bodySemi,
                fontSize: 13,
                color: colors.bg,
              }}
            >
              Continue Workout
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (isFirstWorkout) {
    // ── First-workout guidance (inline, no separate panel) ────────────────────
    return (
      <View
        testID="next-up-hero"
        style={{
          marginBottom: 12,
          padding: 16,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.blue,
          backgroundColor: colors.blueSoft,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontFamily: fonts.displaySemi,
              letterSpacing: -0.2,
            }}
          >
            Your first workout
          </Text>
          {onDismissFirstWorkout && (
            <Pressable
              testID="tutorial-dismiss"
              onPress={onDismissFirstWorkout}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss tutorial"
            >
              <X size={18} color={colors.text3} />
            </Pressable>
          )}
        </View>
        <View style={{ gap: 6, marginBottom: 16 }}>
          {FIRST_WORKOUT_STEPS.map((step, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <CheckCircle2 size={14} color={colors.blue2} />
              <Text
                style={{
                  flex: 1,
                  color: colors.text2,
                  fontSize: 13,
                  fontFamily: fonts.bodyRegular,
                }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          testID="start-workout-btn"
          onPress={handleStart}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Start your first workout"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: colors.blue,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: radii.button,
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.blueInk} />
          ) : (
            <>
              <Play size={14} color={colors.blueInk} />
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: colors.blueInk,
                }}
              >
                Start Workout
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  // ── Default start state ───────────────────────────────────────────────────
  return (
    <Pressable
      testID="next-up-hero"
      onPress={handleStart}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Start workout"
    >
      <View
        style={{
          position: "relative",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.blueSoft,
          backgroundColor: colors.blueSoft,
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <ConcentricDeco />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.blue,
            }}
          />
          <Text
            style={{
              color: colors.blue2,
              fontSize: 10,
              fontFamily: fonts.bodySemi,
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Next up · fresh session
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.displaySemi,
            fontSize: 22,
            fontWeight: "600",
            letterSpacing: -0.5,
            color: colors.text,
            marginBottom: 2,
          }}
        >
          Ready to train?
        </Text>
        <Text style={{ color: colors.text3, fontSize: 11.5, marginBottom: 14, fontFamily: fonts.body }}>
          Tap to start logging
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            backgroundColor: busy ? colors.text4 : colors.blue,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: radii.button,
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.blueInk} />
          ) : (
            <>
              <Play size={14} color={colors.blueInk} />
              <Text
                style={{
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  color: colors.blueInk,
                }}
              >
                Start workout
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}
