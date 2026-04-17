import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/push", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import {
  formatWeeklySummaryText,
  formatWeeklySummaryPushBody,
  gatherWeeklySummary,
  sendWeeklySummaryForUser,
} from "../src/lib/weekly-summary";

function makeDb(opts: {
  user?: { id: string; name: string; email?: string; weeklySummaryEnabled?: boolean };
  workouts?: Array<{ completedAt?: Date | null; sets: Array<{ weightKg?: number | null; reps?: number | null; completed?: boolean }> }>;
  cardio?: Array<{ distanceMeters: number | null }>;
  prs?: Array<{ type: string; value: number; exercise: { name: string } }>;
  sleep?: Array<{ durationMins: number | null }>;
  recentCompletedDays?: Date[];
}) {
  const workouts = (opts.workouts ?? []).map((w) => ({
    id: "w",
    completedAt: w.completedAt ?? new Date(),
    workoutExercises: [{ sets: w.sets }],
  }));
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(
        opts.user
          ? { weeklySummaryEnabled: true, email: "test@example.com", ...opts.user }
          : null,
      ),
      update: vi.fn().mockResolvedValue({}),
    },
    workout: {
      findMany: vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve(workouts))
        .mockImplementation(() =>
          Promise.resolve(
            (opts.recentCompletedDays ?? []).map((d) => ({ completedAt: d })),
          ),
        ),
    },
    cardioSession: {
      findMany: vi.fn().mockResolvedValue(opts.cardio ?? []),
    },
    personalRecord: {
      findMany: vi.fn().mockResolvedValue(opts.prs ?? []),
    },
    sleepLog: {
      findMany: vi.fn().mockResolvedValue(opts.sleep ?? []),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
    },
    pushToken: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("gatherWeeklySummary", () => {
  it("returns null when user not found", async () => {
    const db = makeDb({});
    const result = await gatherWeeklySummary(db as never, "missing");
    expect(result).toBeNull();
  });

  it("computes total volume from completed sets only", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      workouts: [
        {
          sets: [
            { weightKg: 100, reps: 5, completed: true },   // 500 kg
            { weightKg: 100, reps: 5, completed: false },  // skipped (not completed)
            { weightKg: 80, reps: 10, completed: true },   // 800 kg
          ],
        },
      ],
    });
    const result = await gatherWeeklySummary(db as never, "u1");
    expect(result?.totalVolumeKg).toBe(1300);
    expect(result?.workoutsCompleted).toBe(1);
  });

  it("computes cardio distance in km rounded to 1dp", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      cardio: [{ distanceMeters: 5432 }, { distanceMeters: 10000 }],
    });
    const result = await gatherWeeklySummary(db as never, "u1");
    expect(result?.cardioSessions).toBe(2);
    expect(result?.cardioDistanceKm).toBe(15.4);
  });

  it("computes current streak from consecutive days", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      recentCompletedDays: [today, yesterday, twoDaysAgo],
    });
    const result = await gatherWeeklySummary(db as never, "u1");
    expect(result?.currentStreak).toBe(3);
  });

  it("returns zero streak when no workout today or yesterday", async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      recentCompletedDays: [threeDaysAgo],
    });
    const result = await gatherWeeklySummary(db as never, "u1");
    expect(result?.currentStreak).toBe(0);
  });

  it("computes average sleep hours", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      sleep: [{ durationMins: 480 }, { durationMins: 420 }, { durationMins: 540 }],
    });
    const result = await gatherWeeklySummary(db as never, "u1");
    // avg = 480 mins = 8h
    expect(result?.sleepAvgHours).toBe(8);
  });

  it("returns null sleep avg when no logs", async () => {
    const db = makeDb({ user: { id: "u1", name: "Alex" } });
    const result = await gatherWeeklySummary(db as never, "u1");
    expect(result?.sleepAvgHours).toBeNull();
  });
});

describe("formatWeeklySummaryText", () => {
  it("includes workouts, volume, and sign-off", () => {
    const text = formatWeeklySummaryText({
      userId: "u1",
      userName: "Alex",
      workoutsCompleted: 4,
      totalVolumeKg: 12500,
      cardioSessions: 0,
      cardioDistanceKm: 0,
      prsHit: 0,
      prDetails: [],
      currentStreak: 0,
      sleepAvgHours: null,
    });
    expect(text).toContain("Hi Alex");
    expect(text).toContain("4");
    expect(text).toContain("12,500");
    expect(text).toContain("The IronPulse team");
    expect(text).toContain("disable weekly summaries in Settings");
  });

  it("includes PR and streak sections only when present", () => {
    const withPR = formatWeeklySummaryText({
      userId: "u1",
      userName: "Alex",
      workoutsCompleted: 3,
      totalVolumeKg: 5000,
      cardioSessions: 2,
      cardioDistanceKm: 10,
      prsHit: 2,
      prDetails: [
        { exerciseName: "Bench", type: "weight", value: 100 },
        { exerciseName: "Squat", type: "reps", value: 12 },
      ],
      currentStreak: 7,
      sleepAvgHours: 7.5,
    });
    expect(withPR).toContain("🏆");
    expect(withPR).toContain("Bench");
    expect(withPR).toContain("🔥");
    expect(withPR).toContain("7 day");
    expect(withPR).toContain("7.5 hours");
    expect(withPR).toContain("🏃");
  });
});

describe("formatWeeklySummaryPushBody", () => {
  it("joins workout count with PRs and streak", () => {
    expect(
      formatWeeklySummaryPushBody({
        userId: "u1",
        userName: "Alex",
        workoutsCompleted: 4,
        totalVolumeKg: 10000,
        cardioSessions: 0,
        cardioDistanceKm: 0,
        prsHit: 2,
        prDetails: [],
        currentStreak: 10,
        sleepAvgHours: null,
      }),
    ).toBe("4 workouts · 2 PRs · 10-day streak");
  });

  it("omits PRs and streak when zero", () => {
    expect(
      formatWeeklySummaryPushBody({
        userId: "u1",
        userName: "Alex",
        workoutsCompleted: 1,
        totalVolumeKg: 500,
        cardioSessions: 0,
        cardioDistanceKm: 0,
        prsHit: 0,
        prDetails: [],
        currentStreak: 0,
        sleepAvgHours: null,
      }),
    ).toBe("1 workouts");
  });
});

describe("sendWeeklySummaryForUser", () => {
  it("skips users who opted out", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex", weeklySummaryEnabled: false },
    });
    const result = await sendWeeklySummaryForUser(db as never, "u1");
    expect(result).toEqual({ sent: false, skipped: "opted-out" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("skips when user has no activity in the window", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      // No workouts, no cardio
    });
    const result = await sendWeeklySummaryForUser(db as never, "u1");
    expect(result).toEqual({ sent: false, skipped: "no-activity" });
  });

  it("creates notification and updates timestamp when activity exists", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      workouts: [{ sets: [{ weightKg: 100, reps: 5, completed: true }] }],
    });
    const result = await sendWeeklySummaryForUser(db as never, "u1");
    expect(result).toEqual({ sent: true });
    expect(db.notification.create).toHaveBeenCalledTimes(1);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ weeklySummaryLastSentAt: expect.any(Date) }),
      }),
    );
  });

  it("calls resendSend when email enabled", async () => {
    const db = makeDb({
      user: { id: "u1", name: "Alex" },
      workouts: [{ sets: [{ weightKg: 100, reps: 5, completed: true }] }],
    });
    const resendSend = vi.fn().mockResolvedValue({});
    await sendWeeklySummaryForUser(db as never, "u1", {
      sendEmail: true,
      emailAddress: "alex@example.com",
      resendSend,
    });
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alex@example.com",
        subject: expect.stringContaining("weekly summary"),
      }),
    );
  });
});
