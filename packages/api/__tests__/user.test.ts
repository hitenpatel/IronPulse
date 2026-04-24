import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc";
import { createTestUser } from "./helpers";
import { userRouter } from "../src/routers/user";

const db = new PrismaClient();
const createCaller = createCallerFactory(userRouter);

function userCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.account.deleteMany();
  await db.user.deleteMany();
});

describe("user.updateProfile", () => {
  it("updates user name", async () => {
    const dbUser = await db.user.create({
      data: { email: "update@example.com", name: "Old Name" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.updateProfile({ name: "New Name" });
    expect(result.user.name).toBe("New Name");
  });

  it("updates unit system", async () => {
    const dbUser = await db.user.create({
      data: { email: "units@example.com", name: "Units User" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.updateProfile({ unitSystem: "imperial" });
    expect(result.user.unitSystem).toBe("imperial");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(
      caller.updateProfile({ name: "Hacker" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("user.requestDeletion", () => {
  it("sets deletionRequestedAt and returns deletion date 7 days out", async () => {
    const dbUser = await db.user.create({
      data: { email: "delete@example.com", name: "Delete Me" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const before = Date.now();
    const result = await caller.requestDeletion();
    const after = Date.now();

    expect(result.success).toBe(true);

    // deletionDate should be ~7 days from now
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const deletionTime = new Date(result.deletionDate).getTime();
    expect(deletionTime).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(deletionTime).toBeLessThanOrEqual(after + sevenDaysMs + 1000);

    // Verify the DB was updated
    const updated = await db.user.findUniqueOrThrow({ where: { id: dbUser.id } });
    expect(updated.deletionRequestedAt).not.toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(caller.requestDeletion()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("user.cancelDeletion", () => {
  it("clears deletionRequestedAt", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "cancel@example.com",
        name: "Cancel User",
        deletionRequestedAt: new Date(),
      },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.cancelDeletion();
    expect(result.success).toBe(true);

    const updated = await db.user.findUniqueOrThrow({ where: { id: dbUser.id } });
    expect(updated.deletionRequestedAt).toBeNull();
  });

  it("throws when no pending deletion exists", async () => {
    const dbUser = await db.user.create({
      data: { email: "nodeletion@example.com", name: "No Deletion" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    await expect(caller.cancelDeletion()).rejects.toThrow(
      "No pending deletion request to cancel"
    );
  });

  it("allows re-requesting deletion after cancellation", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "rerequest@example.com",
        name: "Re-Request User",
        deletionRequestedAt: new Date(),
      },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    // Cancel
    await caller.cancelDeletion();
    const afterCancel = await db.user.findUniqueOrThrow({ where: { id: dbUser.id } });
    expect(afterCancel.deletionRequestedAt).toBeNull();

    // Re-request
    const result = await caller.requestDeletion();
    expect(result.success).toBe(true);
    const afterRerequest = await db.user.findUniqueOrThrow({ where: { id: dbUser.id } });
    expect(afterRerequest.deletionRequestedAt).not.toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(caller.cancelDeletion()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("user.me", () => {
  it("returns current user profile", async () => {
    const dbUser = await db.user.create({
      data: { email: "me@example.com", name: "Me User" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = userCaller({ user: session });

    const result = await caller.me();
    expect(result.user.email).toBe("me@example.com");
    expect(result.user.name).toBe("Me User");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = userCaller();
    await expect(caller.me()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("user.registerPushToken", () => {
  it("creates a fresh token for a new device", async () => {
    const dbUser = await db.user.create({
      data: { email: "push-new@example.com", name: "Push New" },
    });
    const caller = userCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    const result = await caller.registerPushToken({
      token: "ExponentPushToken[new-device]",
      platform: "ios",
    });

    expect(result.success).toBe(true);
    const row = await db.pushToken.findUnique({
      where: { token: "ExponentPushToken[new-device]" },
    });
    expect(row?.userId).toBe(dbUser.id);
  });

  it("allows the same user to re-register their token (e.g. after reinstall)", async () => {
    const dbUser = await db.user.create({
      data: { email: "push-reregister@example.com", name: "Push Rere" },
    });
    await db.pushToken.create({
      data: {
        userId: dbUser.id,
        token: "ExponentPushToken[stable]",
        platform: "ios",
      },
    });
    const caller = userCaller({
      user: createTestUser({ id: dbUser.id, email: dbUser.email }),
    });

    await expect(
      caller.registerPushToken({
        token: "ExponentPushToken[stable]",
        platform: "android",
      }),
    ).resolves.toEqual({ success: true });

    const row = await db.pushToken.findUnique({
      where: { token: "ExponentPushToken[stable]" },
    });
    expect(row?.userId).toBe(dbUser.id);
    expect(row?.platform).toBe("android");
  });

  it("rejects takeover attempts from a different user", async () => {
    const victim = await db.user.create({
      data: { email: "push-victim@example.com", name: "Victim" },
    });
    const attacker = await db.user.create({
      data: { email: "push-attacker@example.com", name: "Attacker" },
    });
    await db.pushToken.create({
      data: {
        userId: victim.id,
        token: "ExponentPushToken[victim-device]",
        platform: "ios",
      },
    });

    const caller = userCaller({
      user: createTestUser({ id: attacker.id, email: attacker.email }),
    });

    await expect(
      caller.registerPushToken({
        token: "ExponentPushToken[victim-device]",
        platform: "ios",
      }),
    ).rejects.toThrow("FORBIDDEN");

    const row = await db.pushToken.findUnique({
      where: { token: "ExponentPushToken[victim-device]" },
    });
    expect(row?.userId).toBe(victim.id);
  });
});
