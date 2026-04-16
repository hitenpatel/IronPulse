import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFeedItem } from "../src/lib/feed";

const mockCreate = vi.fn().mockResolvedValue({
  id: "feed-1",
  userId: "u1",
  type: "workout",
  referenceId: "w1",
  visibility: "followers",
});

const mockDb = {
  activityFeedItem: { create: mockCreate },
} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createFeedItem", () => {
  it("creates a feed item with correct data", async () => {
    const result = await createFeedItem(mockDb, "u1", "workout", "w1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        type: "workout",
        referenceId: "w1",
        visibility: "followers",
      },
    });
    expect(result).toEqual({
      id: "feed-1",
      userId: "u1",
      type: "workout",
      referenceId: "w1",
      visibility: "followers",
    });
  });

  it('uses "followers" as default visibility', async () => {
    await createFeedItem(mockDb, "u1", "pr", "pr-1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ visibility: "followers" }),
    });
  });

  it("passes custom visibility when provided", async () => {
    await createFeedItem(mockDb, "u1", "workout", "w2", "public");

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ visibility: "public" }),
    });
  });

  it("passes private visibility when provided", async () => {
    await createFeedItem(mockDb, "u1", "workout", "w3", "private");

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ visibility: "private" }),
    });
  });

  it("returns the created feed item", async () => {
    const customReturn = {
      id: "feed-2",
      userId: "u2",
      type: "pr",
      referenceId: "pr-1",
      visibility: "public",
    };
    mockCreate.mockResolvedValueOnce(customReturn);

    const result = await createFeedItem(mockDb, "u2", "pr", "pr-1", "public");
    expect(result).toEqual(customReturn);
  });
});
