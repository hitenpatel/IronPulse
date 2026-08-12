import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("active workout screen — no direct completion RPC", () => {
  const source = readFileSync(
    join(__dirname, "..", "..", "app", "workout", "active.tsx"),
    "utf8",
  );

  it("does not call trpc.workout.complete", () => {
    expect(source).not.toMatch(/workout\.complete\.mutate/);
    expect(source).not.toMatch(/workout\.complete\.useMutation/);
  });

  it("does not use a requestWorkoutCompletion helper", () => {
    expect(source).not.toMatch(/requestWorkoutCompletion/);
  });

  it("does not serialize prs into WorkoutComplete navigation params", () => {
    expect(source).not.toMatch(/prs:\s*JSON\.stringify/);
  });
});
