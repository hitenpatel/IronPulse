/**
 * Tests for workout-start.ts — transactional workout creation helpers.
 *
 * We mock the PowerSyncDatabase to capture SQL calls and control the
 * writeTransaction callback execution.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  startEmptyWorkoutAtomic,
  startWorkoutFromTemplateAtomic,
  DuplicateActiveWorkoutError,
} from "../workout-start";

// ── Helpers ────────────────────────────────────────────────────────────────

type TxFn = (tx: MockTx) => Promise<void>;

class MockTx {
  calls: Array<[string, unknown[]]> = [];
  private responses: Map<string, unknown> = new Map();

  /** Prime a response for a SQL fragment. */
  respondTo(sqlFragment: string, rows: unknown[]) {
    this.responses.set(sqlFragment, rows);
  }

  async execute(sql: string, params: unknown[] = []): Promise<unknown> {
    this.calls.push([sql, params]);
    for (const [fragment, rows] of this.responses) {
      if (sql.includes(fragment)) {
        return { rows: { _array: rows } };
      }
    }
    return { rows: { _array: [] } };
  }
}

function makeDb(existingWorkoutId?: string) {
  const tx = new MockTx();
  if (existingWorkoutId) {
    tx.respondTo("SELECT id FROM workouts WHERE user_id", [{ id: existingWorkoutId }]);
  }

  const db = {
    writeTransaction: vi.fn(async (fn: TxFn) => {
      await fn(tx);
    }),
  };
  return { db, tx };
}

const USER_ID = "user-abc";

// ── startEmptyWorkoutAtomic ────────────────────────────────────────────────

describe("startEmptyWorkoutAtomic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new workout row when no active workout exists", async () => {
    const { db, tx } = makeDb();
    const result = await startEmptyWorkoutAtomic(db as any, USER_ID);

    expect(result.workoutId).toBeTruthy();
    const insertCall = tx.calls.find(([sql]) => sql.includes("INSERT INTO workouts"));
    expect(insertCall).toBeTruthy();
    expect(insertCall![1][1]).toBe(USER_ID); // user_id param
  });

  it("throws DuplicateActiveWorkoutError with the existing id when active workout exists", async () => {
    const existingId = "existing-workout-id";
    const { db } = makeDb(existingId);

    let caughtError: unknown;
    try {
      await startEmptyWorkoutAtomic(db as any, USER_ID);
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeInstanceOf(DuplicateActiveWorkoutError);
    expect((caughtError as DuplicateActiveWorkoutError).existingWorkoutId).toBe(existingId);
  });

  it("DuplicateActiveWorkoutError has the correct name", async () => {
    const { db } = makeDb("existing-id");
    let caughtError: unknown;
    try {
      await startEmptyWorkoutAtomic(db as any, USER_ID);
    } catch (err) {
      caughtError = err;
    }
    expect((caughtError as Error).name).toBe("DuplicateActiveWorkoutError");
  });

  it("discards existing workout and creates new when discardExisting=true", async () => {
    const existingId = "old-workout-id";
    const { db, tx } = makeDb(existingId);

    const result = await startEmptyWorkoutAtomic(db as any, USER_ID, {
      discardExisting: true,
    });

    expect(result.workoutId).toBeTruthy();

    // Should have deleted sets, exercises, workout, then inserted new
    const deleteSetsSql = tx.calls.find(([sql]) =>
      sql.includes("DELETE FROM exercise_sets"),
    );
    const deleteExSql = tx.calls.find(([sql]) =>
      sql.includes("DELETE FROM workout_exercises"),
    );
    const deleteWoSql = tx.calls.find(([sql]) =>
      sql.includes("DELETE FROM workouts WHERE id"),
    );
    const insertSql = tx.calls.find(([sql]) =>
      sql.includes("INSERT INTO workouts"),
    );

    expect(deleteSetsSql).toBeTruthy();
    expect(deleteExSql).toBeTruthy();
    expect(deleteWoSql).toBeTruthy();
    expect(insertSql).toBeTruthy();

    // Discard should have used the existing id
    expect(deleteWoSql![1]).toContain(existingId);
  });

  it("all SQL runs inside a single writeTransaction (atomicity)", async () => {
    const { db } = makeDb();
    await startEmptyWorkoutAtomic(db as any, USER_ID);
    expect(db.writeTransaction).toHaveBeenCalledOnce();
  });

  it("rollback: if INSERT throws, writeTransaction propagates the error", async () => {
    const tx = new MockTx();
    const db = {
      writeTransaction: vi.fn(async (fn: TxFn) => {
        // Simulate DB error on INSERT
        const failTx = {
          calls: [] as Array<[string, unknown[]]>,
          async execute(sql: string, params: unknown[] = []) {
            if (sql.includes("INSERT INTO workouts")) {
              throw new Error("db locked");
            }
            return { rows: { _array: [] } };
          },
        };
        await fn(failTx as any);
      }),
    };
    await expect(startEmptyWorkoutAtomic(db as any, USER_ID)).rejects.toThrow("db locked");
  });

  it("multiple-incomplete: checks for any incomplete row (user_id scoped)", async () => {
    const { db, tx } = makeDb("oldest-incomplete");
    // respondTo already set by makeDb; call again to ensure it's primed
    tx.respondTo("SELECT id FROM workouts WHERE user_id", [{ id: "oldest-incomplete" }]);

    let caughtError: unknown;
    try {
      await startEmptyWorkoutAtomic(db as any, USER_ID);
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeInstanceOf(DuplicateActiveWorkoutError);
    expect((caughtError as DuplicateActiveWorkoutError).existingWorkoutId).toBe("oldest-incomplete");
  });
});

// ── startWorkoutFromTemplateAtomic ─────────────────────────────────────────

describe("startWorkoutFromTemplateAtomic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeTemplateDb(
    existingWorkoutId?: string,
    templateName = "Push Day",
    exercises: Array<{ id: string; exercise_id: string; order: number; notes: null }> = [],
    sets: Array<{ set_number: number; target_reps: number; target_weight_kg: number; type: string }> = [],
  ) {
    const tx = new MockTx();
    if (existingWorkoutId) {
      tx.respondTo("SELECT id FROM workouts WHERE user_id", [{ id: existingWorkoutId }]);
    }
    tx.respondTo("SELECT name FROM templates WHERE id", [{ name: templateName }]);
    tx.respondTo("SELECT id, exercise_id", exercises);
    tx.respondTo("SELECT set_number", sets);

    const db = {
      writeTransaction: vi.fn(async (fn: TxFn) => {
        await fn(tx);
      }),
    };
    return { db, tx };
  }

  const TEMPLATE_ID = "tmpl-001";

  it("creates workout + exercises + sets in one transaction", async () => {
    const exercises = [
      { id: "te-1", exercise_id: "ex-bench", order: 1, notes: null },
    ];
    const sets = [
      { set_number: 1, target_reps: 8, target_weight_kg: 80, type: "working" },
      { set_number: 2, target_reps: 8, target_weight_kg: 80, type: "working" },
    ];
    const { db, tx } = makeTemplateDb(undefined, "Push Day", exercises, sets);

    const result = await startWorkoutFromTemplateAtomic(db as any, USER_ID, TEMPLATE_ID);

    expect(result.workoutId).toBeTruthy();
    expect(db.writeTransaction).toHaveBeenCalledOnce();

    const workoutInsert = tx.calls.find(([sql]) =>
      sql.includes("INSERT INTO workouts"),
    );
    expect(workoutInsert).toBeTruthy();
    expect(workoutInsert![1]).toContain(TEMPLATE_ID);

    const exerciseInserts = tx.calls.filter(([sql]) =>
      sql.includes("INSERT INTO workout_exercises"),
    );
    expect(exerciseInserts).toHaveLength(1);

    const setInserts = tx.calls.filter(([sql]) =>
      sql.includes("INSERT INTO exercise_sets"),
    );
    expect(setInserts).toHaveLength(2);
  });

  it("throws DuplicateActiveWorkoutError when an active workout exists", async () => {
    const { db } = makeTemplateDb("existing-workout");

    let caughtError: unknown;
    try {
      await startWorkoutFromTemplateAtomic(db as any, USER_ID, TEMPLATE_ID);
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeInstanceOf(DuplicateActiveWorkoutError);
  });

  it("discards existing and creates from template when discardExisting=true", async () => {
    const { db, tx } = makeTemplateDb("existing-workout", "Push Day");
    tx.respondTo("SELECT id FROM workouts WHERE user_id", [{ id: "existing-workout" }]);

    const result = await startWorkoutFromTemplateAtomic(
      db as any,
      USER_ID,
      TEMPLATE_ID,
      { discardExisting: true },
    );

    expect(result.workoutId).toBeTruthy();
    const deleteSql = tx.calls.find(([sql]) =>
      sql.includes("DELETE FROM workouts WHERE id"),
    );
    expect(deleteSql).toBeTruthy();
  });

  it("partial failure rolls back all — writeTransaction propagates error", async () => {
    let callCount = 0;
    const db = {
      writeTransaction: vi.fn(async (fn: TxFn) => {
        const failTx = {
          async execute(sql: string, params: unknown[] = []) {
            callCount++;
            if (sql.includes("INSERT INTO workout_exercises")) {
              throw new Error("FK constraint");
            }
            if (sql.includes("SELECT name FROM templates")) {
              return { rows: { _array: [{ name: "Push Day" }] } };
            }
            if (sql.includes("SELECT id, exercise_id")) {
              return {
                rows: {
                  _array: [{ id: "te-1", exercise_id: "ex-1", order: 1, notes: null }],
                },
              };
            }
            return { rows: { _array: [] } };
          },
        };
        await fn(failTx as any);
      }),
    };

    await expect(
      startWorkoutFromTemplateAtomic(db as any, USER_ID, TEMPLATE_ID),
    ).rejects.toThrow("FK constraint");
  });

  it("creates workout with template_id in INSERT", async () => {
    const { db, tx } = makeTemplateDb();

    await startWorkoutFromTemplateAtomic(db as any, USER_ID, TEMPLATE_ID);

    const workoutInsert = tx.calls.find(([sql]) =>
      sql.includes("INSERT INTO workouts"),
    );
    expect(workoutInsert![1]).toContain(TEMPLATE_ID);
  });

  it("uses template name for workout name", async () => {
    const { db, tx } = makeTemplateDb(undefined, "Leg Hypertrophy");

    await startWorkoutFromTemplateAtomic(db as any, USER_ID, TEMPLATE_ID);

    const workoutInsert = tx.calls.find(([sql]) =>
      sql.includes("INSERT INTO workouts"),
    );
    expect(workoutInsert![1]).toContain("Leg Hypertrophy");
  });
});

// ── DuplicateActiveWorkoutError ─────────────────────────────────────────────

describe("DuplicateActiveWorkoutError", () => {
  it("is instanceof Error", () => {
    const err = new DuplicateActiveWorkoutError("w-123");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name DuplicateActiveWorkoutError", () => {
    const err = new DuplicateActiveWorkoutError("w-123");
    expect(err.name).toBe("DuplicateActiveWorkoutError");
  });

  it("exposes existingWorkoutId", () => {
    const err = new DuplicateActiveWorkoutError("w-xyz");
    expect(err.existingWorkoutId).toBe("w-xyz");
  });

  it("message includes the existing id", () => {
    const err = new DuplicateActiveWorkoutError("w-abc");
    expect(err.message).toContain("w-abc");
  });
});
