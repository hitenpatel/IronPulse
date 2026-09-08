import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const EXERCISES = [
  {
    id: "ex-squat",
    name: "Barbell Squat",
    category: "compound",
    equipment: "barbell",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes"],
  },
  {
    id: "ex-curl",
    name: "Dumbbell Curl",
    category: "isolation",
    equipment: "dumbbell",
    primaryMuscles: ["biceps"],
    secondaryMuscles: [],
  },
];

const RESTRICTIONS = [
  {
    id: "restriction-1",
    injuryId: "injury-1",
    muscleGroups: ["quadriceps"],
    note: "no squats",
    startsAt: new Date("2026-08-01"),
    expiresAt: new Date("2026-12-01"),
  },
];

const INJURIES = [
  {
    id: "injury-1",
    injuryType: "strain",
    bodyParts: ["quadriceps"],
    severity: 6,
    status: "active",
    injuredAt: new Date("2026-08-01"),
  },
];

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    exercise: {
      list: {
        useQuery: () => ({
          data: { data: EXERCISES, nextCursor: null },
          isLoading: false,
        }),
      },
    },
    injury: {
      listRestrictions: {
        useQuery: () => ({ data: { data: RESTRICTIONS }, isLoading: false }),
      },
      list: {
        useQuery: () => ({ data: { data: INJURIES }, isLoading: false }),
      },
    },
    workout: {
      addExercise: {
        useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
      },
    },
  },
}));

import { AddExerciseSheet } from "../add-exercise-sheet";

const baseProps = {
  workoutId: "workout-1",
  open: true,
  onOpenChange: vi.fn(),
  onExerciseAdded: vi.fn(),
};

describe("AddExerciseSheet — restriction badges (TASK-13 Task 6)", () => {
  it("shows a restricted badge for an exercise whose muscle is restricted", () => {
    render(<AddExerciseSheet {...baseProps} />);
    const badges = screen.getAllByTestId("exercise-restricted-badge");
    expect(badges).toHaveLength(1);
  });

  it("does not show a badge for a non-matching exercise", () => {
    render(<AddExerciseSheet {...baseProps} />);
    // Only one badge total, and it's associated with the squat row, not curl.
    const curlRow = screen.getByText("Dumbbell Curl").closest("button");
    expect(curlRow?.querySelector('[data-testid="exercise-restricted-badge"]')).toBeNull();
  });

  it("surfaces the source injury behind the restriction when expanded", () => {
    render(<AddExerciseSheet {...baseProps} />);
    const toggle = screen.getByRole("button", { name: /why is this restricted/i });
    fireEvent.click(toggle);
    expect(screen.getByText(/strain/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no squats/i).length).toBeGreaterThan(0);
  });

  it("keeps the exercise selectable — badges are informational, not a block", () => {
    render(<AddExerciseSheet {...baseProps} />);
    const squatRow = screen.getByText("Barbell Squat").closest("button");
    expect(squatRow).not.toBeDisabled();
  });
});
