import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { socialRouter } from "../src/routers/social";

const db = new PrismaClient();
const createCaller = createCallerFactory(socialRouter);

function socialCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let userA: ReturnType<typeof createTestUser>;
let userB: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await cleanupTestData(db);
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  userA = createTestUser({ email: "social-a@test.com", name: "Alice" });
  userB = createTestUser({ email: "social-b@test.com", name: "Bob" });

  await db.user.create({
    data: { id: userA.id, email: userA.email, name: userA.name },
  });
  await db.user.create({
    data: { id: userB.id, email: userB.email, name: userB.name },
  });
});

describe("social.searchUsers", () => {
  it("returns users matching name query", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.searchUsers({ query: "Bob" });

    expect(result.users.length).toBe(1);
    expect(result.users[0]!.name).toBe("Bob");
  });

  it("excludes the requesting user from results", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.searchUsers({ query: "Alice" });

    expect(result.users.length).toBe(0);
  });

  it("does not return email in results", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.searchUsers({ query: "Bob" });

    expect(result.users.length).toBeGreaterThan(0);
    expect((result.users[0] as any).email).toBeUndefined();
  });

  it("returns empty when no match", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.searchUsers({ query: "zzz-no-match" });
    expect(result.users).toEqual([]);
  });
});

describe("social.follow", () => {
  it("creates a follow relationship", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.follow({ userId: userB.id });

    expect(result.follow.followingId).toBe(userB.id);

    const row = await db.follow.findFirst({
      where: { followerId: userA.id, followingId: userB.id },
    });
    expect(row).not.toBeNull();
  });

  it("is idempotent (upsert)", async () => {
    const caller = socialCaller({ user: userA });
    await caller.follow({ userId: userB.id });
    // Second call should not throw
    const result = await caller.follow({ userId: userB.id });
    expect(result.follow.followingId).toBe(userB.id);

    const count = await db.follow.count({
      where: { followerId: userA.id, followingId: userB.id },
    });
    expect(count).toBe(1);
  });

  it("rejects following yourself", async () => {
    const caller = socialCaller({ user: userA });
    await expect(caller.follow({ userId: userA.id })).rejects.toThrow("Cannot follow yourself");
  });

  it("rejects following non-existent user", async () => {
    const caller = socialCaller({ user: userA });
    await expect(
      caller.follow({ userId: crypto.randomUUID() })
    ).rejects.toThrow("User not found");
  });
});

describe("social.unfollow", () => {
  it("removes an existing follow", async () => {
    await db.follow.create({
      data: { followerId: userA.id, followingId: userB.id },
    });

    const caller = socialCaller({ user: userA });
    const result = await caller.unfollow({ userId: userB.id });

    expect(result.success).toBe(true);

    const row = await db.follow.findFirst({
      where: { followerId: userA.id, followingId: userB.id },
    });
    expect(row).toBeNull();
  });

  it("returns success false when no follow exists", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.unfollow({ userId: userB.id });
    expect(result.success).toBe(false);
  });
});

describe("social.followers", () => {
  it("lists followers of the current user", async () => {
    await db.follow.create({
      data: { followerId: userB.id, followingId: userA.id },
    });

    const caller = socialCaller({ user: userA });
    const result = await caller.followers();

    expect(result.followers.length).toBe(1);
    expect(result.followers[0]!.id).toBe(userB.id);
  });

  it("returns empty when no followers", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.followers();
    expect(result.followers).toEqual([]);
  });
});

describe("social.feed", () => {
  it("returns own activity feed items", async () => {
    await db.activityFeedItem.create({
      data: {
        userId: userA.id,
        type: "workout_completed",
        referenceId: crypto.randomUUID(),
        visibility: "public",
      },
    });

    const caller = socialCaller({ user: userA });
    const result = await caller.feed({ limit: 10 });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.type).toBe("workout_completed");
  });

  it("returns followed users' public feed items", async () => {
    // userA follows userB
    await db.follow.create({
      data: { followerId: userA.id, followingId: userB.id },
    });

    await db.activityFeedItem.create({
      data: {
        userId: userB.id,
        type: "workout_completed",
        referenceId: crypto.randomUUID(),
        visibility: "public",
      },
    });

    const caller = socialCaller({ user: userA });
    const result = await caller.feed({ limit: 10 });

    expect(result.data.length).toBe(1);
    expect(result.data[0]!.user.id).toBe(userB.id);
  });

  it("does not return private feed items from non-followed users", async () => {
    await db.activityFeedItem.create({
      data: {
        userId: userB.id,
        type: "workout_completed",
        referenceId: crypto.randomUUID(),
        visibility: "public",
      },
    });

    // userA does NOT follow userB
    const caller = socialCaller({ user: userA });
    const result = await caller.feed({ limit: 10 });

    expect(result.data.length).toBe(0);
  });

  it("returns empty feed with no activity", async () => {
    const caller = socialCaller({ user: userA });
    const result = await caller.feed({ limit: 10 });
    expect(result.data).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
