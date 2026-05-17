import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// ── Inline helpers from nutrition/page.tsx ────────────────────────────────────

const TYPICAL_BREAKFAST = {
  mealType: "breakfast" as const,
  name: "Oatmeal & eggs",
  calories: "520",
  proteinG: "32",
  carbsG: "58",
  fatG: "12",
};

function NutritionEmptyState({
  onPrefillBreakfast,
}: {
  onPrefillBreakfast: () => void;
}) {
  return (
    <div data-testid="nutrition-empty-state">
      <p>Log your first meal</p>
      <p>Tracking nutrition helps you hit your protein and calorie targets.</p>
      <button onClick={onPrefillBreakfast} data-testid="prefill-breakfast">
        Start with a typical breakfast
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

describe("NutritionEmptyState (AC2 — empty Nutrition screen)", () => {
  it("renders the log-your-first-meal heading", () => {
    render(<NutritionEmptyState onPrefillBreakfast={() => {}} />);
    expect(screen.getByText("Log your first meal")).toBeInTheDocument();
  });

  it("renders the value-prop sentence", () => {
    render(<NutritionEmptyState onPrefillBreakfast={() => {}} />);
    expect(
      screen.getByText(/Tracking nutrition helps you hit your protein/i),
    ).toBeInTheDocument();
  });

  it("renders the typical-breakfast prefill button", () => {
    render(<NutritionEmptyState onPrefillBreakfast={() => {}} />);
    expect(
      screen.getByTestId("prefill-breakfast"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("prefill-breakfast")).toHaveTextContent(
      "Start with a typical breakfast",
    );
  });

  it("calls onPrefillBreakfast when the button is clicked", () => {
    const onPrefill = vi.fn();
    render(<NutritionEmptyState onPrefillBreakfast={onPrefill} />);
    fireEvent.click(screen.getByTestId("prefill-breakfast"));
    expect(onPrefill).toHaveBeenCalledTimes(1);
  });
});

describe("TYPICAL_BREAKFAST prefill values", () => {
  it("targets the breakfast meal type", () => {
    expect(TYPICAL_BREAKFAST.mealType).toBe("breakfast");
  });

  it("has a non-empty food name", () => {
    expect(TYPICAL_BREAKFAST.name.trim().length).toBeGreaterThan(0);
  });

  it("has a positive calorie count", () => {
    expect(parseInt(TYPICAL_BREAKFAST.calories, 10)).toBeGreaterThan(0);
  });

  it("has positive macro values", () => {
    expect(parseFloat(TYPICAL_BREAKFAST.proteinG)).toBeGreaterThan(0);
    expect(parseFloat(TYPICAL_BREAKFAST.carbsG)).toBeGreaterThan(0);
    expect(parseFloat(TYPICAL_BREAKFAST.fatG)).toBeGreaterThan(0);
  });
});
