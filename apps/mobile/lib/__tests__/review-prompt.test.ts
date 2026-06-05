import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/store-review", () => ({
  isAvailableAsync: vi.fn(),
  requestReview: vi.fn(),
}));

vi.mock("@/lib/secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("../trpc", () => ({
  trpc: {
    workout: {
      list: {
        query: vi.fn(),
      },
    },
  },
}));

import * as StoreReview from "@/lib/store-review";
import * as SecureStore from "@/lib/secure-store";
import { trpc } from "../trpc";
import { maybeRequestReview } from "../review-prompt";

const mockIsAvailable = vi.mocked(StoreReview.isAvailableAsync);
const mockRequestReview = vi.mocked(StoreReview.requestReview);
const mockGetItem = vi.mocked(SecureStore.getItemAsync);
const mockSetItem = vi.mocked(SecureStore.setItemAsync);
const mockListQuery = vi.mocked(trpc.workout.list.query);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function makeWorkouts(total: number, completed: number) {
  return {
    data: [
      ...Array.from({ length: completed }, () => ({ completedAt: "2025-01-01" })),
      ...Array.from({ length: total - completed }, () => ({ completedAt: null })),
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("maybeRequestReview", () => {
  it("does nothing when store review is unavailable", async () => {
    mockIsAvailable.mockResolvedValue(false);

    await maybeRequestReview();

    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockListQuery).not.toHaveBeenCalled();
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does nothing when cooldown has not yet passed", async () => {
    mockIsAvailable.mockResolvedValue(true);
    const recentTimestamp = String(Date.now() - THIRTY_DAYS_MS / 2);
    mockGetItem.mockResolvedValue(recentTimestamp);

    await maybeRequestReview();

    expect(mockListQuery).not.toHaveBeenCalled();
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("proceeds past cooldown when last shown is older than 30 days", async () => {
    mockIsAvailable.mockResolvedValue(true);
    const oldTimestamp = String(Date.now() - THIRTY_DAYS_MS - 1000);
    mockGetItem.mockResolvedValue(oldTimestamp);
    mockListQuery.mockResolvedValue(makeWorkouts(10, 10));

    await maybeRequestReview();

    expect(mockRequestReview).toHaveBeenCalled();
  });

  it("proceeds past cooldown when no previous timestamp is stored", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockListQuery.mockResolvedValue(makeWorkouts(10, 10));

    await maybeRequestReview();

    expect(mockRequestReview).toHaveBeenCalled();
  });

  it("does nothing when fewer than 5 workouts are completed", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockListQuery.mockResolvedValue(makeWorkouts(4, 4));

    await maybeRequestReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does nothing when workouts exist but none are completed", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockListQuery.mockResolvedValue(makeWorkouts(10, 0));

    await maybeRequestReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("requests review when exactly 5 workouts are completed", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockListQuery.mockResolvedValue(makeWorkouts(5, 5));

    await maybeRequestReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("saves the timestamp after requesting review", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockGetItem.mockResolvedValue(null);
    mockListQuery.mockResolvedValue(makeWorkouts(5, 5));

    const before = Date.now();
    await maybeRequestReview();
    const after = Date.now();

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe("review_prompt_last_shown");
    const savedTimestamp = parseInt(value, 10);
    expect(savedTimestamp).toBeGreaterThanOrEqual(before);
    expect(savedTimestamp).toBeLessThanOrEqual(after);
  });

  it("swallows errors without throwing", async () => {
    mockIsAvailable.mockRejectedValue(new Error("native crash"));

    await expect(maybeRequestReview()).resolves.toBeUndefined();
  });
});
