import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createTestUser, cleanupTestData } from "./helpers";

const db = new PrismaClient();

let testUser: ReturnType<typeof createTestUser>;
let testExercise: { id: string };

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "finalization@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
  testExercise = await db.exercise.create({
    data: {
      name: "Bench Press",
      category: "compound",
      primaryMuscles: ["chest"],
      isCustom: false,
    },
  });
});

async function createCompletedWorkout() {
  const startedAt = new Date("2026-08-09T02:00:00.000Z");
  const completedAt = new Date("2026-08-09T03:00:00.000Z");
  return db.workout.create({
    data: {
      userId: testUser.id,
      name: "Finalization fixture",
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
              weightKg: 100,
              reps: 5,
              completed: true,
            },
          },
        },
      },
    },
  });
}

describe("WorkoutFinalization model", () => {
  it("allows one durable finalization record per workout", async () => {
    const workout = await createCompletedWorkout();
    const data = {
      workoutId: workout.id,
      userId: testUser.id,
      completedAt: workout.completedAt!,
      durationSeconds: workout.durationSeconds!,
    };
    await db.workoutFinalization.create({ data });
    await expect(db.workoutFinalization.create({ data })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("round-trips a workoutFinalization row", async () => {
    const workout = await createCompletedWorkout();
    const record = await db.workoutFinalization.create({
      data: {
        workoutId: workout.id,
        userId: testUser.id,
        completedAt: workout.completedAt!,
        durationSeconds: workout.durationSeconds!,
      },
    });
    expect(record.workoutId).toBe(workout.id);
    expect(record.status).toBe("pending");
    expect(record.attempts).toBe(0);
  });
});

describe("NotificationOutbox model", () => {
  it("round-trips a notificationOutbox row", async () => {
    const record = await db.notificationOutbox.create({
      data: {
        dedupeKey: `workout-complete:${crypto.randomUUID()}`,
        userId: testUser.id,
        type: "workout_complete",
        title: "Workout done!",
      },
    });
    expect(record.id).toBeDefined();
    expect(record.status).toBe("pending");
    expect(record.attempts).toBe(0);
  });

  it("enforces unique dedupeKey on notificationOutbox", async () => {
    const dedupeKey = `workout-complete:${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        dedupeKey,
        userId: testUser.id,
        type: "workout_complete",
        title: "Workout done!",
      },
    });
    await expect(
      db.notificationOutbox.create({
        data: {
          dedupeKey,
          userId: testUser.id,
          type: "workout_complete",
          title: "Workout done again!",
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
