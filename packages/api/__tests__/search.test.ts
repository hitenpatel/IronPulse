import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { searchRouter } from "../src/routers/search";

const db = new PrismaClient();
const createCaller = createCallerFactory(searchRouter);

function searchCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await cleanupTestData(db);
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "search@test.com", name: "Search Tester" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("search.global", () => {
  it("returns matching exercises", async () => {
    await db.exercise.create({
      data: {
        name: "Barbell Squat",
        category: "compound",
        primaryMuscles: ["quads"],
        isCustom: false,
      },
    });

    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "Barbell" });

    expect(result.exercises.length).toBe(1);
    expect(result.exercises[0]!.name).toBe("Barbell Squat");
  });

  it("returns matching users (excluding self)", async () => {
    const otherUser = await db.user.create({
      data: { email: "findme@test.com", name: "Find Me User" },
    });

    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "Find Me" });

    expect(result.users.length).toBe(1);
    expect(result.users[0]!.id).toBe(otherUser.id);
  });

  it("excludes the requesting user from user results", async () => {
    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "Search Tester" });

    expect(result.users.length).toBe(0);
  });

  it("returns matching workouts for the current user", async () => {
    await db.workout.create({
      data: {
        userId: testUser.id,
        name: "Morning Push Session",
        startedAt: new Date(),
      },
    });

    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "Push" });

    expect(result.workouts.length).toBe(1);
    expect(result.workouts[0]!.name).toBe("Morning Push Session");
  });

  it("does not return other users' workouts", async () => {
    const otherUser = await db.user.create({
      data: { email: "other-search@test.com", name: "Other Search User" },
    });
    await db.workout.create({
      data: {
        userId: otherUser.id,
        name: "Other Push Session",
        startedAt: new Date(),
      },
    });

    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "Push" });

    expect(result.workouts.length).toBe(0);
  });

  it("returns empty results when nothing matches", async () => {
    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "zzz-no-match-xyz" });

    expect(result.exercises).toEqual([]);
    expect(result.users).toEqual([]);
    expect(result.workouts).toEqual([]);
  });

  it("returns results across all categories simultaneously", async () => {
    await db.exercise.create({
      data: {
        name: "IronPulse Curl",
        category: "isolation",
        primaryMuscles: ["biceps"],
        isCustom: false,
      },
    });
    await db.user.create({
      data: { email: "ironpulse-user@test.com", name: "IronPulse User" },
    });
    await db.workout.create({
      data: { userId: testUser.id, name: "IronPulse Workout", startedAt: new Date() },
    });

    const caller = searchCaller({ user: testUser });
    const result = await caller.global({ query: "IronPulse" });

    expect(result.exercises.length).toBeGreaterThan(0);
    expect(result.users.length).toBeGreaterThan(0);
    expect(result.workouts.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = searchCaller();
    await expect(caller.global({ query: "test" })).rejects.toThrow("UNAUTHORIZED");
  });
});
