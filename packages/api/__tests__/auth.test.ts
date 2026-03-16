import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc";
import { createTestUser } from "./helpers";

// Import the auth router directly for isolated testing
import { authRouter } from "../src/routers/auth";

const db = new PrismaClient();
const createCaller = createCallerFactory(authRouter);

function authCaller(session: { user: any } | null = null) {
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

describe("auth.signUp", () => {
  it("creates a user with hashed password", async () => {
    const caller = authCaller();
    const result = await caller.signUp({
      email: "new@example.com",
      password: "securepass123",
      name: "New User",
    });

    expect(result.user.email).toBe("new@example.com");
    expect(result.user.name).toBe("New User");
    expect(result.user.id).toBeDefined();

    // Verify password is hashed in DB
    const dbUser = await db.user.findUnique({
      where: { email: "new@example.com" },
    });
    expect(dbUser?.passwordHash).not.toBe("securepass123");
    expect(dbUser?.passwordHash).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "dup@example.com",
      password: "securepass123",
      name: "First User",
    });

    await expect(
      caller.signUp({
        email: "dup@example.com",
        password: "securepass123",
        name: "Second User",
      })
    ).rejects.toThrow();
  });

  it("rejects short password", async () => {
    const caller = authCaller();
    await expect(
      caller.signUp({
        email: "short@example.com",
        password: "short",
        name: "Short Pass",
      })
    ).rejects.toThrow();
  });
});

describe("auth.signIn", () => {
  it("returns user for valid credentials", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "login@example.com",
      password: "securepass123",
      name: "Login User",
    });

    const result = await caller.signIn({
      email: "login@example.com",
      password: "securepass123",
    });

    expect(result.user.email).toBe("login@example.com");
  });

  it("rejects invalid password", async () => {
    const caller = authCaller();
    await caller.signUp({
      email: "wrong@example.com",
      password: "securepass123",
      name: "Wrong Pass",
    });

    await expect(
      caller.signIn({
        email: "wrong@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow();
  });

  it("rejects non-existent email", async () => {
    const caller = authCaller();
    await expect(
      caller.signIn({
        email: "nobody@example.com",
        password: "securepass123",
      })
    ).rejects.toThrow();
  });
});

describe("auth.getSession", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = authCaller();
    await expect(caller.getSession()).rejects.toThrow("UNAUTHORIZED");
  });

  it("returns session when authenticated", async () => {
    const caller = authCaller({
      user: createTestUser({ email: "session@example.com" }),
    });
    const result = await caller.getSession();
    expect(result.session?.user.email).toBe("session@example.com");
  });
});
