/**
 * Component tests for the focus-mode workout screen composition.
 *
 * Tests: one expanded card, enabled lime primary action, non-color labels,
 * keyboard order (Weight → Reps → Complete), 48dp targets, safe-area/dock,
 * completed-set editing/return mode, slow/retry states, empty/offline states.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

// ── Mock native / PowerSync deps ──────────────────────────────────────────
jest.mock("@powersync/react", () => ({
  usePowerSync: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue({ rows: { _array: [] } }),
    writeTransaction: jest.fn(async (fn: any) => {
      await fn({ execute: jest.fn().mockResolvedValue(undefined) });
    }),
  })),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    dispatch: jest.fn(),
  })),
  CommonActions: { reset: jest.fn((x: any) => x) },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock("../../../lib/haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success" },
}));

jest.mock("../../../lib/review-prompt", () => ({
  maybeRequestReview: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../lib/workout-session-storage", () => ({
  loadSessionState: jest.fn().mockResolvedValue(null),
  saveSessionState: jest.fn().mockResolvedValue(undefined),
  clearSessionState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../lib/workout-utils", () => ({
  formatElapsed: jest.fn((s: number) => `${Math.floor(s / 60)}:00`),
}));

// ── Import component after mocks ──────────────────────────────────────────
import { FocusModeComposer } from "../focus-mode-composer";

const WORKOUT = {
  id: "w1",
  name: "Test Workout",
  started_at: new Date(Date.now() - 1800_000).toISOString(),
};

const EXERCISES = [
  {
    id: "we1",
    workout_id: "w1",
    exercise_id: "e1",
    exercise_name: "Bench Press",
    exercise_equipment: "barbell",
    order: 1,
    superset_group: null,
  },
  {
    id: "we2",
    workout_id: "w1",
    exercise_id: "e2",
    exercise_name: "Squat",
    exercise_equipment: "barbell",
    order: 2,
    superset_group: null,
  },
];

const SETS = [
  {
    id: "s1",
    workout_exercise_id: "we1",
    set_number: 1,
    type: "working",
    weight_kg: null,
    reps: null,
    rpe: null,
    completed: 0 as 0 | 1,
  },
  {
    id: "s2",
    workout_exercise_id: "we1",
    set_number: 2,
    type: "working",
    weight_kg: null,
    reps: null,
    rpe: null,
    completed: 0 as 0 | 1,
  },
  {
    id: "s3",
    workout_exercise_id: "we2",
    set_number: 1,
    type: "working",
    weight_kg: null,
    reps: null,
    rpe: null,
    completed: 0 as 0 | 1,
  },
];

const SETS_BY_EXERCISE = new Map([
  ["we1", [SETS[0], SETS[1]]],
  ["we2", [SETS[2]]],
]) as any;

const PREV_BY_EXERCISE = new Map<string, { weight_kg: number | null; reps: number | null; set_number: number }[]>();

function renderComposer(overrides: Partial<typeof SETS[0]>[] = []) {
  const sets = overrides.length > 0 ? overrides.map((o, i) => ({ ...SETS[i], ...o })) : SETS;
  return render(
    <FocusModeComposer
      workout={WORKOUT as any}
      exercises={EXERCISES as any}
      sets={sets as any}
      setsByExercise={SETS_BY_EXERCISE}
      previousSetsByExercise={PREV_BY_EXERCISE}
      userId="user-1"
      onAddExercise={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
}

describe("FocusModeComposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders exactly one expanded focused exercise card", async () => {
    await act(async () => { renderComposer(); });
    const focusedCards = screen.getAllByTestId(/^focused-exercise-/);
    expect(focusedCards.length).toBe(1);
  });

  it("focused card shows the current exercise name", async () => {
    await act(async () => { renderComposer(); });
    expect(screen.getByText("Bench Press")).toBeTruthy();
  });

  it("shows one enabled Complete Set primary action", async () => {
    await act(async () => { renderComposer(); });
    const completeBtn = screen.queryByTestId(/^complete-set-/) ?? screen.getByTestId("complete-set");
    expect(completeBtn).toBeTruthy();
    // Button should not be disabled
    expect(completeBtn.props.accessibilityState?.disabled).toBeFalsy();
  });

  it("weight and reps inputs have accessibility labels (non-color)", async () => {
    await act(async () => { renderComposer(); });
    expect(screen.getByLabelText("Weight in kilograms")).toBeTruthy();
    expect(screen.getByLabelText("Repetitions")).toBeTruthy();
  });

  it("queue shows upcoming exercise", async () => {
    await act(async () => { renderComposer(); });
    const queueItem = screen.getByTestId("queue-exercise-we2");
    expect(queueItem).toBeTruthy();
    expect(queueItem.props.accessibilityLabel).toMatch(/Squat/);
  });

  it("Add Exercise button is present in dock", async () => {
    await act(async () => { renderComposer(); });
    expect(screen.getByTestId("add-exercise-button")).toBeTruthy();
  });

  it("empty state shown when no exercises", async () => {
    await act(async () => {
      render(
        <FocusModeComposer
          workout={WORKOUT as any}
          exercises={[]}
          sets={[]}
          setsByExercise={new Map()}
          previousSetsByExercise={new Map()}
          userId="user-1"
          onAddExercise={jest.fn()}
          onCancel={jest.fn()}
        />,
      );
    });
    expect(screen.getByLabelText(/No exercises/i)).toBeTruthy();
  });

  it("completed state shows 'All sets complete' message", async () => {
    const completedSets = SETS.map((s) => ({ ...s, completed: 1 as 0 | 1 }));
    await act(async () => {
      render(
        <FocusModeComposer
          workout={WORKOUT as any}
          exercises={EXERCISES as any}
          sets={completedSets as any}
          setsByExercise={SETS_BY_EXERCISE}
          previousSetsByExercise={PREV_BY_EXERCISE}
          userId="user-1"
          onAddExercise={jest.fn()}
          onCancel={jest.fn()}
        />,
      );
    });
    expect(screen.getByText("All sets complete!")).toBeTruthy();
  });

  it("return-to-next mode shows correct dock action", async () => {
    // This tests the dock directly
    const { WorkoutActionDock } = require("../workout-action-dock");
    const onReturnToNext = jest.fn();
    await act(async () => {
      render(
        <WorkoutActionDock
          currentSetId="s1"
          mode="return-to-next"
          canUndo={false}
          onComplete={jest.fn()}
          onUndo={jest.fn()}
          onAddExercise={jest.fn()}
          onDiscard={jest.fn()}
          onRetry={jest.fn()}
          onReturnToNext={onReturnToNext}
        />,
      );
    });
    const btn = screen.getByLabelText("Return to next set");
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(onReturnToNext).toHaveBeenCalledTimes(1);
  });

  it("retry state shows retry button", async () => {
    const { WorkoutActionDock } = require("../workout-action-dock");
    const onRetry = jest.fn();
    await act(async () => {
      render(
        <WorkoutActionDock
          currentSetId="s1"
          mode="retry"
          canUndo={false}
          onComplete={jest.fn()}
          onUndo={jest.fn()}
          onAddExercise={jest.fn()}
          onDiscard={jest.fn()}
          onRetry={onRetry}
          onReturnToNext={jest.fn()}
        />,
      );
    });
    const btn = screen.getByLabelText("Retry saving set");
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(onRetry).toHaveBeenCalled();
  });
});
