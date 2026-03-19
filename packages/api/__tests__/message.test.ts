import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { messageRouter } from "../src/routers/message";

const db = new PrismaClient();
const createCaller = createCallerFactory(messageRouter);

function messageCaller(session: { user: any } | null = null) {
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
  coachUser = createTestUser({ email: "msg-coach@test.com", tier: "coach" });
  athleteUser = createTestUser({ email: "msg-athlete@test.com", tier: "athlete" });

  await db.user.create({
    data: { id: coachUser.id, email: coachUser.email, name: "Msg Coach" },
  });
  await db.user.create({
    data: { id: athleteUser.id, email: athleteUser.email, name: "Msg Athlete" },
  });

  // Establish a coach-athlete relationship (required for messaging)
  await db.programAssignment.create({
    data: {
      coachId: coachUser.id,
      athleteId: athleteUser.id,
      status: "active",
    },
  });
});

describe("message.send", () => {
  it("creates a message from coach to athlete", async () => {
    const caller = messageCaller({ user: coachUser });
    const result = await caller.send({
      receiverId: athleteUser.id,
      content: "Hello athlete!",
    });

    expect(result.senderId).toBe(coachUser.id);
    expect(result.receiverId).toBe(athleteUser.id);
    expect(result.content).toBe("Hello athlete!");
    expect(result.readAt).toBeNull();
  });

  it("creates a message from athlete to coach", async () => {
    const caller = messageCaller({ user: athleteUser });
    const result = await caller.send({
      receiverId: coachUser.id,
      content: "Hello coach!",
    });

    expect(result.senderId).toBe(athleteUser.id);
    expect(result.receiverId).toBe(coachUser.id);
  });

  it("rejects sending to yourself", async () => {
    const caller = messageCaller({ user: coachUser });
    await expect(
      caller.send({ receiverId: coachUser.id, content: "Self message" })
    ).rejects.toThrow("Cannot send a message to yourself");
  });

  it("rejects messaging users without coach-athlete relationship", async () => {
    const strangerUser = createTestUser({ email: "stranger@test.com" });
    await db.user.create({
      data: { id: strangerUser.id, email: strangerUser.email, name: "Stranger" },
    });

    const caller = messageCaller({ user: coachUser });
    await expect(
      caller.send({ receiverId: strangerUser.id, content: "Hey stranger" })
    ).rejects.toThrow("coach-athlete relationship");
  });
});

describe("message.conversations", () => {
  it("lists conversation partners", async () => {
    await db.message.create({
      data: {
        senderId: coachUser.id,
        receiverId: athleteUser.id,
        content: "Hey there",
      },
    });

    const caller = messageCaller({ user: coachUser });
    const result = await caller.conversations();

    expect(result.length).toBe(1);
    expect(result[0]!.partnerId).toBe(athleteUser.id);
    expect(result[0]!.partnerName).toBe("Msg Athlete");
    expect(result[0]!.lastMessage).toBe("Hey there");
  });

  it("returns empty when no messages", async () => {
    const caller = messageCaller({ user: coachUser });
    const result = await caller.conversations();
    expect(result).toEqual([]);
  });

  it("counts unread messages from partner", async () => {
    // Athlete sends 2 messages to coach (unread)
    await db.message.create({
      data: { senderId: athleteUser.id, receiverId: coachUser.id, content: "Msg 1" },
    });
    await db.message.create({
      data: { senderId: athleteUser.id, receiverId: coachUser.id, content: "Msg 2" },
    });

    const caller = messageCaller({ user: coachUser });
    const result = await caller.conversations();

    expect(result[0]!.unreadCount).toBe(2);
  });
});

describe("message.history", () => {
  it("returns messages between two users", async () => {
    await db.message.create({
      data: { senderId: coachUser.id, receiverId: athleteUser.id, content: "Hi" },
    });
    await db.message.create({
      data: { senderId: athleteUser.id, receiverId: coachUser.id, content: "Hey!" },
    });

    const caller = messageCaller({ user: coachUser });
    const result = await caller.history({ partnerId: athleteUser.id, limit: 10 });

    expect(result.messages.length).toBe(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("paginates messages with cursor", async () => {
    // Create 5 messages with distinct timestamps (history returns newest first)
    const base = Date.now() - 10000;
    for (let i = 0; i < 5; i++) {
      await db.message.create({
        data: {
          senderId: coachUser.id,
          receiverId: athleteUser.id,
          content: `Message ${i}`,
          createdAt: new Date(base + i * 1000),
        },
      });
    }

    const caller = messageCaller({ user: coachUser });
    // limit=3 → take 4, get 5 messages? No, take=4. 5 rows but take=4, returns 4.
    // hasMore: 4 > 3 → true, pop → nextCursor = 4th message's createdAt ISO
    const page1 = await caller.history({ partnerId: athleteUser.id, limit: 3 });
    expect(page1.messages.length).toBe(3);
    expect(page1.nextCursor).toBeDefined();

    // Page 2: filter createdAt < nextCursor (older messages)
    const page2 = await caller.history({
      partnerId: athleteUser.id,
      limit: 3,
      cursor: page1.nextCursor,
    });
    // 2 older messages remain
    expect(page2.messages.length).toBeGreaterThan(0);
  });

  it("returns empty for users with no messages", async () => {
    const caller = messageCaller({ user: coachUser });
    const result = await caller.history({ partnerId: athleteUser.id, limit: 10 });
    expect(result.messages).toEqual([]);
  });
});

describe("message.markRead", () => {
  it("marks unread messages from partner as read", async () => {
    const msg1 = await db.message.create({
      data: { senderId: athleteUser.id, receiverId: coachUser.id, content: "Read me" },
    });
    const msg2 = await db.message.create({
      data: { senderId: athleteUser.id, receiverId: coachUser.id, content: "Read me too" },
    });

    const caller = messageCaller({ user: coachUser });
    const result = await caller.markRead({ partnerId: athleteUser.id });
    expect(result.markedRead).toBe(2);

    const updated1 = await db.message.findUnique({ where: { id: msg1.id } });
    const updated2 = await db.message.findUnique({ where: { id: msg2.id } });
    expect(updated1!.readAt).not.toBeNull();
    expect(updated2!.readAt).not.toBeNull();
  });

  it("returns 0 when no unread messages", async () => {
    const caller = messageCaller({ user: coachUser });
    const result = await caller.markRead({ partnerId: athleteUser.id });
    expect(result.markedRead).toBe(0);
  });
});
