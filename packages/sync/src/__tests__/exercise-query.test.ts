/**
 * Tests for useExercises SQL composition.
 * Validates filter conditions, ordering, and limit without a live DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @powersync/react before importing the hook
vi.mock("@powersync/react", () => ({
  useQuery: vi.fn((sql: string, params: unknown[]) => ({ sql, params, data: [] })),
}));

import { useQuery } from "@powersync/react";

// We import after the mock is in place
let useExercises: typeof import("../hooks/use-exercises").useExercises;
let useRecentExercises: typeof import("../hooks/use-exercises").useRecentExercises;

beforeEach(async () => {
  vi.clearAllMocks();
  // Re-import to pick up fresh mock
  const mod = await import("../hooks/use-exercises");
  useExercises = mod.useExercises;
  useRecentExercises = mod.useRecentExercises;
});

describe("useExercises SQL composition", () => {
  it("produces no WHERE clause when no opts provided", () => {
    useExercises();
    const [sql, params] = (useQuery as any).mock.calls[0];
    expect(sql).not.toContain("WHERE");
    expect(params).toEqual([]);
  });

  it("adds LIKE search condition", () => {
    useExercises({ search: "curl" });
    const [sql, params] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("name LIKE ?");
    expect(params).toContain("%curl%");
  });

  it("adds muscle condition", () => {
    useExercises({ muscle: "Biceps" });
    const [sql, params] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("primary_muscles LIKE ?");
    expect(params).toContain("%Biceps%");
  });

  it("adds equipment condition", () => {
    useExercises({ equipment: "Barbell" });
    const [sql, params] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("equipment = ?");
    expect(params).toContain("Barbell");
  });

  it("composes all conditions with AND", () => {
    useExercises({ search: "press", muscle: "Chest", equipment: "Dumbbell" });
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("WHERE");
    expect(sql).toContain("AND");
  });

  it("uses deterministic ORDER BY name, id", () => {
    useExercises();
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toMatch(/ORDER BY name, id/);
  });

  it("defaults to LIMIT 100", () => {
    useExercises();
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("LIMIT 100");
  });

  it("respects explicit limit option", () => {
    useExercises({ limit: 500 } as any);
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("LIMIT 500");
  });
});

describe("useRecentExercises SQL composition", () => {
  it("queries workout_exercises joined to workouts filtered by completed_at", () => {
    useRecentExercises();
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("workout_exercises");
    expect(sql).toContain("completed_at IS NOT NULL");
    expect(sql).toContain("GROUP BY");
  });

  it("orders by last_used DESC", () => {
    useRecentExercises();
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toMatch(/last_used DESC/);
  });

  it("defaults to LIMIT 20", () => {
    useRecentExercises();
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("LIMIT 20");
  });

  it("respects explicit limit", () => {
    useRecentExercises({ limit: 10 });
    const [sql] = (useQuery as any).mock.calls[0];
    expect(sql).toContain("LIMIT 10");
  });
});
