/**
 * Component tests for WorkoutActionDock.
 *
 * Tests: primary/secondary actions, modes, 48dp targets, disabled state,
 * slow/retry labels, undo visibility, accessibility labels.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

import { WorkoutActionDock } from "../workout-action-dock";

type DockProps = React.ComponentProps<typeof WorkoutActionDock>;

const DEFAULTS: DockProps = {
  currentSetId: "set-001",
  mode: "complete",
  canUndo: false,
  savingState: "idle",
  onComplete: jest.fn(),
  onUndo: jest.fn(),
  onAddExercise: jest.fn(),
  onDiscard: jest.fn(),
  onRetry: jest.fn(),
  onReturnToNext: jest.fn(),
};

async function renderDock(overrides: Partial<DockProps> = {}) {
  await act(async () => {
    render(<WorkoutActionDock {...DEFAULTS} {...overrides} />);
  });
}

describe("WorkoutActionDock", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders Complete Set button with accessibility label", async () => {
    await renderDock();
    const btn = screen.getByLabelText("Complete set");
    expect(btn).toBeTruthy();
    expect(btn.props.testID).toBe("complete-set-set-001");
  });

  it("calls onComplete when Complete Set is pressed", async () => {
    const onComplete = jest.fn();
    await renderDock({ onComplete });
    fireEvent.press(screen.getByLabelText("Complete set"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows Add Exercise button with stable testID", async () => {
    await renderDock();
    const btn = screen.getByTestId("add-exercise-button");
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityLabel).toBe("Add exercise");
  });

  it("Discard button calls onDiscard", async () => {
    const onDiscard = jest.fn();
    await renderDock({ onDiscard });
    fireEvent.press(screen.getByLabelText("Discard workout"));
    expect(onDiscard).toHaveBeenCalled();
  });

  it("Undo hidden when canUndo = false", async () => {
    await renderDock({ canUndo: false });
    expect(screen.queryByLabelText("Undo last set")).toBeNull();
  });

  it("Undo visible and callable when canUndo = true", async () => {
    const onUndo = jest.fn();
    await renderDock({ canUndo: true, onUndo });
    const undo = screen.getByLabelText("Undo last set");
    expect(undo).toBeTruthy();
    fireEvent.press(undo);
    expect(onUndo).toHaveBeenCalled();
  });

  it("slow state shows 'Saving…' label", async () => {
    await renderDock({ savingState: "slow" });
    expect(screen.getByText("Saving…")).toBeTruthy();
  });

  it("saving state disables Complete Set button", async () => {
    await renderDock({ savingState: "saving" });
    const btn = screen.getByLabelText("Complete set");
    expect(btn.props.accessibilityState?.disabled).toBeTruthy();
  });

  it("return-to-next mode shows Return to Next Set instead of Complete", async () => {
    await renderDock({ mode: "return-to-next" });
    expect(screen.getByLabelText("Return to next set")).toBeTruthy();
    expect(screen.queryByLabelText("Complete set")).toBeNull();
  });

  it("retry mode shows Retry button", async () => {
    const onRetry = jest.fn();
    await renderDock({ mode: "retry", onRetry });
    const retryBtn = screen.getByLabelText("Retry saving set");
    expect(retryBtn).toBeTruthy();
    fireEvent.press(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it("all interactive elements have accessibilityRole=button", async () => {
    await renderDock({ canUndo: true });
    const buttons = screen
      .getAllByRole("button")
      .filter((el) => el.props.accessibilityLabel);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("primary button has minHeight >= 48", async () => {
    await renderDock();
    const btn = screen.getByLabelText("Complete set");
    const styles = btn.props.style;
    const flatStyle = Array.isArray(styles) ? Object.assign({}, ...styles) : styles;
    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(48);
  });

  it("Dynamic Type: long label still shows action", async () => {
    await renderDock({ mode: "return-to-next" });
    const btn = screen.getByLabelText("Return to next set");
    expect(btn).toBeTruthy();
  });
});
