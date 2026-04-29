import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { templateRouter } from "../src/routers/template";

const db = new PrismaClient();
const createCaller = createCallerFactory(templateRouter);

function templateCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "template@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("template.list", () => {
  it("returns userId on each template (regression: select omitted userId causing TS2339)", async () => {
    await db.workoutTemplate.create({
      data: { userId: testUser.id, name: "Pull Day" },
    });

    const caller = templateCaller({ user: testUser });
    const result = await caller.list({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].userId).toBe(testUser.id);
  });

  it("returns only templates belonging to the requesting user", async () => {
    const otherUser = createTestUser({ email: "other@test.com" });
    await db.user.create({
      data: { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    });
    await db.workoutTemplate.create({
      data: { userId: testUser.id, name: "My Template" },
    });
    await db.workoutTemplate.create({
      data: { userId: otherUser.id, name: "Other Template" },
    });

    const caller = templateCaller({ user: testUser });
    const result = await caller.list({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("My Template");
  });

  it("returns exercise count via _count", async () => {
    const ex = await db.exercise.create({
      data: { name: "Squat", category: "compound", primaryMuscles: ["quads"], isCustom: false },
    });
    await db.workoutTemplate.create({
      data: {
        userId: testUser.id,
        name: "Leg Day",
        templateExercises: {
          create: [
            { exerciseId: ex.id, order: 0 },
            { exerciseId: ex.id, order: 1 },
          ],
        },
      },
    });

    const caller = templateCaller({ user: testUser });
    const result = await caller.list({});

    expect(result.data[0]._count.templateExercises).toBe(2);
  });
});

describe("template.create", () => {
  it("creates a template and returns it", async () => {
    const ex = await db.exercise.create({
      data: { name: "Bench Press", category: "compound", primaryMuscles: ["chest"], isCustom: false },
    });

    const caller = templateCaller({ user: testUser });
    const result = await caller.create({
      name: "Push Day",
      exercises: [
        {
          exerciseId: ex.id,
          order: 0,
          notes: undefined,
          sets: [{ setNumber: 1, targetReps: 8, targetWeightKg: 60, type: "working" }],
        },
      ],
    });

    expect(result.template.name).toBe("Push Day");
    const stored = await db.workoutTemplate.findUnique({ where: { id: result.template.id } });
    expect(stored?.userId).toBe(testUser.id);
  });
});

describe("template.delete", () => {
  it("deletes a template owned by the user", async () => {
    const t = await db.workoutTemplate.create({
      data: { userId: testUser.id, name: "To Delete" },
    });

    const caller = templateCaller({ user: testUser });
    const result = await caller.delete({ templateId: t.id });

    expect(result.success).toBe(true);
    const stored = await db.workoutTemplate.findUnique({ where: { id: t.id } });
    expect(stored).toBeNull();
  });

  it("throws NOT_FOUND when deleting another user's template", async () => {
    const otherUser = createTestUser({ email: "attacker@test.com" });
    await db.user.create({
      data: { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    });
    const t = await db.workoutTemplate.create({
      data: { userId: otherUser.id, name: "Victim Template" },
    });

    const caller = templateCaller({ user: testUser });
    await expect(caller.delete({ templateId: t.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
