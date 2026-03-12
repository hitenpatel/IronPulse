import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { workoutRouter } from "../src/routers/workout";

const db = new PrismaClient();
const createCaller = createCallerFactory(workoutRouter);

function workoutCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let testExerciseId: string;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  // Create a test user and exercise for all tests
  testUser = createTestUser({ email: "workout@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
  const ex = await db.exercise.create({
    data: {
      name: "Test Bench Press",
      category: "compound",
      primaryMuscles: ["chest"],
      isCustom: false,
    },
  });
  testExerciseId = ex.id;
});

describe("workout.create", () => {
  it("creates a new workout", async () => {
    const caller = workoutCaller({ user: testUser });
    const result = await caller.create({ name: "Push Day" });

    expect(result.workout.name).toBe("Push Day");
    expect(result.workout.userId).toBe(testUser.id);
    expect(result.workout.completedAt).toBeNull();
  });

  it("creates workout from template", async () => {
    // Create a template with exercises
    const template = await db.workoutTemplate.create({
      data: {
        userId: testUser.id,
        name: "Push Template",
        templateExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            templateSets: {
              create: [
                { setNumber: 1, targetReps: 10, targetWeightKg: 60, type: "working" },
                { setNumber: 2, targetReps: 8, targetWeightKg: 65, type: "working" },
              ],
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.create({ templateId: template.id });

    // Verify workout has copied exercises and sets
    const workout = await db.workout.findUnique({
      where: { id: result.workout.id },
      include: { workoutExercises: { include: { sets: true } } },
    });

    expect(workout!.workoutExercises.length).toBe(1);
    expect(workout!.workoutExercises[0]!.sets.length).toBe(2);
    expect(Number(workout!.workoutExercises[0]!.sets[0]!.weightKg)).toBe(60);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = workoutCaller();
    await expect(caller.create({})).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("workout.getById", () => {
  it("returns workout with exercises and sets", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        name: "Test Workout",
        startedAt: new Date(),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 60, reps: 10, type: "working" },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.getById({ workoutId: workout.id });

    expect(result.workout.name).toBe("Test Workout");
    expect(result.workout.workoutExercises.length).toBe(1);
    expect(result.workout.workoutExercises[0]!.sets.length).toBe(1);
  });

  it("rejects access to another user's workout", async () => {
    const otherUser = createTestUser({ email: "other@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    const workout = await db.workout.create({
      data: { userId: otherUser.id, name: "Other's Workout", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    await expect(caller.getById({ workoutId: workout.id })).rejects.toThrow();
  });
});

describe("workout.list", () => {
  it("returns paginated workout history", async () => {
    for (let i = 0; i < 3; i++) {
      await db.workout.create({
        data: {
          userId: testUser.id,
          name: `Workout ${i}`,
          startedAt: new Date(2026, 0, i + 1),
          completedAt: new Date(2026, 0, i + 1),
          durationSeconds: 3600,
          workoutExercises: {
            create: {
              exerciseId: testExerciseId,
              order: 0,
              sets: {
                create: { setNumber: 1, weightKg: 60, reps: 10, type: "working", completed: true },
              },
            },
          },
        },
      });
    }

    const caller = workoutCaller({ user: testUser });
    const result = await caller.list({ limit: 2 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeTruthy();
  });

  it("only returns current user's workouts", async () => {
    const otherUser = createTestUser({ email: "other2@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    await db.workout.create({
      data: { userId: otherUser.id, name: "Other's", startedAt: new Date() },
    });
    await db.workout.create({
      data: { userId: testUser.id, name: "Mine", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.list({});

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Mine");
  });
});

describe("workout.update", () => {
  it("updates workout metadata", async () => {
    const workout = await db.workout.create({
      data: { userId: testUser.id, name: "Old Name", startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.update({
      workoutId: workout.id,
      name: "New Name",
      notes: "Great workout",
    });

    expect(result.workout.name).toBe("New Name");
    expect(result.workout.notes).toBe("Great workout");
  });
});

describe("workout.addExercise", () => {
  it("appends an exercise to the workout", async () => {
    const workout = await db.workout.create({
      data: { userId: testUser.id, startedAt: new Date() },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.addExercise({
      workoutId: workout.id,
      exerciseId: testExerciseId,
    });

    expect(result.workoutExercise.exerciseId).toBe(testExerciseId);
    expect(result.workoutExercise.order).toBe(0);
  });
});

describe("workout.addSet / updateSet / deleteSet", () => {
  it("adds, updates, and deletes a set", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(),
        workoutExercises: {
          create: { exerciseId: testExerciseId, order: 0 },
        },
      },
      include: { workoutExercises: true },
    });
    const weId = workout.workoutExercises[0]!.id;

    const caller = workoutCaller({ user: testUser });

    // Add set
    const addResult = await caller.addSet({
      workoutExerciseId: weId,
      weight: 60,
      reps: 10,
    });
    expect(addResult.set.weightKg).toBeDefined();
    expect(addResult.set.reps).toBe(10);

    // Update set
    const updateResult = await caller.updateSet({
      setId: addResult.set.id,
      weight: 65,
      completed: true,
    });
    expect(Number(updateResult.set.weightKg)).toBe(65);
    expect(updateResult.set.completed).toBe(true);

    // Delete set
    await caller.deleteSet({ setId: addResult.set.id });
    const deleted = await db.exerciseSet.findUnique({
      where: { id: addResult.set.id },
    });
    expect(deleted).toBeNull();
  });
});

describe("workout.complete", () => {
  it("marks workout complete and detects PRs", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: [
                { setNumber: 1, weightKg: 100, reps: 5, type: "working", completed: true },
                { setNumber: 2, weightKg: 80, reps: 10, type: "working", completed: true },
              ],
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.complete({ workoutId: workout.id });

    expect(result.workout.completedAt).toBeDefined();
    expect(result.workout.durationSeconds).toBeGreaterThan(0);
    expect(result.newPRs.length).toBeGreaterThan(0);

    // Verify PRs in database
    const prs = await db.personalRecord.findMany({
      where: { userId: testUser.id, exerciseId: testExerciseId },
    });
    expect(prs.length).toBeGreaterThan(0);
  });

  it("does not create duplicate PRs on second completion", async () => {
    // First workout with PRs
    const w1 = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 7200_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 100, reps: 5, type: "working", completed: true },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    await caller.complete({ workoutId: w1.id });

    // Second workout with lower weight — should not create new PRs
    const w2 = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 80, reps: 5, type: "working", completed: true },
            },
          },
        },
      },
    });

    const result2 = await caller.complete({ workoutId: w2.id });
    expect(result2.newPRs.length).toBe(0);
  });

  it("skips bodyweight-only sets for PR detection", async () => {
    const workout = await db.workout.create({
      data: {
        userId: testUser.id,
        startedAt: new Date(Date.now() - 3600_000),
        workoutExercises: {
          create: {
            exerciseId: testExerciseId,
            order: 0,
            sets: {
              create: { setNumber: 1, weightKg: 0, reps: 20, type: "working", completed: true },
            },
          },
        },
      },
    });

    const caller = workoutCaller({ user: testUser });
    const result = await caller.complete({ workoutId: workout.id });
    expect(result.newPRs.length).toBe(0);
  });
});
