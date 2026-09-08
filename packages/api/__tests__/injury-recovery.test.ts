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
  testUser = createTestUser({ email: "recovery@test.com" });
  otherUser = createTestUser({ email: "other-recovery@test.com" });
  await db.user.createMany({
    data: [
      { id: testUser.id, email: testUser.email, name: testUser.name },
      { id: otherUser.id, email: otherUser.email, name: otherUser.name },
    ],
  });
});

describe("injury.logRecovery", () => {
  it("logs a recovery activity against the caller's injury", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    const { activity } = await caller.logRecovery({
      injuryId: injury.id,
      performedAt: new Date("2026-08-03"),
      modality: "physical_therapy",
      durationMins: 45,
    });
    expect(activity.injuryId).toBe(injury.id);
    expect(activity.userId).toBe(testUser.id);
    expect(activity.modality).toBe("physical_therapy");
  });

  it("refuses to attach recovery to another user's injury", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date(), injuryType: "impact", severity: 7, bodyParts: ["shoulder"] },
    });
    await expect(
      injuryCaller({ user: testUser }).logRecovery({
        injuryId: foreign.id,
        performedAt: new Date(),
        modality: "rest_day",
      })
    ).rejects.toThrow();
    expect(await db.recoveryActivity.count()).toBe(0);
  });
});

describe("injury.listRecovery", () => {
  it("returns the caller's activities for one injury, newest first", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date("2026-08-02"), modality: "ice" });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date("2026-08-05"), modality: "mobility" });
    const { data } = await caller.listRecovery({ injuryId: injury.id });
    expect(data).toHaveLength(2);
    expect(data[0].modality).toBe("mobility");
  });
});

describe("injury.addRestriction / listRestrictions", () => {
  it("creates a restriction and returns it as active on a date inside its window", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 6, bodyParts: ["quadriceps"] });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["quadriceps"],
      note: "no squats",
      startsAt: new Date("2026-08-01"),
      expiresAt: new Date("2026-08-15"),
    });
    const { data } = await caller.listRestrictions({ activeOn: new Date("2026-08-10") });
    expect(data).toHaveLength(1);
    expect(data[0].muscleGroups).toEqual(["quadriceps"]);
    expect(data[0].note).toBe("no squats");
  });

  it("excludes restrictions whose window has passed", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-06-01"), injuryType: "sprain", severity: 4, bodyParts: ["ankle"] });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["calves"],
      startsAt: new Date("2026-06-01"),
      expiresAt: new Date("2026-06-15"),
    });
    const { data } = await caller.listRestrictions({ activeOn: new Date("2026-09-01") });
    expect(data).toHaveLength(0);
  });

  it("never returns another user's restrictions", async () => {
    const foreign = await db.injuryLog.create({
      data: { userId: otherUser.id, injuredAt: new Date("2026-08-01"), injuryType: "impact", severity: 7, bodyParts: ["shoulder"] },
    });
    await db.exerciseRestriction.create({
      data: {
        userId: otherUser.id,
        injuryId: foreign.id,
        muscleGroups: ["deltoids"],
        startsAt: new Date("2026-08-01"),
        expiresAt: new Date("2026-12-01"),
      },
    });
    const { data } = await injuryCaller({ user: testUser }).listRestrictions({ activeOn: new Date("2026-09-01") });
    expect(data).toHaveLength(0);
  });
});

describe("injury.delete cascade", () => {
  it("removes the injury's recovery activities and restrictions", async () => {
    const caller = injuryCaller({ user: testUser });
    const { injury } = await caller.log({ injuredAt: new Date("2026-08-01"), injuryType: "strain", severity: 5, bodyParts: ["hamstrings"] });
    await caller.logRecovery({ injuryId: injury.id, performedAt: new Date(), modality: "massage" });
    await caller.addRestriction({
      injuryId: injury.id,
      muscleGroups: ["hamstrings"],
      startsAt: new Date("2026-08-01"),
      expiresAt: new Date("2026-09-30"),
    });
    await caller.delete({ id: injury.id });
    expect(await db.recoveryActivity.count()).toBe(0);
    expect(await db.exerciseRestriction.count()).toBe(0);
  });
});
