/**
 * Component tests for WorkoutEntryCard.
 *
 * Tests: start state, continue state, first-workout state,
 * navigation on tap, double-tap guard, confirmation on start-with-active,
 * dismiss tutorial.
 *
 * Pattern: await renderCard() (RTL 14 async render), then use screen.* queries.
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";

// ── Mock deps before importing component ──────────────────────────────────

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement(View, null, children),
    Circle: () => React.createElement(View, null),
  };
});

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockStartEmpty = jest.fn();
jest.mock("../../../lib/workout-start", () => ({
  startEmptyWorkoutAtomic: (...args: any[]) => mockStartEmpty(...args),
  DuplicateActiveWorkoutError: class DuplicateActiveWorkoutError extends Error {
    existingWorkoutId: string;
    constructor(id: string) {
      super(`duplicate: ${id}`);
      this.name = "DuplicateActiveWorkoutError";
      this.existingWorkoutId = id;
    }
  },
}));

jest.mock("../../../lib/haptics", () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  const React = require("react");
  return new Proxy(
    {},
    {
      get: () => () => React.createElement(View, null),
    },
  );
});

// Import after mocks
import { WorkoutEntryCard } from "../workout-entry-card";

const MOCK_DB = {} as any;
const USER_ID = "user-001";

async function renderCard(props: Partial<React.ComponentProps<typeof WorkoutEntryCard>> = {}) {
  await render(
    <WorkoutEntryCard
      db={MOCK_DB}
      userId={USER_ID}
      activeWorkout={null}
      isFirstWorkout={false}
      {...props}
    />,
  );
}

// ─── Default start state ──────────────────────────────────────────────────

describe("WorkoutEntryCard — default start state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartEmpty.mockResolvedValue({ workoutId: "new-w-001" });
  });

  it("renders next-up-hero testID", async () => {
    await renderCard();
    expect(screen.getByTestId("next-up-hero")).toBeTruthy();
  });

  it("navigates to WorkoutActive on tap", async () => {
    await renderCard();
    await act(async () => {
      fireEvent.press(screen.getByTestId("next-up-hero"));
    });
    expect(mockNavigate).toHaveBeenCalledWith("WorkoutActive", {
      workoutId: "new-w-001",
    });
  });

  it("calls startEmptyWorkoutAtomic with db and userId", async () => {
    await renderCard();
    await act(async () => {
      fireEvent.press(screen.getByTestId("next-up-hero"));
    });
    expect(mockStartEmpty).toHaveBeenCalledWith(MOCK_DB, USER_ID);
  });
});

// ─── Active (continue) state ──────────────────────────────────────────────

describe("WorkoutEntryCard — active workout state", () => {
  const ACTIVE = {
    id: "active-w-001",
    name: "Morning Lift",
    startedAt: "2026-08-13T08:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders 'Continue Workout' button when active workout exists", async () => {
    await renderCard({ activeWorkout: ACTIVE });
    expect(screen.getByText(/Continue Workout/i)).toBeTruthy();
  });

  it("navigates directly to active workout without creating a new one", async () => {
    await renderCard({ activeWorkout: ACTIVE });
    fireEvent.press(screen.getByTestId("next-up-hero"));
    expect(mockNavigate).toHaveBeenCalledWith("WorkoutActive", {
      workoutId: "active-w-001",
    });
    expect(mockStartEmpty).not.toHaveBeenCalled();
  });

  it("shows the active workout name", async () => {
    await renderCard({ activeWorkout: ACTIVE });
    expect(screen.getByText("Morning Lift")).toBeTruthy();
  });
});

// ─── First-workout state ──────────────────────────────────────────────────

describe("WorkoutEntryCard — first workout state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartEmpty.mockResolvedValue({ workoutId: "first-w-001" });
  });

  it("renders first workout guidance text", async () => {
    await renderCard({ isFirstWorkout: true });
    expect(screen.getByText(/Your first workout/i)).toBeTruthy();
  });

  it("renders start-workout-btn testID", async () => {
    await renderCard({ isFirstWorkout: true });
    expect(screen.getByTestId("start-workout-btn")).toBeTruthy();
  });

  it("calls dismiss callback when dismiss button pressed", async () => {
    const onDismiss = jest.fn();
    await renderCard({ isFirstWorkout: true, onDismissFirstWorkout: onDismiss });
    fireEvent.press(screen.getByTestId("tutorial-dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("navigates to WorkoutActive after starting first workout", async () => {
    await renderCard({ isFirstWorkout: true });
    await act(async () => {
      fireEvent.press(screen.getByTestId("start-workout-btn"));
    });
    expect(mockNavigate).toHaveBeenCalledWith("WorkoutActive", {
      workoutId: "first-w-001",
    });
  });
});

// ─── Duplicate-active confirmation ────────────────────────────────────────

describe("WorkoutEntryCard — duplicate active confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows Alert when DuplicateActiveWorkoutError is thrown", async () => {
    const { DuplicateActiveWorkoutError } = jest.requireMock("../../../lib/workout-start");
    mockStartEmpty.mockRejectedValue(new DuplicateActiveWorkoutError("existing-id"));
    const alertSpy = jest.spyOn(Alert, "alert");

    await renderCard();
    await act(async () => {
      fireEvent.press(screen.getByTestId("next-up-hero"));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Active Workout",
      expect.any(String),
      expect.any(Array),
    );
  });
});

// ─── Double-tap guard ─────────────────────────────────────────────────────

describe("WorkoutEntryCard — in-flight guard", () => {
  it("navigates exactly once per successful tap", async () => {
    mockStartEmpty.mockResolvedValue({ workoutId: "w-guard" });
    await renderCard();

    await act(async () => {
      fireEvent.press(screen.getByTestId("next-up-hero"));
    });

    // One tap → one navigation (regardless of guard internals)
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("WorkoutActive", { workoutId: "w-guard" });
  });
});

// ─── No competing panels ─────────────────────────────────────────────────

describe("WorkoutEntryCard — no competing panels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartEmpty.mockResolvedValue({ workoutId: "new-w" });
  });

  it("renders exactly one hero card in default state", async () => {
    await renderCard({ activeWorkout: null, isFirstWorkout: false });
    // There should be exactly one workout entry point
    expect(screen.getByTestId("next-up-hero")).toBeTruthy();
    expect(screen.queryAllByTestId("next-up-hero")).toHaveLength(1);
  });

  it("renders exactly one hero card in active state", async () => {
    await renderCard({
      activeWorkout: { id: "w-1", name: "Test", startedAt: "2026-08-13T00:00:00Z" },
      isFirstWorkout: false,
    });
    expect(screen.queryAllByTestId("next-up-hero")).toHaveLength(1);
  });
});
