import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { integrationRouter } from "../src/routers/integration";
import { encryptToken } from "../src/lib/encryption";

const db = new PrismaClient();
const createCaller = createCallerFactory(integrationRouter);

function caller(session: { user: any } | null = null) {
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
  await db.deviceConnection.deleteMany();
  await cleanupTestData(db);
  testUser = createTestUser({ email: "integration@test.com" });
  await db.user.create({
    data: {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
    },
  });
});

describe("integration.listConnections", () => {
  it("returns empty array when no connections", async () => {
    const c = caller({ user: testUser });
    const result = await c.listConnections();
    expect(result).toEqual([]);
  });

  it("returns user connections without tokens", async () => {
    await db.deviceConnection.create({
      data: {
        userId: testUser.id,
        provider: "strava",
        providerAccountId: "12345",
        accessToken: encryptToken("test_access"),
        refreshToken: encryptToken("test_refresh"),
        tokenExpiresAt: new Date(Date.now() + 3600000),
      },
    });
    const c = caller({ user: testUser });
    const result = await c.listConnections();
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("strava");
    expect(result[0]).not.toHaveProperty("accessToken");
    expect(result[0]).not.toHaveProperty("refreshToken");
  });
});

describe("integration.disconnectProvider", () => {
  it("deletes the connection", async () => {
    await db.deviceConnection.create({
      data: {
        userId: testUser.id,
        provider: "strava",
        providerAccountId: "12345",
        accessToken: encryptToken("test"),
        refreshToken: encryptToken("test"),
        tokenExpiresAt: new Date(Date.now() + 3600000),
      },
    });
    const c = caller({ user: testUser });
    await c.disconnectProvider({ provider: "strava" });
    const remaining = await db.deviceConnection.findMany({
      where: { userId: testUser.id },
    });
    expect(remaining).toHaveLength(0);
  });
});
