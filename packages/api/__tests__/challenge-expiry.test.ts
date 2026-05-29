import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import {
  findExpiringChallengeMembers,
  sendChallengeExpiryReminder,
  type ChallengeExpiryCandidate,
} from "../src/lib/challenge-expiry";
import { createNotification } from "../src/lib/notifications";
import { captureError } from "../src/lib/capture-error";

const mockCreateNotification = vi.mocked(createNotification);
const mockCaptureError = vi.mocked(captureError);

const NOW = new Date("2026-05-29T00:00:00Z");
const THREE_DAYS_FROM_NOW = new Date("2026-06-01T00:00:00Z");

function makeParticipant(
  userId: string,
  progress: number,
  opts: {
    email?: string;
    name?: string;
    weeklySummaryEnabled?: boolean;
    deletionRequestedAt?: Date | null;
  } = {},
) {
  return {
    user: {
      id: userId,
      email: opts.email ?? `${userId}@example.com`,
      name: opts.name ?? null,
      weeklySummaryEnabled: opts.weeklySummaryEnabled ?? true,
      deletionRequestedAt: opts.deletionRequestedAt ?? null,
    },
    progress,
  };
}

function makeDb(
  challenges: {
    id: string;
    name: string;
    endsAt: Date;
    participants: ReturnType<typeof makeParticipant>[];
  }[],
  recentNotification: { id: string } | null = null,
) {
  return {
    challenge: {
      findMany: vi.fn().mockResolvedValue(challenges),
    },
    notification: {
      findFirst: vi.fn().mockResolvedValue(recentNotification),
    },
  };
}

const BASE_CHALLENGE = {
  id: "challenge-1",
  name: "May Squat Challenge",
  endsAt: THREE_DAYS_FROM_NOW,
};

const BASE_CANDIDATE: ChallengeExpiryCandidate = {
  userId: "user-1",
  userEmail: "alice@example.com",
  userName: "Alice Smith",
  challengeId: "challenge-1",
  challengeName: "May Squat Challenge",
  challengeEndsAt: THREE_DAYS_FROM_NOW,
  rank: 2,
  participantCount: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("findExpiringChallengeMembers", () => {
  it("queries challenges ending 2–4 days from now (AC1)", async () => {
    const db = makeDb([]);

    await findExpiringChallengeMembers(db);

    const twoDaysFromNow = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(NOW.getTime() + 4 * 24 * 60 * 60 * 1000);
    expect(db.challenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          endsAt: { gte: twoDaysFromNow, lt: fourDaysFromNow },
        }),
      }),
    );
  });

  it("returns a candidate entry for each eligible participant (AC1)", async () => {
    const db = makeDb([
      {
        ...BASE_CHALLENGE,
        participants: [
          makeParticipant("user-1", 100),
          makeParticipant("user-2", 80),
        ],
      },
    ]);

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      userId: "user-1",
      challengeId: "challenge-1",
      challengeName: "May Squat Challenge",
      challengeEndsAt: THREE_DAYS_FROM_NOW,
      rank: 1,
      participantCount: 2,
    });
    expect(results[1]).toMatchObject({ userId: "user-2", rank: 2 });
  });

  it("assigns rank 1 to the participant with the highest progress (AC1)", async () => {
    const db = makeDb([
      {
        ...BASE_CHALLENGE,
        participants: [
          makeParticipant("user-gold", 300),
          makeParticipant("user-silver", 200),
          makeParticipant("user-bronze", 100),
        ],
      },
    ]);

    const results = await findExpiringChallengeMembers(db);

    expect(results[0]).toMatchObject({ userId: "user-gold", rank: 1 });
    expect(results[1]).toMatchObject({ userId: "user-silver", rank: 2 });
    expect(results[2]).toMatchObject({ userId: "user-bronze", rank: 3 });
  });

  it("skips users with weeklySummaryEnabled=false to respect notification preferences (AC4)", async () => {
    const db = makeDb([
      {
        ...BASE_CHALLENGE,
        participants: [
          makeParticipant("user-opted-out", 100, { weeklySummaryEnabled: false }),
          makeParticipant("user-opted-in", 80, { weeklySummaryEnabled: true }),
        ],
      },
    ]);

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe("user-opted-in");
  });

  it("skips users with a pending deletion request (AC4)", async () => {
    const db = makeDb([
      {
        ...BASE_CHALLENGE,
        participants: [
          makeParticipant("user-deleting", 100, { deletionRequestedAt: new Date() }),
          makeParticipant("user-active", 80),
        ],
      },
    ]);

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe("user-active");
  });

  it("skips users already sent a challenge_expiry notification in the last 24h (AC3)", async () => {
    const db = makeDb(
      [{ ...BASE_CHALLENGE, participants: [makeParticipant("user-1", 100)] }],
      { id: "notif-existing" },
    );

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(0);
    expect(db.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          type: "challenge_expiry",
          createdAt: { gte: new Date(NOW.getTime() - 24 * 60 * 60 * 1000) },
        }),
      }),
    );
  });

  it("includes users with no recent challenge_expiry notification (AC3)", async () => {
    const db = makeDb(
      [{ ...BASE_CHALLENGE, participants: [makeParticipant("user-1", 100)] }],
      null,
    );

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe("user-1");
  });

  it("returns an empty list when no challenges are found (AC1)", async () => {
    const db = makeDb([]);

    const results = await findExpiringChallengeMembers(db);

    expect(results).toHaveLength(0);
  });
});

describe("sendChallengeExpiryReminder", () => {
  it("creates a challenge_expiry in-app notification with challenge name and link (AC2)", async () => {
    mockCreateNotification.mockResolvedValue(undefined);

    await sendChallengeExpiryReminder({}, BASE_CANDIDATE);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user-1",
        type: "challenge_expiry",
        title: expect.stringContaining("May Squat Challenge"),
        linkPath: "/challenges/challenge-1",
        data: { challengeId: "challenge-1" },
      }),
    );
  });

  it("includes rank and participant count in the notification body (AC2)", async () => {
    mockCreateNotification.mockResolvedValue(undefined);

    await sendChallengeExpiryReminder({}, BASE_CANDIDATE);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining("#2"),
      }),
    );
  });

  it("sends email with challenge name, deadline, ranking and link (AC2)", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const resendSend = vi.fn().mockResolvedValue(undefined);

    const result = await sendChallengeExpiryReminder({}, BASE_CANDIDATE, { resendSend });

    expect(result).toEqual({ delivered: true, emailSent: true });
    expect(resendSend).toHaveBeenCalledWith({
      to: "alice@example.com",
      subject: expect.stringContaining("May Squat Challenge"),
      text: expect.stringContaining("ranked 2nd out of 10"),
    });
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("ironpulse.app/challenges/challenge-1"),
      }),
    );
  });

  it("includes the challenge deadline in the email body (AC2)", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const resendSend = vi.fn().mockResolvedValue(undefined);

    await sendChallengeExpiryReminder({}, BASE_CANDIDATE, { resendSend });

    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("June 2026"),
      }),
    );
  });

  it("returns delivered:true, emailSent:false when no resendSend is provided", async () => {
    mockCreateNotification.mockResolvedValue(undefined);

    const result = await sendChallengeExpiryReminder({}, BASE_CANDIDATE);

    expect(result).toEqual({ delivered: true, emailSent: false });
  });

  it("returns delivered:false when notification creation throws", async () => {
    mockCreateNotification.mockRejectedValue(new Error("DB unavailable"));

    const result = await sendChallengeExpiryReminder({}, BASE_CANDIDATE);

    expect(result).toEqual({ delivered: false, emailSent: false });
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: "challengeExpiry.notification",
        userId: "user-1",
        challengeId: "challenge-1",
      }),
    );
  });

  it("returns delivered:true, emailSent:false when the email send fails", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const resendSend = vi.fn().mockRejectedValue(new Error("SMTP error"));

    const result = await sendChallengeExpiryReminder({}, BASE_CANDIDATE, { resendSend });

    expect(result).toEqual({ delivered: true, emailSent: false });
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ context: "challengeExpiry.email", userId: "user-1" }),
    );
  });

  it("does not attempt email when notification creation fails", async () => {
    mockCreateNotification.mockRejectedValue(new Error("timeout"));
    const resendSend = vi.fn();

    await sendChallengeExpiryReminder({}, BASE_CANDIDATE, { resendSend });

    expect(resendSend).not.toHaveBeenCalled();
  });
});
