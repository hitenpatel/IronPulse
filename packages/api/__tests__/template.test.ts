import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { templateRouter } from "../src/routers/template";
import type { PrismaClient } from "@ironpulse/db";

const createCaller = createCallerFactory(templateRouter);

function makeDb(overrides: Partial<{
  workoutTemplate: Partial<PrismaClient["workoutTemplate"]>;
  templateExercise: Partial<PrismaClient["templateExercise"]>;
  workout: Partial<PrismaClient["workout"]>;
}> = {}) {
  return {
    workoutTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      ...overrides.workoutTemplate,
    },
    templateExercise: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      ...overrides.templateExercise,
    },
    workout: {
      findFirst: vi.fn(),
      ...overrides.workout,
    },
  } as unknown as PrismaClient;
}

function templateCaller(
  db: PrismaClient,
  session: { user: ReturnType<typeof createTestUser> } | null
) {
  return createCaller(createTRPCContext({ db, session }));
}

const testUser = createTestUser({ email: "template@test.com" });

// ---------- list ----------

describe("template.list", () => {
  it("returns empty list when user has no templates", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findMany).mockResolvedValue([]);

    const result = await templateCaller(db, { user: testUser }).list({ limit: 20 });

    expect(result.data).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
    expect(db.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testUser.id } })
    );
  });

  it("returns templates with correct shape", async () => {
    const db = makeDb();
    const mockTemplates = [
      { id: "t1", userId: testUser.id, name: "Push Day", createdAt: new Date(), _count: { templateExercises: 3 } },
      { id: "t2", userId: testUser.id, name: "Pull Day", createdAt: new Date(), _count: { templateExercises: 2 } },
    ];
    vi.mocked(db.workoutTemplate.findMany).mockResolvedValue(mockTemplates as any);

    const result = await templateCaller(db, { user: testUser }).list({ limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.name).toBe("Push Day");
    expect(result.data[0]!._count.templateExercises).toBe(3);
    expect(result.nextCursor).toBeNull();
  });

  it("paginates: returns nextCursor when more templates exist beyond limit", async () => {
    const db = makeDb();
    const mockTemplates = [
      { id: "t1", userId: testUser.id, name: "A", createdAt: new Date(), _count: { templateExercises: 0 } },
      { id: "t2", userId: testUser.id, name: "B", createdAt: new Date(), _count: { templateExercises: 0 } },
      { id: "t3", userId: testUser.id, name: "C", createdAt: new Date(), _count: { templateExercises: 0 } },
    ];
    // limit=2 → we fetch limit+1=3, get 3 back → hasMore=true
    vi.mocked(db.workoutTemplate.findMany).mockResolvedValue(mockTemplates as any);

    const result = await templateCaller(db, { user: testUser }).list({ limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.nextCursor).toBe("t2");
  });

  it("passes cursor to findMany when provided", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findMany).mockResolvedValue([]);
    const cursorId = "cccccccc-0000-0000-0000-000000000001";

    await templateCaller(db, { user: testUser }).list({ limit: 10, cursor: cursorId });

    expect(db.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: cursorId }, skip: 1 })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(templateCaller(db, null).list({ limit: 20 })).rejects.toThrow("UNAUTHORIZED");
  });

  it("selects userId so the tRPC→TemplateRow mapper can read it (regression: #339)", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findMany).mockResolvedValue([]);

    await templateCaller(db, { user: testUser }).list({ limit: 20 });

    expect(db.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ userId: true }),
      })
    );
  });
});

// ---------- getById ----------

describe("template.getById", () => {
  const templateId = "aaaaaaaa-0000-0000-0000-000000000001";

  it("returns template with exercises and sets", async () => {
    const db = makeDb();
    const mockTemplate = {
      id: templateId,
      userId: testUser.id,
      name: "Full Template",
      templateExercises: [
        {
          id: "ex1",
          exerciseId: "exid",
          order: 0,
          notes: "Keep back straight",
          exercise: { id: "exid", name: "Squat", category: "compound", equipment: null },
          templateSets: [
            { id: "s1", setNumber: 1, targetReps: 5, targetWeightKg: 100, type: "working" },
          ],
        },
      ],
    };
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(mockTemplate as any);

    const result = await templateCaller(db, { user: testUser }).getById({ templateId });

    expect(result.template.name).toBe("Full Template");
    expect(result.template.templateExercises).toHaveLength(1);
    expect(result.template.templateExercises[0]!.notes).toBe("Keep back straight");
  });

  it("queries by both templateId and userId (prevents cross-user access)", async () => {
    const db = makeDb();
    const mockTemplate = { id: templateId, userId: testUser.id, name: "T", templateExercises: [] };
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(mockTemplate as any);

    await templateCaller(db, { user: testUser }).getById({ templateId });

    expect(db.workoutTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: templateId, userId: testUser.id } })
    );
  });

  it("throws NOT_FOUND when template does not exist", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(null);

    await expect(
      templateCaller(db, { user: testUser }).getById({ templateId })
    ).rejects.toThrow("Template not found");
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      templateCaller(db, null).getById({ templateId })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- create ----------

describe("template.create", () => {
  it("creates a template and returns it", async () => {
    const db = makeDb();
    const created = { id: "new-t1", name: "Push Day", createdAt: new Date() };
    vi.mocked(db.workoutTemplate.create).mockResolvedValue(created as any);

    const result = await templateCaller(db, { user: testUser }).create({
      name: "Push Day",
      exercises: [],
    });

    expect(result.template.name).toBe("Push Day");
    expect(db.workoutTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: testUser.id, name: "Push Day" }) })
    );
  });

  it("creates a template with nested exercises and sets", async () => {
    const db = makeDb();
    const exId = "aaaaaaaa-0000-0000-0000-000000000099";
    const created = { id: "new-t2", name: "Leg Day", createdAt: new Date() };
    vi.mocked(db.workoutTemplate.create).mockResolvedValue(created as any);

    const result = await templateCaller(db, { user: testUser }).create({
      name: "Leg Day",
      exercises: [
        {
          exerciseId: exId,
          order: 0,
          notes: "Warm up",
          sets: [{ setNumber: 1, targetReps: 10, targetWeightKg: 60, type: "working" }],
        },
      ],
    });

    expect(result.template.id).toBe("new-t2");
    const callArg = vi.mocked(db.workoutTemplate.create).mock.calls[0]![0] as any;
    const createdExercise = callArg.data.templateExercises.create[0];
    expect(createdExercise.exerciseId).toBe(exId);
    expect(createdExercise.templateSets.create[0].targetReps).toBe(10);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      templateCaller(db, null).create({ name: "T", exercises: [] })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- saveFromWorkout ----------

describe("template.saveFromWorkout", () => {
  const workoutId = "aaaaaaaa-0000-0000-0000-000000000002";

  it("creates a template from workout exercises and sets", async () => {
    const db = makeDb();
    const mockWorkout = {
      id: workoutId,
      userId: testUser.id,
      name: "Leg Day",
      workoutExercises: [
        {
          exerciseId: "exid",
          order: 0,
          notes: null,
          sets: [
            { setNumber: 1, weightKg: 120, reps: 5, type: "working" },
            { setNumber: 2, weightKg: 130, reps: 3, type: "working" },
          ],
        },
      ],
    };
    const created = { id: "new-t3", name: "Leg Day Template", createdAt: new Date() };
    vi.mocked(db.workout.findFirst).mockResolvedValue(mockWorkout as any);
    vi.mocked(db.workoutTemplate.create).mockResolvedValue(created as any);

    const result = await templateCaller(db, { user: testUser }).saveFromWorkout({
      workoutId,
      name: "Leg Day Template",
    });

    expect(result.template.name).toBe("Leg Day Template");
    const callArg = vi.mocked(db.workoutTemplate.create).mock.calls[0]![0] as any;
    const templateSets = callArg.data.templateExercises.create[0].templateSets.create;
    expect(templateSets).toHaveLength(2);
    expect(templateSets[0].targetWeightKg).toBe(120);
    expect(templateSets[0].targetReps).toBe(5);
  });

  it("queries workout by both workoutId and userId (prevents cross-user access)", async () => {
    const db = makeDb();
    vi.mocked(db.workout.findFirst).mockResolvedValue(null);

    await expect(
      templateCaller(db, { user: testUser }).saveFromWorkout({ workoutId, name: "X" })
    ).rejects.toThrow("Workout not found");

    expect(db.workout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: workoutId, userId: testUser.id } })
    );
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      templateCaller(db, null).saveFromWorkout({ workoutId, name: "T" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- update ----------

describe("template.update", () => {
  const templateId = "aaaaaaaa-0000-0000-0000-000000000003";

  it("updates the template name", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue({ id: templateId } as any);
    vi.mocked(db.workoutTemplate.update).mockResolvedValue({ id: templateId, name: "New Name", createdAt: new Date() } as any);

    const result = await templateCaller(db, { user: testUser }).update({
      templateId,
      name: "New Name",
    });

    expect(result.template.name).toBe("New Name");
    expect(db.workoutTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: templateId }, data: { name: "New Name" } })
    );
  });

  it("deletes and recreates exercises when exercises are provided", async () => {
    const db = makeDb();
    const exId = "aaaaaaaa-0000-0000-0000-000000000098";
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue({ id: templateId } as any);
    vi.mocked(db.workoutTemplate.update).mockResolvedValue({ id: templateId, name: "T", createdAt: new Date() } as any);
    vi.mocked(db.templateExercise.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(db.templateExercise.create).mockResolvedValue({} as any);

    await templateCaller(db, { user: testUser }).update({
      templateId,
      exercises: [
        { exerciseId: exId, order: 0, sets: [{ setNumber: 1, targetReps: 5, type: "working" }] },
      ],
    });

    expect(db.templateExercise.deleteMany).toHaveBeenCalledWith({ where: { templateId } });
    expect(db.templateExercise.create).toHaveBeenCalledTimes(1);
  });

  it("does not touch exercises when exercises param is omitted", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue({ id: templateId } as any);
    vi.mocked(db.workoutTemplate.update).mockResolvedValue({ id: templateId, name: "T", createdAt: new Date() } as any);

    await templateCaller(db, { user: testUser }).update({ templateId, name: "T" });

    expect(db.templateExercise.deleteMany).not.toHaveBeenCalled();
    expect(db.templateExercise.create).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when template does not exist", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(null);

    await expect(
      templateCaller(db, { user: testUser }).update({ templateId, name: "X" })
    ).rejects.toThrow("Template not found");
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      templateCaller(db, null).update({ templateId, name: "X" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- delete ----------

describe("template.delete", () => {
  const templateId = "aaaaaaaa-0000-0000-0000-000000000004";

  it("deletes the template and returns success", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue({ id: templateId } as any);
    vi.mocked(db.workoutTemplate.delete).mockResolvedValue({} as any);

    const result = await templateCaller(db, { user: testUser }).delete({ templateId });

    expect(result.success).toBe(true);
    expect(db.workoutTemplate.delete).toHaveBeenCalledWith({ where: { id: templateId } });
  });

  it("queries by both templateId and userId before deleting", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue({ id: templateId } as any);
    vi.mocked(db.workoutTemplate.delete).mockResolvedValue({} as any);

    await templateCaller(db, { user: testUser }).delete({ templateId });

    expect(db.workoutTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: templateId, userId: testUser.id } })
    );
  });

  it("throws NOT_FOUND when template does not exist", async () => {
    const db = makeDb();
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(null);

    await expect(
      templateCaller(db, { user: testUser }).delete({ templateId })
    ).rejects.toThrow("Template not found");
  });

  it("throws NOT_FOUND for another user's template (findFirst returns null due to userId filter)", async () => {
    const db = makeDb();
    // findFirst returns null because userId doesn't match
    vi.mocked(db.workoutTemplate.findFirst).mockResolvedValue(null);

    await expect(
      templateCaller(db, { user: testUser }).delete({ templateId })
    ).rejects.toThrow("Template not found");
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      templateCaller(db, null).delete({ templateId })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
