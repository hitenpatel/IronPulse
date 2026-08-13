import { describe, expect, it, vi } from "vitest";
import {
  renameWorkout,
  discardWorkout,
  type SimpleDb,
} from "../workout-session-repository";

function makeDb() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const db: SimpleDb = { execute };
  return { db, execute };
}

const WORKOUT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("renameWorkout", () => {
  it("issues the correct UPDATE with name and id params", async () => {
    const { db, execute } = makeDb();
    await renameWorkout(db, WORKOUT_ID, "Leg Day");
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      "UPDATE workouts SET name = ? WHERE id = ?",
      ["Leg Day", WORKOUT_ID],
    );
  });

  it("propagates db errors", async () => {
    const db: SimpleDb = {
      execute: vi.fn().mockRejectedValue(new Error("db error")),
    };
    await expect(renameWorkout(db, WORKOUT_ID, "Fail")).rejects.toThrow("db error");
  });
});

describe("discardWorkout", () => {
  it("deletes in order: sets → exercises → workout", async () => {
    const { db, execute } = makeDb();
    await discardWorkout(db, WORKOUT_ID);

    expect(execute).toHaveBeenCalledTimes(3);

    // First call: delete sets
    const [sql0, params0] = execute.mock.calls[0];
    expect(sql0).toMatch(/DELETE FROM exercise_sets/);
    expect(sql0).toMatch(/workout_exercise_id IN/);
    expect(params0).toEqual([WORKOUT_ID]);

    // Second call: delete exercises
    const [sql1, params1] = execute.mock.calls[1];
    expect(sql1).toMatch(/DELETE FROM workout_exercises WHERE workout_id = \?/);
    expect(params1).toEqual([WORKOUT_ID]);

    // Third call: delete workout row
    const [sql2, params2] = execute.mock.calls[2];
    expect(sql2).toMatch(/DELETE FROM workouts WHERE id = \?/);
    expect(params2).toEqual([WORKOUT_ID]);
  });

  it("does not reorder deletes even when a set delete throws", async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error("sets locked"));
    const db: SimpleDb = { execute };
    await expect(discardWorkout(db, WORKOUT_ID)).rejects.toThrow("sets locked");
    // Only one call made — did not proceed to exercises or workout
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
