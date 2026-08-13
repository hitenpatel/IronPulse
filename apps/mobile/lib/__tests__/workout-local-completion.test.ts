import { describe, expect, it, vi } from "vitest";
import { completeWorkoutLocally, type WriteTransactionDb } from "../workout-local-completion";

type Tx = {
  execute: ReturnType<typeof vi.fn>;
  getOptional: ReturnType<typeof vi.fn>;
};

function makeDb(overrides: Partial<Tx> = {}) {
  const execute = vi.fn().mockResolvedValue(undefined);
  const getOptional = vi.fn().mockResolvedValue({
    completed_at: "2026-08-09T03:00:00.000Z",
    duration_seconds: 3600,
  });
  const tx: Tx = { execute, getOptional, ...overrides };
  const writeTransaction = vi.fn(async (run: (t: Tx) => Promise<unknown>) => run(tx));
  // vi.fn() captures Promise<unknown>; cast to WriteTransactionDb so the mock
  // satisfies the generic interface — runtime behaviour is identical.
  const db = { writeTransaction } as unknown as WriteTransactionDb;
  return { db, execute: tx.execute, getOptional: tx.getOptional, writeTransaction };
}

describe("completeWorkoutLocally", () => {
  const workoutId = "11111111-1111-4111-8111-111111111111";

  it("commits canonical timestamp locally without a network mutation", async () => {
    const { db, execute, getOptional } = makeDb();

    const result = await completeWorkoutLocally(db, {
      workoutId,
      startedAt: "2026-08-09T02:00:00.000Z",
      completedAt: new Date("2026-08-09T03:00:00.000Z"),
    });

    expect(execute).toHaveBeenCalledWith(
      "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ? AND completed_at IS NULL",
      ["2026-08-09T03:00:00.000Z", 3600, workoutId],
    );
    expect(getOptional).toHaveBeenCalledWith(
      "SELECT completed_at, duration_seconds FROM workouts WHERE id = ?",
      [workoutId],
    );
    expect(result).toEqual({
      completedAt: "2026-08-09T03:00:00.000Z",
      durationSeconds: 3600,
    });
  });

  it("returns canonical stored values on replay even if attempted values differ", async () => {
    const { db } = makeDb({
      getOptional: vi.fn().mockResolvedValue({
        completed_at: "2026-08-09T02:59:59.000Z",
        duration_seconds: 3599,
      }),
    });

    const result = await completeWorkoutLocally(db, {
      workoutId,
      startedAt: "2026-08-09T02:00:00.000Z",
      completedAt: new Date("2026-08-09T04:00:00.000Z"),
    });

    expect(result).toEqual({
      completedAt: "2026-08-09T02:59:59.000Z",
      durationSeconds: 3599,
    });
  });

  it("clamps negative duration to zero", async () => {
    const { db, execute } = makeDb({
      getOptional: vi.fn().mockResolvedValue({
        completed_at: "2026-08-09T02:00:00.000Z",
        duration_seconds: 0,
      }),
    });

    await completeWorkoutLocally(db, {
      workoutId,
      startedAt: "2026-08-09T03:00:00.000Z",
      completedAt: new Date("2026-08-09T02:00:00.000Z"),
    });

    expect(execute).toHaveBeenCalledWith(
      "UPDATE workouts SET completed_at = ?, duration_seconds = ? WHERE id = ? AND completed_at IS NULL",
      ["2026-08-09T02:00:00.000Z", 0, workoutId],
    );
  });

  it("throws when the workout row is missing (already completed or deleted)", async () => {
    const { db } = makeDb({
      getOptional: vi.fn().mockResolvedValue(null),
    });

    await expect(
      completeWorkoutLocally(db, {
        workoutId,
        startedAt: "2026-08-09T02:00:00.000Z",
        completedAt: new Date("2026-08-09T03:00:00.000Z"),
      }),
    ).rejects.toThrow(/workout .* not found/i);
  });

  it("rejects when the transaction throws and does not resolve", async () => {
    const boom = new Error("db offline");
    const writeTransaction = vi.fn().mockRejectedValue(boom);
    const db = { writeTransaction } as unknown as WriteTransactionDb;

    await expect(
      completeWorkoutLocally(db, {
        workoutId,
        startedAt: "2026-08-09T02:00:00.000Z",
        completedAt: new Date("2026-08-09T03:00:00.000Z"),
      }),
    ).rejects.toBe(boom);
  });
});
