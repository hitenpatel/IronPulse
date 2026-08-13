/**
 * Tests for workout-entry-state.ts
 *
 * useLatestIncompleteWorkout wraps useQuery — we test via mocking @powersync/react.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock PowerSync ──────────────────────────────────────────────────────────
const mockUseQuery = vi.fn();
vi.mock("@powersync/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Import after mocks are set up
import {
  useLatestIncompleteWorkout,
} from "../workout-entry-state";

// Helper to simulate calling the hook (we call the fn directly since it's
// a plain function around useQuery; in vitest we don't need a renderer).
function callHook() {
  // Reset state and call as if inside a React component.
  return useLatestIncompleteWorkout();
}

describe("useLatestIncompleteWorkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the canonical SQL to useQuery", () => {
    mockUseQuery.mockReturnValue({ data: [] });
    callHook();

    const [sql] = mockUseQuery.mock.calls[0];
    expect(sql).toContain("completed_at IS NULL");
    expect(sql).toContain("ORDER BY started_at DESC, id DESC");
    expect(sql).toContain("LIMIT 1");
  });

  it("returns null activeWorkout when no rows", () => {
    mockUseQuery.mockReturnValue({ data: [] });
    const { activeWorkout } = callHook();
    expect(activeWorkout).toBeNull();
  });

  it("returns null activeWorkout when data is undefined (offline, no cache)", () => {
    mockUseQuery.mockReturnValue({ data: undefined });
    const { activeWorkout } = callHook();
    expect(activeWorkout).toBeNull();
  });

  it("returns mapped activeWorkout from the first row", () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: "w-001", name: "Morning Lift", started_at: "2026-08-13T08:00:00Z" },
      ],
    });
    const { activeWorkout } = callHook();
    expect(activeWorkout).toEqual({
      id: "w-001",
      name: "Morning Lift",
      startedAt: "2026-08-13T08:00:00Z",
    });
  });

  it("falls back name to 'Active Workout' when name is null", () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: "w-002", name: null, started_at: "2026-08-13T09:00:00Z" }],
    });
    const { activeWorkout } = callHook();
    expect(activeWorkout?.name).toBe("Active Workout");
  });

  it("surfaces only the first row when multiple incomplete exist (newest by SQL order)", () => {
    // SQL LIMIT 1 means only one row ever arrives — simulate that behaviour.
    mockUseQuery.mockReturnValue({
      data: [{ id: "w-newest", name: "Evening Workout", started_at: "2026-08-13T18:00:00Z" }],
    });
    const { activeWorkout } = callHook();
    expect(activeWorkout?.id).toBe("w-newest");
  });

  it("returns null for first-workout scenario (no workouts at all)", () => {
    mockUseQuery.mockReturnValue({ data: [] });
    const result = callHook();
    expect(result.activeWorkout).toBeNull();
  });

  it("handles offline gracefully when PowerSync returns empty array from cache", () => {
    // Simulates offline: PowerSync has no cached incomplete row.
    mockUseQuery.mockReturnValue({ data: [] });
    expect(() => callHook()).not.toThrow();
    const { activeWorkout } = callHook();
    expect(activeWorkout).toBeNull();
  });
});
