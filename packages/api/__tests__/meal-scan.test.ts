import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { nutritionRouter } from "../src/routers/nutrition";
import type { PrismaClient } from "@ironpulse/db";
import type { ScanResult } from "../src/lib/meal-scan";

vi.mock("../src/lib/s3", () => ({
  getPresignedUploadUrl: vi.fn().mockResolvedValue("https://s3.example.com/upload"),
  getPresignedDownloadUrl: vi.fn().mockResolvedValue("https://s3.example.com/photo"),
}));

vi.mock("../src/lib/meal-scan", () => ({
  runMealScan: vi.fn(),
}));

import { getPresignedUploadUrl, getPresignedDownloadUrl } from "../src/lib/s3";
import { runMealScan } from "../src/lib/meal-scan";

const createCaller = createCallerFactory(nutritionRouter);

function makeDb() {
  return {
    mealLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaClient;
}

function nutritionCaller(
  db: PrismaClient,
  session: { user: ReturnType<typeof createTestUser> } | null
) {
  return createCaller(createTRPCContext({ db, session }));
}

const testUser = createTestUser({ email: "mealscan@test.com" });

const MOCK_SCAN_RESULT: ScanResult = {
  items: [
    { name: "chicken breast", portionDescription: "1 serving" },
    { name: "rice", portionDescription: "1 serving" },
  ],
  macros: { calories: 400, proteinG: 0, carbsG: 0, fatG: 0, isMacroEstimate: true },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- getMealScanUploadUrl ----------

describe("nutrition.getMealScanUploadUrl", () => {
  it("returns a presigned upload URL and a storage key", async () => {
    const db = makeDb();
    const result = await nutritionCaller(db, { user: testUser }).getMealScanUploadUrl({
      contentType: "image/jpeg",
    });

    expect(result.uploadUrl).toBe("https://s3.example.com/upload");
    expect(result.photoKey).toMatch(
      new RegExp(`^meal-scans/${testUser.id}/\\d+\\.jpeg$`)
    );
  });

  it("derives extension from content type", async () => {
    const db = makeDb();
    const result = await nutritionCaller(db, { user: testUser }).getMealScanUploadUrl({
      contentType: "image/png",
    });

    expect(result.photoKey).toMatch(/\.png$/);
  });

  it("passes content type and short-lived cache to getPresignedUploadUrl", async () => {
    const db = makeDb();
    await nutritionCaller(db, { user: testUser }).getMealScanUploadUrl({
      contentType: "image/jpeg",
    });

    expect(getPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^meal-scans\//),
      "image/jpeg",
      600,
      "shortLived"
    );
  });

  it("scopes storage key to the authenticated user", async () => {
    const db = makeDb();
    const result = await nutritionCaller(db, { user: testUser }).getMealScanUploadUrl({
      contentType: "image/jpeg",
    });

    expect(result.photoKey).toContain(testUser.id);
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).getMealScanUploadUrl({ contentType: "image/jpeg" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------- analyzeMealPhoto ----------

describe("nutrition.analyzeMealPhoto", () => {
  it("returns food items and macro prediction from the vision service", async () => {
    vi.mocked(runMealScan).mockResolvedValue(MOCK_SCAN_RESULT);
    const db = makeDb();

    const result = await nutritionCaller(db, { user: testUser }).analyzeMealPhoto({
      photoKey: `meal-scans/${testUser.id}/12345.jpg`,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.name).toBe("chicken breast");
    expect(result.macros).toEqual({ calories: 400, proteinG: 0, carbsG: 0, fatG: 0, isMacroEstimate: true });
  });

  it("generates a presigned download URL for the photo key", async () => {
    vi.mocked(runMealScan).mockResolvedValue(MOCK_SCAN_RESULT);
    const db = makeDb();
    const photoKey = `meal-scans/${testUser.id}/12345.jpg`;

    await nutritionCaller(db, { user: testUser }).analyzeMealPhoto({ photoKey });

    expect(getPresignedDownloadUrl).toHaveBeenCalledWith(photoKey, 300);
  });

  it("passes the presigned URL to runMealScan", async () => {
    vi.mocked(runMealScan).mockResolvedValue(MOCK_SCAN_RESULT);
    const db = makeDb();

    await nutritionCaller(db, { user: testUser }).analyzeMealPhoto({
      photoKey: `meal-scans/${testUser.id}/12345.jpg`,
    });

    expect(runMealScan).toHaveBeenCalledWith("https://s3.example.com/photo");
  });

  it("wraps vision API errors as INTERNAL_SERVER_ERROR", async () => {
    vi.mocked(runMealScan).mockRejectedValue(new Error("network error"));
    const db = makeDb();

    await expect(
      nutritionCaller(db, { user: testUser }).analyzeMealPhoto({
        photoKey: `meal-scans/${testUser.id}/12345.jpg`,
      })
    ).rejects.toThrow("Meal scan failed");
  });

  it("rejects unauthenticated calls", async () => {
    const db = makeDb();
    await expect(
      nutritionCaller(db, null).analyzeMealPhoto({
        photoKey: `meal-scans/${testUser.id}/12345.jpg`,
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects a photo key that belongs to a different user", async () => {
    const db = makeDb();
    const otherUserId = "other-user-id-999";
    await expect(
      nutritionCaller(db, { user: testUser }).analyzeMealPhoto({
        photoKey: `meal-scans/${otherUserId}/12345.jpg`,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
