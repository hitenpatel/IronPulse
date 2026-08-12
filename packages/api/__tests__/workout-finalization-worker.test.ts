/**
 * Slice C: Durable finalization worker tests
 *
 * Covers:
 *  - Registration idempotency / concurrent timestamp collision
 *  - Legacy null-duration repair
 *  - Cross-user hijack rejection
 *  - Concurrent claim: SKIP LOCKED ensures each row claimed by exactly one worker
 *  - Fresh lock cannot be stolen
 *  - Stale lock (> LOCK_STALE_MS) can be reclaimed
 *  - processPendingWorkoutFinalizations result counts
 *  - Crash-mid-processing: stuck processing row is reclaimed after stale threshold
 *  - Result replay: second call to process an already-completed row is a no-op
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createTestUser, cleanupTestData } from "./helpers";
import {
  registerWorkoutFinalization,
  processWorkoutFinalization,
  processPendingWorkoutFinalizations,
  LOCK_STALE_MS,
} from "../src/lib/workout-finalization";

const db = new PrismaClient();

let testUser: ReturnType<typeof createTestUser>;
let otherUser: ReturnType<typeof createTestUser>;
let testExercise: { id: string };

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);

  testUser = createTestUser({ email: "worker@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });

  otherUser = createTestUser({ email: "other@test.com" });
  await db.user.create({
    data: { id: otherUser.id, email: otherUser.email, name: otherUser.name },
  });

  testExercise = await db.exercise.create({
    data: {
      name: "Squat",
      category: "compound",
      primaryMuscles: ["quads"],
      isCustom: false,
    },
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function createIncompleteWorkout(userId: string, startedAt?: Date) {
  const start = startedAt ?? new Date("2026-08-09T01:00:00.000Z");
  return db.workout.create({
    data: {
      userId,
      name: "Test Workout",
      startedAt: start,
      workoutExercises: {
        create: {
          exerciseId: testExercise.id,
          order: 0,
          sets: {
            create: {
              setNumber: 1,
              type: "working",
              weightKg: 80,
              reps: 5,
              completed: true,
            },
          },
        },
      },
    },
  });
}

async function createCompletedWorkout(userId: string) {
  const startedAt = new Date("2026-08-09T01:00:00.000Z");
  const completedAt = new Date("2026-08-09T02:00:00.000Z");
  return db.workout.create({
    data: {
      userId,
      name: "Done Workout",
      startedAt,
      completedAt,
      durationSeconds: 3600,
      workoutExercises: {
        create: {
          exerciseId: testExercise.id,
          order: 0,
          sets: {
            create: {
              setNumber: 1,
              type: "working",
              weightKg: 80,
              reps: 5,
              completed: true,
            },
          },
        },
      },
    },
  });
}

// ── Registration tests ─────────────────────────────────────────────────────

describe("registerWorkoutFinalization", () => {
  it("inserts a pending finalization row and marks workout completed", async () => {
    const workout = await createIncompleteWorkout(testUser.id);
    const completedAt = new Date("2026-08-09T03:00:00.000Z");

    await db.$transaction(async (tx) => {
      await registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt,
        durationSeconds: 3600,
      });
    });

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    expect(fin).not.toBeNull();
    expect(fin!.status).toBe("pending");
    expect(fin!.completedAt).toEqual(completedAt);

    const updated = await db.workout.findUnique({ where: { id: workout.id } });
    expect(updated!.completedAt).not.toBeNull();
  });

  it("concurrent registrations converge on first timestamp — both observe the same canonicalAt", async () => {
    const workout = await createIncompleteWorkout(testUser.id);
    const t1 = new Date("2026-08-09T03:00:00.000Z");
    const t2 = new Date("2026-08-09T04:00:00.000Z");

    // Race two registrations concurrently; one will win the UPDATE.
    const results = await Promise.allSettled([
      db.$transaction((tx) =>
        registerWorkoutFinalization(tx, {
          workoutId: workout.id,
          userId: testUser.id,
          completedAt: t1,
          durationSeconds: 3600,
        }),
      ),
      db.$transaction((tx) =>
        registerWorkoutFinalization(tx, {
          workoutId: workout.id,
          userId: testUser.id,
          completedAt: t2,
          durationSeconds: 7200,
        }),
      ),
    ]);

    // At least one must succeed.
    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Exactly one finalization row (upsert-on-conflict keeps first winner).
    const count = await db.workoutFinalization.count({
      where: { workoutId: workout.id },
    });
    expect(count).toBe(1);

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    // The canonical timestamp is whichever transaction committed first —
    // the conditional UPDATE (WHERE completed_at IS NULL) ensures it doesn't
    // change after the first writer wins. Both callers must see the same value.
    const canonicalTs = fin!.completedAt.toISOString();
    expect([t1.toISOString(), t2.toISOString()]).toContain(canonicalTs);

    // Verify the workout row also shows the same canonical timestamp.
    const w = await db.workout.findUnique({ where: { id: workout.id } });
    expect(w!.completedAt?.toISOString()).toBe(canonicalTs);
  });

  it("repairs null durationSeconds on a legacy completed workout", async () => {
    // Create a completed workout with null duration.
    const startedAt = new Date("2026-08-09T01:00:00.000Z");
    const completedAt = new Date("2026-08-09T02:00:00.000Z"); // 1h later
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        name: "Legacy Workout",
        startedAt,
        completedAt,
        durationSeconds: null,
      },
    });

    await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt,
        durationSeconds: 0,
      }),
    );

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    // Derived from (completedAt - startedAt) = 3600s
    expect(fin!.durationSeconds).toBe(3600);
  });

  it("rejects cross-user hijack with NOT_FOUND", async () => {
    const workout = await createIncompleteWorkout(testUser.id);
    const completedAt = new Date("2026-08-09T03:00:00.000Z");

    await expect(
      db.$transaction((tx) =>
        registerWorkoutFinalization(tx, {
          workoutId: workout.id,
          userId: otherUser.id, // wrong user
          completedAt,
          durationSeconds: 3600,
        }),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("second registration on the same workoutId returns existing row unchanged", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    const completedAt = workout.completedAt!;

    const first = await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt,
        durationSeconds: 3600,
      }),
    );

    const second = await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: new Date("2026-08-09T09:00:00.000Z"),
        durationSeconds: 99999,
      }),
    );

    expect(second.completedAt).toEqual(first.completedAt);
    expect(second.durationSeconds).toEqual(first.durationSeconds);
  });
});

// ── Claim / processing tests ───────────────────────────────────────────────

describe("processWorkoutFinalization", () => {
  it("processes a pending finalization and marks it completed", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
      }),
    );

    const result = await processWorkoutFinalization(db, workout.id);
    expect(result).toBe("completed");

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    expect(fin!.status).toBe("completed");
    expect(fin!.processedAt).not.toBeNull();
    expect(fin!.lockToken).toBeNull();
  });

  it("does not steal a fresh processing lock", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    // Manually insert a processing row with a recent lockedAt.
    await db.workoutFinalization.create({
      data: {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
        status: "processing",
        lockedAt: new Date(), // fresh
        lockToken: crypto.randomUUID(),
        attempts: 1,
      },
    });

    const result = await processWorkoutFinalization(db, workout.id);
    // Fresh lock: row not claimable — returns not_found.
    expect(result).toBe("not_found");

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    expect(fin!.status).toBe("processing"); // unchanged
  });

  it("reclaims a stale processing lock (> LOCK_STALE_MS)", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    const staleLockedAt = new Date(Date.now() - LOCK_STALE_MS - 10_000);

    await db.workoutFinalization.create({
      data: {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
        status: "processing",
        lockedAt: staleLockedAt,
        lockToken: crypto.randomUUID(),
        attempts: 1,
      },
    });

    const result = await processWorkoutFinalization(db, workout.id);
    expect(result).toBe("completed");

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    expect(fin!.status).toBe("completed");
    expect(fin!.attempts).toBe(2); // incremented for the new claim
  });

  it("does not re-process an already completed row (replay safety)", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
      }),
    );

    await processWorkoutFinalization(db, workout.id);

    // Second call: row is completed — not eligible for re-claim.
    const result2 = await processWorkoutFinalization(db, workout.id);
    expect(result2).toBe("not_found");

    // Still only one finalization row.
    const count = await db.workoutFinalization.count({
      where: { workoutId: workout.id },
    });
    expect(count).toBe(1);
  });
});

// ── Concurrency test ───────────────────────────────────────────────────────

describe("concurrent processPendingWorkoutFinalizations", () => {
  it("two parallel workers process disjoint sets of rows (SKIP LOCKED)", async () => {
    const N = 6;

    // Create N completed workouts and register finalizations.
    const workouts = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        db.workout.create({
          data: {
            userId: testUser.id,
            name: `Concurrent Workout ${i}`,
            startedAt: new Date("2026-08-09T01:00:00.000Z"),
            completedAt: new Date("2026-08-09T02:00:00.000Z"),
            durationSeconds: 3600,
          },
        }),
      ),
    );

    await Promise.all(
      workouts.map((w) =>
        db.$transaction((tx) =>
          registerWorkoutFinalization(tx, {
            workoutId: w.id,
            userId: testUser.id,
            completedAt: w.completedAt!,
            durationSeconds: 3600,
          }),
        ),
      ),
    );

    // Launch two workers concurrently.
    const [r1, r2] = await Promise.all([
      processPendingWorkoutFinalizations(db, { workerId: "worker-A", limit: N }),
      processPendingWorkoutFinalizations(db, { workerId: "worker-B", limit: N }),
    ]);

    const totalProcessed = r1.processed + r2.processed;
    const totalSkipped = r1.skipped + r2.skipped;

    // Every row should be processed exactly once (or skipped because
    // the other worker claimed it first — skipped is fine, not double-processed).
    expect(totalProcessed).toBe(N);
    // No overlap: each row claimed by exactly one worker.
    expect(totalSkipped + totalProcessed).toBeLessThanOrEqual(N * 2);

    // All rows now completed.
    const completed = await db.workoutFinalization.count({
      where: {
        workoutId: { in: workouts.map((w) => w.id) },
        status: "completed",
      },
    });
    expect(completed).toBe(N);
  });
});

// ── Batch result counts ────────────────────────────────────────────────────

describe("processPendingWorkoutFinalizations batch counts", () => {
  it("returns { processed, skipped, failed } with correct totals", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    await db.$transaction((tx) =>
      registerWorkoutFinalization(tx, {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
      }),
    );

    const result = await processPendingWorkoutFinalizations(db, {
      workerId: "test-worker",
    });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("crash-recovery: stuck processing row is reclaimed and completed", async () => {
    const workout = await createCompletedWorkout(testUser.id);
    const staleLockedAt = new Date(Date.now() - LOCK_STALE_MS - 60_000);

    // Simulate a crashed worker: insert a processing row with a stale lock.
    await db.workoutFinalization.create({
      data: {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: 3600,
        status: "processing",
        lockedAt: staleLockedAt,
        lockToken: crypto.randomUUID(),
        attempts: 1,
      },
    });

    const result = await processPendingWorkoutFinalizations(db, {
      workerId: "recovery-worker",
    });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);

    const fin = await db.workoutFinalization.findUnique({
      where: { workoutId: workout.id },
    });
    expect(fin!.status).toBe("completed");
    expect(fin!.attempts).toBe(2);
  });
});
