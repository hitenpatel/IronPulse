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
