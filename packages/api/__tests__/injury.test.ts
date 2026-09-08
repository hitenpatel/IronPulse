import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { injuryRouter } from "../src/routers/injury";

const db = new PrismaClient();
const createCaller = createCallerFactory(injuryRouter);

function injuryCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;
let otherUser: ReturnType<typeof createTestUser>;

beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "injury@test.com" });
  otherUser = createTestUser({ email: "other-injury@test.com" });
  await db.user.createMany({
    data: [
      { id: testUser.id, email: testUser.email, name: testUser.name },
      { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    ],
  });
});

describe("injury.log", () => {
  it("logs an injury with type, severity and body parts", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({
      injuredAt: new Date("2026-09-01"),
      injuryType: "strain",
      severity: 6,
      bodyParts: ["hamstrings", "glutes"],
      notes: "felt it on the second set",
    });
    expect(injury.userId).toBe(testUser.id);
    expect(injury.injuryType).toBe("strain");
    expect(injury.severity).toBe(6);
    expect(injury.bodyParts).toEqual(["hamstrings", "glutes"]);
    expect(injury.status).toBe("active");
  });

  it("rejects an unauthenticated caller", async () => {
    const caller = injuryCaller(null);
    await expect(
      caller.log({
        injuredAt: new Date(),
        injuryType: "soreness",
        severity: 2,
        bodyParts: ["calves"],
      })
    ).rejects.toThrow();
  });
});

describe("injury.list", () => {
  beforeEach(async () => {
    const caller = injuryCaller({ user: testUser });
    await caller.log({ injuredAt: new Date("2026-06-01"), injuryType: "sprain", severity: 5, bodyParts: ["ankle"] });
    await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 3, bodyParts: ["hamstrings"] });
    await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date("2026-08-02"), injuryType: "impact", severity: 9, bodyParts: ["shoulder"] },
    });
  });

  it("returns only the caller's injuries, newest first", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({});
    expect(data).toHaveLength(2);
    expect(data.every((i) => i.userId === testUser.id)).toBe(true);
    expect(data[0].injuryType).toBe("strain");
  });

  it("filters by body part", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({ bodyPart: "ankle" });
    expect(data).toHaveLength(1);
    expect(data[0].bodyParts).toContain("ankle");
  });

  it("filters by date range", async () => {
    const { data } = await injuryCaller({ user: testUser }).list({
      from: new Date("2026-07-01"),
      to: new Date("2026-09-01"),
    });
    expect(data).toHaveLength(1);
    expect(data[0].injuryType).toBe("strain");
  });
});

describe("injury.getById", () => {
  it("returns the caller's injury by id", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 4, bodyParts: ["quadriceps"] });
    const { injury: fetched } = await caller.getById({ id: injury.id });
    expect(fetched.id).toBe(injury.id);
    expect(fetched.userId).toBe(testUser.id);
  });

  it("throws NOT_FOUND for another user's injury id", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 8, bodyParts: ["shoulder"] },
    });
    await expect(
      injuryCaller({ user: testUser }).getById({ id: foreign.id })
    ).rejects.toThrow();
  });
});

describe("injury.update", () => {
  it("marks an injury resolved", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 4, bodyParts: ["quadriceps"] });
    const { injury: updated } = await caller.update({
      id: injury.id,
      status: "resolved",
      resolvedAt: new Date("2026-09-01"),
    });
    expect(updated.status).toBe("resolved");
    expect(updated.resolvedAt).toEqual(new Date("2026-09-01"));
  });

  it("cannot update another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 8, bodyParts: ["shoulder"] },
    });
    await expect(
      injuryCaller({ user: testUser }).update({ id: foreign.id, severity: 1 })
    ).rejects.toThrow();
    const untouched = await db.injuryLog.findUnique({ where: { id: foreign.id } });
    expect(untouched?.severity).toBe(8);
  });
});

describe("injury.delete", () => {
  it("deletes the caller's injury", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date(), injuryType: "soreness", severity: 2, bodyParts: ["lats"] });
    await caller.delete({ id: injury.id });
    expect(await db.injuryLog.findUnique({ where: { id: injury.id } })).toBeNull();
  });

  it("cannot delete another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 8, bodyParts: ["shoulder"] },
    });
    await expect(injuryCaller({ user: testUser }).delete({ id: foreign.id })).rejects.toThrow();
    expect(await db.injuryLog.findUnique({ where: { id: foreign.id } })).not.toBeNull();
  });
});
