import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { exportRouter } from "../src/routers/export";

const db = new PrismaClient();
const createCaller = createCallerFactory(exportRouter);

function exportCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let user: ReturnType<typeof createTestUser>;
let otherUser: ReturnType<typeof createTestUser>;
let exercise: { id: string };

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await cleanupTestData(db);
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  user = createTestUser({ email: "exporter@test.com" });
  otherUser = createTestUser({ email: "other-exporter@test.com" });

  await db.user.create({ data: { id: user.id, email: user.email, name: "Exporter" } });
  await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: "Other Exporter" } });
  exercise = await db.exercise.create({ data: { name: "Squat" } });
});

async function seedWorkout(userId: string, name: string) {
  const workout = await db.workout.create({
    data: {
      userId,
      name,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      completedAt: new Date("2026-01-01T11:00:00Z"),
    },
  });
  const we = await db.workoutExercise.create({
    data: { workoutId: workout.id, exerciseId: exercise.id, order: 0 },
  });
  await db.exerciseSet.create({
    data: {
      workoutExerciseId: we.id,
      setNumber: 1,
      weightKg: 100,
      reps: 5,
      rpe: 8,
      completed: true,
    },
  });
  return workout;
}

describe("export.workouts", () => {
  it("returns a flattened CSV row per completed set", async () => {
    await seedWorkout(user.id, "Leg Day");

    const caller = exportCaller({ user });
    const result = await caller.workouts({ format: "csv" });

    expect(result.mimeType).toBe("text/csv");
    const lines = result.data.trim().split("\n");
    expect(lines).toHaveLength(2); // header + one set row
    expect(lines[0]).toContain("workout_id");
    expect(lines[0]).toContain("exercise");
    expect(lines[0]).toContain("weight_kg");
    expect(lines[1]).toContain("Squat");
    expect(lines[1]).toContain("100");
  });

  it("returns an empty CSV body (header only omitted) with no workouts", async () => {
    const caller = exportCaller({ user });
    const result = await caller.workouts({ format: "csv" });
    expect(result.data).toBe("");
  });

  it("returns valid JSON with full nested shape", async () => {
    const workout = await seedWorkout(user.id, "Push Day");

    const caller = exportCaller({ user });
    const result = await caller.workouts({ format: "json" });

    expect(result.mimeType).toBe("application/json");
    const parsed = JSON.parse(result.data);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(workout.id);
    expect(parsed[0].workoutExercises[0].exercise.name).toBe("Squat");
    expect(parsed[0].workoutExercises[0].sets[0].weightKg).toBe("100");
  });

  it("does not include another user's workouts", async () => {
    await seedWorkout(otherUser.id, "Not Mine");
    await seedWorkout(user.id, "Mine");

    const caller = exportCaller({ user });
    const jsonResult = await caller.workouts({ format: "json" });
    const parsed = JSON.parse(jsonResult.data);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Mine");

    const csvResult = await caller.workouts({ format: "csv" });
    expect(csvResult.data).not.toContain("Not Mine");
  });
});

describe("export.cardio", () => {
  async function seedCardio(userId: string, type: string) {
    return db.cardioSession.create({
      data: {
        userId,
        type,
        startedAt: new Date("2026-02-01T08:00:00Z"),
        durationSeconds: 1800,
        distanceMeters: 5000,
        avgHeartRate: 140,
      },
    });
  }

  it("returns a CSV row per session", async () => {
    await seedCardio(user.id, "run");

    const caller = exportCaller({ user });
    const result = await caller.cardio({ format: "csv" });

    const lines = result.data.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("distance_meters");
    expect(lines[1]).toContain("run");
    expect(lines[1]).toContain("5000");
  });

  it("returns JSON matching the raw session shape", async () => {
    const session = await seedCardio(user.id, "ride");

    const caller = exportCaller({ user });
    const result = await caller.cardio({ format: "json" });
    const parsed = JSON.parse(result.data);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(session.id);
    expect(parsed[0].type).toBe("ride");
  });

  it("does not include another user's cardio sessions", async () => {
    await seedCardio(otherUser.id, "swim");
    await seedCardio(user.id, "run");

    const caller = exportCaller({ user });
    const result = await caller.cardio({ format: "json" });
    const parsed = JSON.parse(result.data);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("run");
  });
});

describe("export.bodyMetrics", () => {
  async function seedMetric(userId: string, weightKg: number) {
    return db.bodyMetric.create({
      data: { userId, date: new Date("2026-03-01"), weightKg, bodyFatPct: 15 },
    });
  }

  it("returns a CSV row per metric", async () => {
    await seedMetric(user.id, 82.5);

    const caller = exportCaller({ user });
    const result = await caller.bodyMetrics({ format: "csv" });
    const lines = result.data.trim().split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("weight_kg");
    expect(lines[1]).toContain("82.5");
  });

  it("does not include another user's body metrics", async () => {
    await seedMetric(otherUser.id, 60);
    await seedMetric(user.id, 82.5);

    const caller = exportCaller({ user });
    const result = await caller.bodyMetrics({ format: "json" });
    const parsed = JSON.parse(result.data);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].weightKg).toBe("82.5");
  });
});

describe("export.allData", () => {
  it("bundles the caller's own records across domains", async () => {
    await seedWorkout(user.id, "GDPR Workout");
    await db.goal.create({
      data: {
        userId: user.id,
        type: "body_weight",
        title: "Lose weight",
        targetValue: 75,
        unit: "kg",
      },
    });

    const caller = exportCaller({ user });
    const result = await caller.allData();

    expect(result.mimeType).toBe("application/json");
    const parsed = JSON.parse(result.data);
    expect(parsed.userId).toBe(user.id);
    expect(parsed.profile.id).toBe(user.id);
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.goals).toHaveLength(1);
    expect(parsed.deviceConnections).toEqual([]);
  });

  it("includes the caller's injuries, recovery activities and restrictions", async () => {
    const injury = await db.injuryLog.create({
      data: {
        userId: user.id,
        injuredAt: new Date("2026-08-01"),
        injuryType: "strain",
        severity: 5,
        bodyParts: ["hamstrings"],
      },
    });
    await db.recoveryActivity.create({
      data: {
        userId: user.id,
        injuryId: injury.id,
        performedAt: new Date("2026-08-02"),
        modality: "ice",
      },
    });
    await db.exerciseRestriction.create({
      data: {
        userId: user.id,
        injuryId: injury.id,
        muscleGroups: ["hamstrings"],
        startsAt: new Date("2026-08-01"),
        expiresAt: new Date("2026-09-01"),
      },
    });

    const caller = exportCaller({ user });
    const result = await caller.allData();
    const parsed = JSON.parse(result.data);

    expect(parsed.injuryLogs).toHaveLength(1);
    expect(parsed.injuryLogs[0].id).toBe(injury.id);
    expect(parsed.recoveryActivities).toHaveLength(1);
    expect(parsed.recoveryActivities[0].injuryId).toBe(injury.id);
    expect(parsed.exerciseRestrictions).toHaveLength(1);
    expect(parsed.exerciseRestrictions[0].muscleGroups).toEqual(["hamstrings"]);
  });

  it("excludes another user's injuries, recovery activities and restrictions", async () => {
    const foreignInjury = await db.injuryLog.create({
      data: {
        userId: otherUser.id,
        injuredAt: new Date("2026-08-01"),
        injuryType: "impact",
        severity: 7,
        bodyParts: ["shoulder"],
      },
    });
    await db.recoveryActivity.create({
      data: {
        userId: otherUser.id,
        injuryId: foreignInjury.id,
        performedAt: new Date("2026-08-02"),
        modality: "rest_day",
      },
    });
    await db.exerciseRestriction.create({
      data: {
        userId: otherUser.id,
        injuryId: foreignInjury.id,
        muscleGroups: ["deltoids"],
        startsAt: new Date("2026-08-01"),
        expiresAt: new Date("2026-09-01"),
      },
    });

    const caller = exportCaller({ user });
    const result = await caller.allData();
    const parsed = JSON.parse(result.data);

    expect(parsed.injuryLogs).toHaveLength(0);
    expect(parsed.recoveryActivities).toHaveLength(0);
    expect(parsed.exerciseRestrictions).toHaveLength(0);
  });

  it("excludes another user's data from the archive", async () => {
    await seedWorkout(otherUser.id, "Not Mine");
    await db.goal.create({
      data: {
        userId: otherUser.id,
        type: "body_weight",
        title: "Not my goal",
        targetValue: 70,
        unit: "kg",
      },
    });
    await seedWorkout(user.id, "Mine");

    const caller = exportCaller({ user });
    const result = await caller.allData();
    const parsed = JSON.parse(result.data);

    expect(parsed.userId).toBe(user.id);
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.workouts[0].name).toBe("Mine");
    expect(parsed.goals).toHaveLength(0);
  });

  it("only resolves the caller's own coach profile, not another user's", async () => {
    await db.coachProfile.create({
      data: { userId: otherUser.id, bio: "Other's private bio" },
    });
    await db.coachProfile.create({
      data: { userId: user.id, bio: "My bio" },
    });

    const caller = exportCaller({ user });
    const result = await caller.allData();
    const parsed = JSON.parse(result.data);

    expect(parsed.profile.email).toBe(user.email);
    expect(parsed.coachProfile.userId).toBe(user.id);
    expect(parsed.coachProfile.bio).toBe("My bio");
  });
});
