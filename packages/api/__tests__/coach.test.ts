import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { coachRouter } from "../src/routers/coach";

const db = new PrismaClient();
const createCaller = createCallerFactory(coachRouter);

function coachCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let coachUser: ReturnType<typeof createTestUser>;
let athleteUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await cleanupTestData(db);
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  coachUser = createTestUser({ email: "coach@test.com", tier: "coach" });
  athleteUser = createTestUser({ email: "athlete@test.com", tier: "athlete" });

  await db.user.create({
    data: { id: coachUser.id, email: coachUser.email, name: "Test Coach" },
  });
  await db.user.create({
    data: { id: athleteUser.id, email: athleteUser.email, name: "Test Athlete" },
  });
});

describe("coach.addClient", () => {
  it("creates a pending assignment", async () => {
    const caller = coachCaller({ user: coachUser });
    const result = await caller.addClient({ athleteEmail: athleteUser.email });

    expect(result.assignmentId).toBeDefined();
    expect(result.athleteId).toBe(athleteUser.id);

    const assignment = await db.programAssignment.findUnique({
      where: { id: result.assignmentId },
    });
    expect(assignment?.status).toBe("pending");
  });

  it("rejects duplicate client", async () => {
    const caller = coachCaller({ user: coachUser });
    await caller.addClient({ athleteEmail: athleteUser.email });

    await expect(
      caller.addClient({ athleteEmail: athleteUser.email })
    ).rejects.toThrow("already your client");
  });

  it("rejects non-existent email", async () => {
    const caller = coachCaller({ user: coachUser });
    await expect(
      caller.addClient({ athleteEmail: "nobody@example.com" })
    ).rejects.toThrow("No user found");
  });

  it("enforces 25-client limit", async () => {
    // Create 25 dummy athletes and assign them
    const athletes: string[] = [];
    for (let i = 0; i < 25; i++) {
      const u = await db.user.create({
        data: { email: `limit-athlete-${i}@test.com`, name: `Limit Athlete ${i}` },
      });
      athletes.push(u.id);
      await db.programAssignment.create({
        data: { coachId: coachUser.id, athleteId: u.id, status: "active" },
      });
    }

    const caller = coachCaller({ user: coachUser });
    await expect(
      caller.addClient({ athleteEmail: athleteUser.email })
    ).rejects.toThrow("Client limit reached");
  });

  it("rejects non-coach tier", async () => {
    const caller = coachCaller({ user: athleteUser }); // athlete tier
    await expect(
      caller.addClient({ athleteEmail: coachUser.email })
    ).rejects.toThrow("Coach tier required");
  });
});

describe("coach.clients", () => {
  it("lists coach's clients", async () => {
    await db.programAssignment.create({
      data: { coachId: coachUser.id, athleteId: athleteUser.id, status: "active" },
    });

    const caller = coachCaller({ user: coachUser });
    const result = await caller.clients();

    expect(result.length).toBe(1);
    expect(result[0]!.athleteId).toBe(athleteUser.id);
    expect(result[0]!.status).toBe("active");
  });

  it("returns empty list when no clients", async () => {
    const caller = coachCaller({ user: coachUser });
    const result = await caller.clients();
    expect(result).toEqual([]);
  });
});

describe("coach.removeClient", () => {
  it("removes a client assignment", async () => {
    await db.programAssignment.create({
      data: { coachId: coachUser.id, athleteId: athleteUser.id, status: "active" },
    });

    const caller = coachCaller({ user: coachUser });
    const result = await caller.removeClient({ athleteId: athleteUser.id });

    expect(result.removed).toBe(1);

    const remaining = await db.programAssignment.findMany({
      where: { coachId: coachUser.id, athleteId: athleteUser.id },
    });
    expect(remaining.length).toBe(0);
  });

  it("throws NOT_FOUND when no assignment exists", async () => {
    const caller = coachCaller({ user: coachUser });
    await expect(
      caller.removeClient({ athleteId: athleteUser.id })
    ).rejects.toThrow("No assignments found");
  });
});
