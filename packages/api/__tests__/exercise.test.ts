import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { exerciseRouter } from "../src/routers/exercise";

const db = new PrismaClient();
const createCaller = createCallerFactory(exerciseRouter);

function exerciseCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
});

describe("exercise.list", () => {
  it("returns paginated exercises", async () => {
    // Seed two exercises directly
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ limit: 10 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeNull();
  });

  it("filters by muscle group", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Squat", category: "compound", primaryMuscles: ["quads", "glutes"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ muscleGroup: "chest" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("filters by equipment", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "barbell", isCustom: false },
        { name: "Push Up", category: "compound", primaryMuscles: ["chest"], equipment: "bodyweight", isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ equipment: "barbell" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("filters by category", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ category: "isolation" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bicep Curl");
  });

  it("searches by name (case insensitive)", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
        { name: "Bicep Curl", category: "isolation", primaryMuscles: ["biceps"], isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ search: "bench" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Bench Press");
  });

  it("combines multiple filters", async () => {
    await db.exercise.createMany({
      data: [
        { name: "Barbell Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "barbell", isCustom: false },
        { name: "Dumbbell Bench Press", category: "compound", primaryMuscles: ["chest"], equipment: "dumbbell", isCustom: false },
        { name: "Barbell Curl", category: "isolation", primaryMuscles: ["biceps"], equipment: "barbell", isCustom: false },
      ],
    });

    const caller = exerciseCaller();
    const result = await caller.list({ equipment: "barbell", muscleGroup: "chest" });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.name).toBe("Barbell Bench Press");
  });

  it("paginates with cursor", async () => {
    await db.exercise.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        name: `Exercise ${String(i).padStart(2, "0")}`,
        category: "compound",
        primaryMuscles: ["chest"],
        isCustom: false,
      })),
    });

    const caller = exerciseCaller();
    const page1 = await caller.list({ limit: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await caller.list({ limit: 2, cursor: page1.nextCursor! });
    expect(page2.data.length).toBe(2);
    expect(page2.data[0]!.name).not.toBe(page1.data[0]!.name);
  });
});

describe("exercise.getById", () => {
  it("returns a single exercise", async () => {
    const ex = await db.exercise.create({
      data: { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
    });

    const caller = exerciseCaller();
    const result = await caller.getById({ id: ex.id });

    expect(result.exercise.name).toBe("Bench Press");
    expect(result.exercise.primaryMuscles).toEqual(["chest"]);
  });

  it("throws for non-existent exercise", async () => {
    const caller = exerciseCaller();
    await expect(
      caller.getById({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toThrow();
  });
});

describe("exercise.create", () => {
  it("creates a custom exercise for authenticated user", async () => {
    const user = createTestUser();
    await db.user.create({ data: { id: user.id, email: user.email, name: user.name } });

    const caller = exerciseCaller({ user });
    const result = await caller.create({
      name: "My Custom Exercise",
      category: "compound",
      primaryMuscles: ["chest"],
    });

    expect(result.exercise.name).toBe("My Custom Exercise");
    expect(result.exercise.isCustom).toBe(true);
    expect(result.exercise.createdById).toBe(user.id);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = exerciseCaller();
    await expect(
      caller.create({
        name: "Nope",
        category: "compound",
        primaryMuscles: ["chest"],
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
