import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@zor/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { programRouter } from "../src/routers/program";

const db = new PrismaClient();
const createCaller = createCallerFactory(programRouter);

function programCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let coachUser: ReturnType<typeof createTestUser>;
let otherCoachUser: ReturnType<typeof createTestUser>;
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
  otherCoachUser = createTestUser({ email: "other-coach@test.com", tier: "coach" });
  athleteUser = createTestUser({ email: "athlete@test.com", tier: "athlete" });

  await db.user.create({
    data: { id: coachUser.id, email: coachUser.email, name: "Test Coach" },
  });
  await db.user.create({
    data: { id: otherCoachUser.id, email: otherCoachUser.email, name: "Other Coach" },
  });
  await db.user.create({
    data: { id: athleteUser.id, email: athleteUser.email, name: "Test Athlete" },
  });
});

function schedule() {
  return { "1": { monday: "rest", tuesday: "push-day" } };
}

describe("program.create", () => {
  it("creates a program owned by the coach", async () => {
    const caller = programCaller({ user: coachUser });
    const result = await caller.create({
      name: "12-Week Strength",
      description: "A base strength program",
      durationWeeks: 12,
      schedule: schedule(),
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("12-Week Strength");
    expect(result.durationWeeks).toBe(12);

    const stored = await db.program.findUnique({ where: { id: result.id } });
    expect(stored?.coachId).toBe(coachUser.id);
  });

  it("rejects non-coach tier", async () => {
    const caller = programCaller({ user: athleteUser });
    await expect(
      caller.create({
        name: "Should Fail",
        durationWeeks: 4,
        schedule: schedule(),
      })
    ).rejects.toThrow("Coach tier required");

    expect(await db.program.count()).toBe(0);
  });
});

describe("program.assign", () => {
  it("assigns an athlete to the coach's program", async () => {
    const caller = programCaller({ user: coachUser });
    const program = await caller.create({
      name: "Assign Me",
      durationWeeks: 8,
      schedule: schedule(),
    });

    const result = await caller.assign({
      programId: program.id,
      athleteId: athleteUser.id,
      startDate: "2026-01-05",
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe("active");
    expect(result.athleteId).toBe(athleteUser.id);
    expect(result.coachId).toBe(coachUser.id);

    const stored = await db.programAssignment.findUnique({ where: { id: result.id } });
    expect(stored?.programId).toBe(program.id);
    expect(stored?.startedAt.toISOString().slice(0, 10)).toBe("2026-01-05");
  });

  it("rejects assigning to a program the coach does not own", async () => {
    const owned = await db.program.create({
      data: {
        coachId: otherCoachUser.id,
        name: "Not Yours",
        durationWeeks: 4,
        schedule: schedule(),
      },
    });

    const caller = programCaller({ user: coachUser });
    await expect(
      caller.assign({
        programId: owned.id,
        athleteId: athleteUser.id,
        startDate: "2026-01-05",
      })
    ).rejects.toThrow("Program not found");

    expect(await db.programAssignment.count()).toBe(0);
  });

  it("rejects non-coach tier", async () => {
    const program = await db.program.create({
      data: { coachId: coachUser.id, name: "Gated", durationWeeks: 4, schedule: schedule() },
    });

    const caller = programCaller({ user: athleteUser });
    await expect(
      caller.assign({
        programId: program.id,
        athleteId: athleteUser.id,
        startDate: "2026-01-05",
      })
    ).rejects.toThrow("Coach tier required");
  });
});

describe("program.update", () => {
  it("updates a program's fields", async () => {
    const caller = programCaller({ user: coachUser });
    const program = await caller.create({
      name: "Original Name",
      durationWeeks: 6,
      schedule: schedule(),
    });

    const updated = await caller.update({
      id: program.id,
      name: "Renamed",
      description: "Updated description",
      durationWeeks: 10,
      schedule: schedule(),
    });

    expect(updated.name).toBe("Renamed");
    expect(updated.durationWeeks).toBe(10);
    expect(updated.description).toBe("Updated description");
  });

  it("rejects updating another coach's program", async () => {
    const owned = await db.program.create({
      data: { coachId: otherCoachUser.id, name: "Not Yours", durationWeeks: 4, schedule: schedule() },
    });

    const caller = programCaller({ user: coachUser });
    await expect(
      caller.update({
        id: owned.id,
        name: "Hijacked",
        durationWeeks: 4,
        schedule: schedule(),
      })
    ).rejects.toThrow("Program not found");

    const stillOriginal = await db.program.findUnique({ where: { id: owned.id } });
    expect(stillOriginal?.name).toBe("Not Yours");
  });

  it("rejects non-coach tier", async () => {
    const program = await db.program.create({
      data: { coachId: coachUser.id, name: "Gated", durationWeeks: 4, schedule: schedule() },
    });

    const caller = programCaller({ user: athleteUser });
    await expect(
      caller.update({ id: program.id, name: "X", durationWeeks: 4, schedule: schedule() })
    ).rejects.toThrow("Coach tier required");
  });
});

describe("program.delete", () => {
  it("deletes the coach's program", async () => {
    const caller = programCaller({ user: coachUser });
    const program = await caller.create({
      name: "To Delete",
      durationWeeks: 4,
      schedule: schedule(),
    });

    const result = await caller.delete({ id: program.id });
    expect(result.deleted).toBe(true);

    expect(await db.program.findUnique({ where: { id: program.id } })).toBeNull();
  });

  it("rejects deleting another coach's program", async () => {
    const owned = await db.program.create({
      data: { coachId: otherCoachUser.id, name: "Not Yours", durationWeeks: 4, schedule: schedule() },
    });

    const caller = programCaller({ user: coachUser });
    await expect(caller.delete({ id: owned.id })).rejects.toThrow("Program not found");

    expect(await db.program.findUnique({ where: { id: owned.id } })).not.toBeNull();
  });

  it("rejects non-coach tier", async () => {
    const program = await db.program.create({
      data: { coachId: coachUser.id, name: "Gated", durationWeeks: 4, schedule: schedule() },
    });

    const caller = programCaller({ user: athleteUser });
    await expect(caller.delete({ id: program.id })).rejects.toThrow("Coach tier required");

    expect(await db.program.findUnique({ where: { id: program.id } })).not.toBeNull();
  });
});
