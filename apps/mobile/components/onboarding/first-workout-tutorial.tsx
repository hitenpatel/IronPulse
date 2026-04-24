import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CheckCircle2, ChevronRight, X } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface FirstWorkoutTutorialProps {
  /** Starts the user's first workout — delegated to the dashboard's own handler. */
  onStart: () => void | Promise<void>;
  /** Persists dismissal so the banner never shows again for this user. */
  onDismiss: () => void | Promise<void>;
}

/**
 * One-time banner shown on the dashboard after onboarding. Walks the user
 * through the four things they need to know for their first workout —
 * starting, adding an exercise, logging sets, and finishing — then drops
 * them into the active-workout flow.
 *
 * The banner compresses into a single row of checklist bullets so it
 * doesn't dominate the dashboard above the fold.
 */
export function FirstWorkoutTutorial({
  onStart,
  onDismiss,
}: FirstWorkoutTutorialProps) {
  const [busy, setBusy] = useState(false);

  const steps: string[] = [
    "Tap Start Workout to begin a session",
    "Add an exercise from the library",
    "Log sets — weight, reps, tap the ✓",
    "Tap Finish to save your workout",
  ];

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    try {
      // Dismiss first so the banner never reappears even if nav fails.
      await onDismiss();
      await onStart();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      testID="first-workout-tutorial"
      style={{
        marginBottom: 16,
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
        <Pressable
          testID="tutorial-dismiss"
          onPress={() => {
            onDismiss();
          }}
          hitSlop={8}
        >
          <X size={18} color={colors.text3} />
        </Pressable>
      </View>

      <View style={{ gap: 6, marginBottom: 12 }}>
        {steps.map((step, i) => (
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
        testID="tutorial-start"
        onPress={handleStart}
        disabled={busy}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.blue,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            color: colors.blueInk,
            fontSize: 13.5,
            fontFamily: fonts.bodySemi,
            letterSpacing: 0.2,
          }}
        >
          Start my first workout
        </Text>
        <ChevronRight size={14} color={colors.blueInk} />
      </Pressable>
    </View>
  );
}
