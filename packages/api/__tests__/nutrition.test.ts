import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { nutritionRouter } from "../src/routers/nutrition";
import type { PrismaClient } from "@ironpulse/db";

const createCaller = createCallerFactory(nutritionRouter);

function makeDb(
  overrides: Partial<PrismaClient["mealLog"]> = {}
) {
  return {
    mealLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    },
  } as unknown as PrismaClient;
}

function nutritionCaller(
  db: PrismaClient,
  session: { user: ReturnType<typeof createTestUser> } | null
) {
  return createCaller(createTRPCContext({ db, session }));
}

const testUser = createTestUser({ email: "nutrition@test.com" });

const TEST_DATE = new Date("2026-05-01");

function makeMeal(overrides: Partial<{
  id: string;
  date: Date;
  mealType: string;
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    date: TEST_DATE,
    mealType: "lunch",
    name: "Chicken breast",
    calories: 300,
    proteinG: 40,
    carbsG: 0,
    fatG: 5,
    notes: null,
    createdAt: new Date("2026-05-01T12:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- logMeal ----------

describe("nutrition.logMeal", () => {
  it("creates a meal and returns it", async () => {
    const meal = makeMeal();
    const db = makeDb({ create: vi.fn().mockResolvedValue(meal) });

    const result = await nutritionCaller(db, { user: testUser }).logMeal({
      date: TEST_DATE,
      mealType: "lunch",
      name: "Chicken breast",
    });

    expect(result.meal).toEqual(meal);
  });

  it("passes userId from session to db.create", async () => {
    const meal = makeMeal();
    const db = makeDb({ create: vi.fn().mockResolvedValue(meal) });

    await nutritionCaller(db, { user: testUser }).logMeal({
      date: TEST_DATE,
      mealType: "breakfast",
      name: "Oats",
    });

    expect(db.mealLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: testUser.id }),
      })
    );
  });

  it("spreads optional macros only when provided", async () => {
    const meal = makeMeal({ calories: 500, proteinG: 30 });
    const db = makeDb({ create: vi.fn().mockResolvedValue(meal) });

    await nutritionCaller(db, { user: testUser }).logMeal({
      date: TEST_DATE,
      mealType: "dinner",
      name: "Salmon",
      calories: 500,
      proteinG: 30,
    });

    const callData = vi.mocked(db.mealLog.create).mock.calls[0]![0].data as any;
    expect(callData).toHaveProperty("calories", 500);
    expect(callData).toHaveProperty("proteinG", 30);
    expect(callData).not.toHaveProperty("carbsG");
    expect(callData).not.toHaveProperty("fatG");
  });

  it("does not spread optional fields when absent", async () => {
    const meal = makeMeal({ calories: null, proteinG: null, carbsG: null, fatG: null, notes: null });
    const db = makeDb({ create: vi.fn().mockResolvedValue(meal) });

    await nutritionCaller(db, { user: testUser }).logMeal({
      date: TEST_DATE,
      mealType: "snack",
      name: "Apple",
    });

    const callData = vi.mocked(db.mealLog.create).mock.calls[0]![0].data as any;
    expect(callData).not.toHaveProperty("calories");
    expect(callData).not.toHaveProperty("notes");
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).logMeal({
        date: TEST_DATE,
        mealType: "lunch",
        name: "Test",
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- listMeals ----------

describe("nutrition.listMeals", () => {
  it("returns meals for the requested date", async () => {
    const meals = [makeMeal({ mealType: "breakfast" }), makeMeal({ mealType: "lunch" })];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(meals) });

    const result = await nutritionCaller(db, { user: testUser }).listMeals({ date: TEST_DATE });

    expect(result.meals).toHaveLength(2);
  });

  it("scopes query to the authenticated user", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await nutritionCaller(db, { user: testUser }).listMeals({ date: TEST_DATE });

    expect(db.mealLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: testUser.id }),
      })
    );
  });

  it("filters by the given date", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await nutritionCaller(db, { user: testUser }).listMeals({ date: TEST_DATE });

    expect(db.mealLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: TEST_DATE }),
      })
    );
  });

  it("orders results by createdAt ascending", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await nutritionCaller(db, { user: testUser }).listMeals({ date: TEST_DATE });

    expect(db.mealLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } })
    );
  });

  it("returns empty array when no meals exist", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    const result = await nutritionCaller(db, { user: testUser }).listMeals({ date: TEST_DATE });

    expect(result.meals).toEqual([]);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).listMeals({ date: TEST_DATE })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- deleteMeal ----------

describe("nutrition.deleteMeal", () => {
  it("deletes a meal and returns success", async () => {
    const meal = makeMeal();
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue({ id: meal.id }),
      delete: vi.fn().mockResolvedValue(meal),
    });

    const result = await nutritionCaller(db, { user: testUser }).deleteMeal({ id: meal.id });

    expect(result.success).toBe(true);
    expect(db.mealLog.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: meal.id } })
    );
  });

  it("throws NOT_FOUND when meal does not exist", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });

    await expect(
      nutritionCaller(db, { user: testUser }).deleteMeal({ id: crypto.randomUUID() })
    ).rejects.toThrow("Meal not found");
  });

  it("scopes ownership check to the current user", async () => {
    const db = makeDb({ findFirst: vi.fn().mockResolvedValue(null) });
    const id = crypto.randomUUID();

    await nutritionCaller(db, { user: testUser }).deleteMeal({ id }).catch(() => {});

    expect(db.mealLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, userId: testUser.id } })
    );
  });

  it("does not call db.delete when meal is not found", async () => {
    const db = makeDb({
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn(),
    });

    await nutritionCaller(db, { user: testUser })
      .deleteMeal({ id: crypto.randomUUID() })
      .catch(() => {});

    expect(db.mealLog.delete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).deleteMeal({ id: crypto.randomUUID() })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- dailySummary ----------

describe("nutrition.dailySummary", () => {
  it("returns zero totals when no meals logged", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    const result = await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(result).toMatchObject({
      date: TEST_DATE,
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      mealCount: 0,
    });
  });

  it("sums calories across all meals", async () => {
    const meals = [
      { calories: 300, proteinG: null, carbsG: null, fatG: null },
      { calories: 500, proteinG: null, carbsG: null, fatG: null },
    ];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(meals) });

    const result = await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(result.totalCalories).toBe(800);
    expect(result.mealCount).toBe(2);
  });

  it("sums macros correctly with decimal values", async () => {
    const meals = [
      { calories: 400, proteinG: 30.5, carbsG: 45.0, fatG: 12.5 },
      { calories: 200, proteinG: 15.0, carbsG: 20.0, fatG: 8.0 },
    ];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(meals) });

    const result = await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(result.totalProteinG).toBeCloseTo(45.5);
    expect(result.totalCarbsG).toBeCloseTo(65.0);
    expect(result.totalFatG).toBeCloseTo(20.5);
  });

  it("treats null macro values as zero", async () => {
    const meals = [
      { calories: 100, proteinG: null, carbsG: null, fatG: null },
    ];
    const db = makeDb({ findMany: vi.fn().mockResolvedValue(meals) });

    const result = await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(result.totalProteinG).toBe(0);
    expect(result.totalCarbsG).toBe(0);
    expect(result.totalFatG).toBe(0);
  });

  it("scopes query to the authenticated user and date", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(db.mealLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: testUser.id, date: TEST_DATE }),
      })
    );
  });

  it("returns the queried date in the response", async () => {
    const db = makeDb({ findMany: vi.fn().mockResolvedValue([]) });

    const result = await nutritionCaller(db, { user: testUser }).dailySummary({ date: TEST_DATE });

    expect(result.date).toEqual(TEST_DATE);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).dailySummary({ date: TEST_DATE })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
