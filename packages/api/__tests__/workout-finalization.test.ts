import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createTestUser, cleanupTestData } from "./helpers";
import { detectPRs } from "../src/lib/pr-detection";
import { createFeedItem } from "../src/lib/feed";
import { enqueueNotification } from "../src/lib/notifications";
import { checkAndUnlock } from "../src/routers/achievement";

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

describe("Side-effect idempotency", () => {
  it("PR detection twice yields one 1rm and one volume row for the fixture set", async () => {
    const workout = await createCompletedWorkout();
    const completedAt = workout.completedAt!;

    // Fetch the set id created by the fixture
    const we = await db.workoutExercise.findFirst({ where: { workoutId: workout.id }, select: { sets: { select: { id: true } } } });
    const setId = we!.sets[0]!.id;

    await detectPRs(db, testUser.id, workout.id, completedAt);
    await detectPRs(db, testUser.id, workout.id, completedAt);

    expect(
      await db.personalRecord.count({
        where: { setId, type: { in: ["1rm", "volume"] } },
      })
    ).toBe(2);
  });

  it("createFeedItem twice yields one row for (userId, workout, workoutId)", async () => {
    const workout = await createCompletedWorkout();

    await createFeedItem(db, testUser.id, "workout", workout.id);
    await createFeedItem(db, testUser.id, "workout", workout.id);

    expect(
      await db.activityFeedItem.count({
        where: { userId: testUser.id, type: "workout", referenceId: workout.id },
      })
    ).toBe(1);
  });

  it("enqueueNotification twice with same dedupeKey yields one outbox row", async () => {
    const workout = await createCompletedWorkout();
    const we = await db.workoutExercise.findFirst({ where: { workoutId: workout.id }, select: { sets: { select: { id: true } } } });
    const setId = we!.sets[0]!.id;

    const intent1rm = {
      dedupeKey: `workout:${workout.id}:pr:${setId}:1rm`,
      userId: testUser.id,
      type: "pr" as const,
      title: "New 1RM PR!",
      body: "Bench Press — 116.7kg",
    };
    const intentVol = {
      dedupeKey: `workout:${workout.id}:pr:${setId}:volume`,
      userId: testUser.id,
      type: "pr" as const,
      title: "New Volume PR!",
      body: "Bench Press — 500kg",
    };

    await enqueueNotification(db, intent1rm);
    await enqueueNotification(db, intent1rm);
    await enqueueNotification(db, intentVol);
    await enqueueNotification(db, intentVol);

    expect(
      await db.notificationOutbox.count({
        where: {
          dedupeKey: {
            in: [
              `workout:${workout.id}:pr:${setId}:1rm`,
              `workout:${workout.id}:pr:${setId}:volume`,
            ],
          },
        },
      })
    ).toBe(2);
  });

  it("checkAndUnlock twice yields one first_workout achievement and one outbox row", async () => {
    await createCompletedWorkout();

    await checkAndUnlock(db, testUser.id);
    await checkAndUnlock(db, testUser.id);

    expect(
      await db.achievement.count({
        where: { userId: testUser.id, type: "first_workout" },
      })
    ).toBe(1);

    expect(
      await db.notificationOutbox.count({
        where: {
          dedupeKey: `achievement:${testUser.id}:first_workout`,
        },
      })
    ).toBe(1);
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
