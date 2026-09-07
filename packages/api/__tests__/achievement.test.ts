import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { achievementRouter, checkAndUnlock } from "../src/routers/achievement";

const db = new PrismaClient();
const createCaller = createCallerFactory(achievementRouter);

function achievementCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let user: ReturnType<typeof createTestUser>;
let otherExercise: { id: string };

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await cleanupTestData(db);
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  user = createTestUser({ email: "achiever@test.com" });

  await db.user.create({
    data: { id: user.id, email: user.email, name: "Achiever" },
  });
  otherExercise = await db.exercise.create({
    data: { name: "Bench Press" },
  });
});

async function completeWorkout(userId: string, when: Date) {
  return db.workout.create({
    data: { userId, startedAt: when, completedAt: when },
  });
}

describe("checkAndUnlock", () => {
  it("unlocks first_workout after a single completed workout", async () => {
    await completeWorkout(user.id, new Date());

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("first_workout");

    const stored = await db.achievement.findMany({ where: { userId: user.id } });
    expect(stored.map((a) => a.type)).toContain("first_workout");
  });

  it("is idempotent — calling twice never double-awards a badge", async () => {
    await completeWorkout(user.id, new Date());

    const first = await checkAndUnlock(db, user.id);
    expect(first).toContain("first_workout");

    const second = await checkAndUnlock(db, user.id);
    expect(second).not.toContain("first_workout");

    const stored = await db.achievement.findMany({
      where: { userId: user.id, type: "first_workout" },
    });
    expect(stored).toHaveLength(1);
  });

  it("unlocks workouts_10 once ten workouts are completed", async () => {
    for (let i = 0; i < 10; i++) {
      await completeWorkout(user.id, new Date(Date.now() - i * 86_400_000));
    }

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("first_workout");
    expect(unlocked).toContain("workouts_10");
  });

  it("does not unlock workouts_10 with only 9 completed workouts", async () => {
    for (let i = 0; i < 9; i++) {
      await completeWorkout(user.id, new Date(Date.now() - i * 86_400_000));
    }

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).not.toContain("workouts_10");
  });

  it("unlocks streak_7 for seven consecutive daily workouts", async () => {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - i);
      await completeWorkout(user.id, day);
    }

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("streak_7");
  });

  it("does not unlock streak_7 when workouts have a gap", async () => {
    const today = new Date();
    const offsets = [0, 1, 2, 3, 5, 6, 7]; // gap at day 4 breaks the streak at length 4
    for (const offset of offsets) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - offset);
      await completeWorkout(user.id, day);
    }

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).not.toContain("streak_7");
  });

  it("unlocks pr_count_10 after ten personal records", async () => {
    for (let i = 0; i < 10; i++) {
      await db.personalRecord.create({
        data: {
          userId: user.id,
          exerciseId: otherExercise.id,
          type: "1rm",
          value: 100 + i,
          achievedAt: new Date(),
        },
      });
    }

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("pr_count_10");
  });

  it("unlocks volume_10k_kg once total logged volume crosses 10,000kg", async () => {
    const workout = await completeWorkout(user.id, new Date());
    const we = await db.workoutExercise.create({
      data: { workoutId: workout.id, exerciseId: otherExercise.id, order: 0 },
    });
    await db.exerciseSet.create({
      data: {
        workoutExerciseId: we.id,
        setNumber: 1,
        weightKg: 200,
        reps: 51, // 200 * 51 = 10,200kg
        completed: true,
      },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("volume_10k_kg");
  });

  it("does not count incomplete sets toward volume_10k_kg", async () => {
    const workout = await completeWorkout(user.id, new Date());
    const we = await db.workoutExercise.create({
      data: { workoutId: workout.id, exerciseId: otherExercise.id, order: 0 },
    });
    await db.exerciseSet.create({
      data: {
        workoutExerciseId: we.id,
        setNumber: 1,
        weightKg: 200,
        reps: 51,
        completed: false,
      },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).not.toContain("volume_10k_kg");
  });

  it("unlocks first_cardio, cardio_total_10km on a single 10km+ session", async () => {
    await db.cardioSession.create({
      data: {
        userId: user.id,
        type: "run",
        startedAt: new Date(),
        durationSeconds: 3600,
        distanceMeters: 10_500,
      },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("first_cardio");
    expect(unlocked).toContain("cardio_total_10km");
    expect(unlocked).not.toContain("cardio_marathon");
  });

  it("unlocks cardio_marathon on a single marathon-distance session", async () => {
    await db.cardioSession.create({
      data: {
        userId: user.id,
        type: "run",
        startedAt: new Date(),
        durationSeconds: 14_000,
        distanceMeters: 42_300,
      },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("cardio_marathon");
  });

  it("unlocks first_follow after following another athlete", async () => {
    const other = await db.user.create({
      data: { email: "followed@test.com", name: "Followed" },
    });
    await db.follow.create({
      data: { followerId: user.id, followingId: other.id },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("first_follow");
  });

  it("unlocks first_goal_complete after completing a goal", async () => {
    await db.goal.create({
      data: {
        userId: user.id,
        type: "body_weight",
        title: "Hit target weight",
        targetValue: 75,
        unit: "kg",
        status: "completed",
        completedAt: new Date(),
      },
    });

    const unlocked = await checkAndUnlock(db, user.id);

    expect(unlocked).toContain("first_goal_complete");
  });

  it("enqueues a deduped notification for each newly unlocked badge", async () => {
    await completeWorkout(user.id, new Date());

    await checkAndUnlock(db, user.id);
    await checkAndUnlock(db, user.id);

    const outboxRows = await db.notificationOutbox.findMany({
      where: { dedupeKey: `achievement:${user.id}:first_workout` },
    });
    expect(outboxRows).toHaveLength(1);
  });
});

describe("achievement.list", () => {
  it("returns only the calling user's unlocked badges", async () => {
    const other = await db.user.create({
      data: { email: "other@test.com", name: "Other" },
    });
    await completeWorkout(user.id, new Date());
    await checkAndUnlock(db, user.id);

    // Other user unlocks a second badge too, so a scoping bug (missing the
    // userId filter) would surface as an extra badge or a count mismatch.
    // Spaced two days apart so no streak badge unlocks alongside it.
    for (let i = 0; i < 10; i++) {
      await completeWorkout(other.id, new Date(Date.now() - i * 2 * 86_400_000));
    }
    await checkAndUnlock(db, other.id);

    const caller = achievementCaller({ user });
    const result = await caller.list();

    expect(result.achievements).toHaveLength(1);
    expect(result.achievements[0]!.type).toBe("first_workout");

    const otherCaller = achievementCaller({ user: { ...user, id: other.id } as any });
    const otherResult = await otherCaller.list();

    expect(otherResult.achievements).toHaveLength(2);
    expect(otherResult.achievements.map((a) => a.type).sort()).toEqual(
      ["first_workout", "workouts_10"].sort()
    );
  });

  it("returns an empty list for a user with no achievements", async () => {
    const caller = achievementCaller({ user });
    const result = await caller.list();
    expect(result.achievements).toEqual([]);
  });
});

describe("achievement.checkMine", () => {
  it("unlocks and returns newly-unlocked badges in one round trip", async () => {
    await completeWorkout(user.id, new Date());

    const caller = achievementCaller({ user });
    const result = await caller.checkMine();

    expect(result.newlyUnlocked).toContain("first_workout");
    expect(result.achievements.map((a) => a.type)).toContain("first_workout");
  });

  it("returns no newly-unlocked badges on a second call", async () => {
    await completeWorkout(user.id, new Date());

    const caller = achievementCaller({ user });
    await caller.checkMine();
    const second = await caller.checkMine();

    expect(second.newlyUnlocked).toEqual([]);
  });
});
