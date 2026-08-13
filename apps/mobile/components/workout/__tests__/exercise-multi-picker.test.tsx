/**
 * Component tests for ExerciseMultiPicker.
 *
 * Tests cover:
 *   - View switching (Recent / Favorites / All)
 *   - Search + filter composition
 *   - Selection persistence across filter/view changes
 *   - "Add N" batch commit callback
 *   - Duplicate-in-batch dedup (second tap = deselect)
 *   - No-results / offline / error / loading states
 *   - Safe-area header renders
 *
 * Note: RTL 14 fireEvent.press / fireEvent.changeText are async — always await them.
 */
import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react-native";

// Safe-area mock is in jest.setup.ts — already applied globally.

// @zor/sync type-only import
jest.mock("@zor/sync", () => ({}));

// Stub lucide icons — they aren't relevant to picker logic
jest.mock("lucide-react-native", () => ({
  X: () => null,
  Check: () => null,
  Filter: () => null,
}));

// No FlatList mock needed — exercise-multi-picker uses ScrollView + map for the exercise list.

import { ExerciseMultiPicker } from "../exercise-multi-picker";
import type { ExerciseRow } from "@zor/sync";

// ── Test fixtures ──────────────────────────────────────────────────────────

function makeEx(
  id: string,
  name: string,
  opts: Partial<ExerciseRow> = {},
): ExerciseRow {
  return {
    id,
    name,
    category: null,
    primary_muscles: null,
    secondary_muscles: null,
    equipment: null,
    instructions: null,
    image_urls: null,
    video_urls: null,
    is_custom: 0,
    created_by_id: null,
    ...opts,
  };
}

const ALL_EXERCISES: ExerciseRow[] = [
  makeEx("ex-1", "Barbell Squat", { primary_muscles: "Quadriceps", equipment: "Barbell" }),
  makeEx("ex-2", "Dumbbell Curl", { primary_muscles: "Biceps", equipment: "Dumbbell" }),
  makeEx("ex-3", "Push-up", { primary_muscles: "Chest", equipment: "Bodyweight" }),
];

const RECENT_EXERCISES: ExerciseRow[] = [
  makeEx("ex-1", "Barbell Squat", { primary_muscles: "Quadriceps", equipment: "Barbell" }),
];

const FAVORITE_EXERCISES: ExerciseRow[] = [
  makeEx("ex-2", "Dumbbell Curl", { primary_muscles: "Biceps", equipment: "Dumbbell" }),
];

// RTL 14 registers its own afterEach cleanup; explicit call ensures isolation.
afterEach(() => {
  cleanup();
});

async function renderPicker(overrides: Partial<React.ComponentProps<typeof ExerciseMultiPicker>> = {}) {
  const onAdd = jest.fn();
  const onClose = jest.fn();
  const result = await render(
    <ExerciseMultiPicker
      allExercises={ALL_EXERCISES}
      recentExercises={RECENT_EXERCISES}
      favoriteExercises={FAVORITE_EXERCISES}
      onAdd={onAdd}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onAdd, onClose, ...result };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ExerciseMultiPicker — header and close", () => {
  it("renders the close button", async () => {
    const { getByTestId } = await renderPicker();
    expect(getByTestId("picker-close")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", async () => {
    const { onClose, getByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("picker-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows 'Add Exercises' heading", async () => {
    const { getByText } = await renderPicker();
    expect(getByText("Add Exercises")).toBeTruthy();
  });
});

describe("ExerciseMultiPicker — view switching", () => {
  it("defaults to Recent tab", async () => {
    const { getByTestId, queryByTestId } = await renderPicker();
    // Recent tab is active — Barbell Squat is the recent exercise
    expect(getByTestId("exercise-option-ex-1")).toBeTruthy();
    // Dumbbell Curl is NOT in recent so should not be visible
    expect(queryByTestId("exercise-option-ex-2")).toBeNull();
  });

  it("switching to All tab shows all exercises", async () => {
    const { getByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    expect(getByTestId("exercise-option-ex-2")).toBeTruthy();
    expect(getByTestId("exercise-option-ex-1")).toBeTruthy();
    expect(getByTestId("exercise-option-ex-3")).toBeTruthy();
  });

  it("switching to Favorites tab shows favorite exercises", async () => {
    const { getByTestId, queryByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-favorites"));
    expect(getByTestId("exercise-option-ex-2")).toBeTruthy();
    expect(queryByTestId("exercise-option-ex-1")).toBeNull();
  });

  it("switching tabs preserves selection", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    // Select ex-1 in All view
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    // Switch to Favorites
    await fireEvent.press(getByTestId("tab-favorites"));
    // Switch back to All
    await fireEvent.press(getByTestId("tab-all"));
    // Selection count should still show 1
    expect(getByText("Add 1 Exercise")).toBeTruthy();
  });
});

describe("ExerciseMultiPicker — search composition", () => {
  it("filters exercises by search text within active view", async () => {
    const { getByTestId, queryByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.changeText(getByTestId("search-input"), "squat");
    expect(getByTestId("exercise-option-ex-1")).toBeTruthy();
    expect(queryByTestId("exercise-option-ex-2")).toBeNull();
  });

  it("shows no-results state when search yields nothing", async () => {
    const { getByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.changeText(getByTestId("search-input"), "zzznomatch");
    expect(getByTestId("empty-state")).toBeTruthy();
  });

  it("selection made before search survives filter change", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    await fireEvent.changeText(getByTestId("search-input"), "curl");
    // ex-1 no longer visible, but selection count persists
    expect(getByText("Add 1 Exercise")).toBeTruthy();
  });
});

describe("ExerciseMultiPicker — selection behaviour", () => {
  it("selecting an exercise shows count in button", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    expect(getByText("Add 1 Exercise")).toBeTruthy();
  });

  it("selecting two exercises shows plural count", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    await fireEvent.press(getByTestId("exercise-option-ex-2"));
    expect(getByText("Add 2 Exercises")).toBeTruthy();
  });

  it("second tap on selected exercise deselects it (AC #4 dedup)", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1")); // select
    await fireEvent.press(getByTestId("exercise-option-ex-1")); // deselect
    // Count goes back to 0 → button shows 'Select Exercises'
    expect(getByText("Select Exercises")).toBeTruthy();
  });

  it("Add button shows 'Select Exercises' when nothing selected", async () => {
    const { getByText } = await renderPicker();
    // Default 'Select Exercises' text indicates no selection
    expect(getByText("Select Exercises")).toBeTruthy();
  });

  it("pressing Add button calls onAdd with selected IDs", async () => {
    const { onAdd, getByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    await fireEvent.press(getByTestId("exercise-option-ex-2"));
    await fireEvent.press(getByTestId("add-button"));
    expect(onAdd).toHaveBeenCalledWith(["ex-1", "ex-2"]);
  });

  it("does not call onAdd when no exercises are selected", async () => {
    const { onAdd, getByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("add-button"));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("ExerciseMultiPicker — states", () => {
  it("shows loading indicator when isLoadingAll is true in All view", async () => {
    const { getByTestId } = await renderPicker({ isLoadingAll: true });
    // Switch to All view to trigger isLoadingAll
    await fireEvent.press(getByTestId("tab-all"));
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("shows error state with retry button when errorAll is true in All view", async () => {
    const onRetry = jest.fn();
    const { getByTestId } = await renderPicker({ errorAll: true, onRetry });
    await fireEvent.press(getByTestId("tab-all"));
    expect(getByTestId("error-state")).toBeTruthy();
    expect(getByTestId("retry-button")).toBeTruthy();
    await fireEvent.press(getByTestId("retry-button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows offline banner when isOffline is true", async () => {
    const { getByTestId } = await renderPicker({ isOffline: true });
    expect(getByTestId("offline-banner")).toBeTruthy();
  });

  it("shows empty-state copy for Recent view with no exercises", async () => {
    const { getByTestId, getByText } = await renderPicker({ recentExercises: [] });
    // Default view is Recent
    expect(getByTestId("empty-state")).toBeTruthy();
    expect(getByText("No recent exercises yet")).toBeTruthy();
  });

  it("shows empty-state copy for Favorites view with no favorites", async () => {
    const { getByTestId, getByText } = await renderPicker({ favoriteExercises: [] });
    await fireEvent.press(getByTestId("tab-favorites"));
    expect(getByText("No favorites yet")).toBeTruthy();
  });
});

describe("ExerciseMultiPicker — filter panel", () => {
  it("toggles filter panel on filter button press", async () => {
    const { getByTestId, queryByText, getByText } = await renderPicker();
    // Filter panel hidden by default
    expect(queryByText("MUSCLE GROUP")).toBeNull();
    await fireEvent.press(getByTestId("filter-toggle"));
    expect(getByText("MUSCLE GROUP")).toBeTruthy();
  });

  it("selecting a muscle filter chip reduces visible exercises", async () => {
    const { getByTestId, queryByTestId } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("filter-toggle"));
    await fireEvent.press(getByTestId("filter-chip-Biceps"));
    expect(getByTestId("exercise-option-ex-2")).toBeTruthy();
    expect(queryByTestId("exercise-option-ex-1")).toBeNull();
  });

  it("selection persists when filter changes", async () => {
    const { getByTestId, getByText } = await renderPicker();
    await fireEvent.press(getByTestId("tab-all"));
    await fireEvent.press(getByTestId("exercise-option-ex-1"));
    await fireEvent.press(getByTestId("filter-toggle"));
    await fireEvent.press(getByTestId("filter-chip-Biceps"));
    // ex-1 filtered out, but selection count remains
    expect(getByText("Add 1 Exercise")).toBeTruthy();
  });
});
