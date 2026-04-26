import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import {
  computeCurrentStreak,
  sendRetentionNudge,
  type RetentionUser,
  type RetentionSendOptions,
} from "../src/lib/retention";
import { createNotification } from "../src/lib/notifications";
import { captureError } from "../src/lib/capture-error";

const mockCreateNotification = vi.mocked(createNotification);
const mockCaptureError = vi.mocked(captureError);

function makeDb(dates: string[]) {
  return {
    workout: {
      findMany: vi.fn().mockResolvedValue(
        dates.map((d) => ({ completedAt: new Date(d) })),
      ),
    },
  };
}

const BASE_USER: RetentionUser = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  currentStreak: 10,
  achievementCount: 5,
  lastWorkoutAt: new Date("2026-04-25T10:00:00Z"),
};

const BASE_OPTS: RetentionSendOptions = {
  subject: "Your streak is at risk",
  body: "Log in to keep your streak alive.",
  pushTitle: "Keep going!",
  pushBody: "Your streak is at risk.",
  linkPath: "/workouts",
  notificationType: "streak_recovery",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeCurrentStreak", () => {
  it("returns 0 when the user has no workouts", async () => {
    const db = makeDb([]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(0);
  });

  it("returns 1 for a single completed workout", async () => {
    const db = makeDb(["2026-04-25T12:00:00Z"]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(1);
  });

  it("returns the length of a consecutive-day run", async () => {
    const db = makeDb([
      "2026-04-25T10:00:00Z",
      "2026-04-24T10:00:00Z",
      "2026-04-23T10:00:00Z",
    ]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(3);
  });

  it("counts multiple workouts on the same UTC day as one streak day", async () => {
    const db = makeDb([
      "2026-04-25T09:00:00Z",
      "2026-04-25T18:30:00Z",
      "2026-04-24T11:00:00Z",
    ]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(2);
  });

  it("stops at the first gap (two-day gap resets streak to most-recent block)", async () => {
    const db = makeDb([
      "2026-04-25T10:00:00Z",
      "2026-04-24T10:00:00Z",
      // 2026-04-23 missing
      "2026-04-22T10:00:00Z",
    ]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(2);
  });

  it("returns 1 when only the most recent day is isolated (gap on both sides)", async () => {
    const db = makeDb([
      "2026-04-25T10:00:00Z",
      // 2026-04-24 missing — gap breaks streak
      "2026-04-23T10:00:00Z",
    ]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(1);
  });

  it("handles an unordered workout list correctly", async () => {
    // findMany returns in desc order per the real query, but computeCurrentStreak
    // re-sorts internally — verify it doesn't depend on input order.
    const db = makeDb([
      "2026-04-23T08:00:00Z",
      "2026-04-25T08:00:00Z",
      "2026-04-24T08:00:00Z",
    ]);
    expect(await computeCurrentStreak(db, "user-1")).toBe(3);
  });
});

describe("sendRetentionNudge", () => {
  it("creates a notification and returns delivered:true, emailSent:false when no resendSend is provided", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const db = {};

    const result = await sendRetentionNudge(db, BASE_USER, BASE_OPTS);

    expect(result).toEqual({ delivered: true, emailSent: false });
    expect(mockCreateNotification).toHaveBeenCalledWith(db, {
      userId: "user-1",
      type: "streak_recovery",
      title: "Keep going!",
      body: "Your streak is at risk.",
      linkPath: "/workouts",
    });
  });

  it("returns delivered:true, emailSent:true when resendSend succeeds", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const resendSend = vi.fn().mockResolvedValue(undefined);

    const result = await sendRetentionNudge({}, BASE_USER, {
      ...BASE_OPTS,
      resendSend,
    });

    expect(result).toEqual({ delivered: true, emailSent: true });
    expect(resendSend).toHaveBeenCalledWith({
      to: "alice@example.com",
      subject: "Your streak is at risk",
      text: "Log in to keep your streak alive.",
    });
  });

  it("returns delivered:true, emailSent:false when resendSend throws", async () => {
    mockCreateNotification.mockResolvedValue(undefined);
    const resendSend = vi.fn().mockRejectedValue(new Error("SMTP error"));

    const result = await sendRetentionNudge({}, BASE_USER, {
      ...BASE_OPTS,
      resendSend,
    });

    expect(result).toEqual({ delivered: true, emailSent: false });
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: "retention.streak_recovery.email",
        userId: "user-1",
      }),
    );
  });

  it("returns delivered:false when notification creation throws", async () => {
    mockCreateNotification.mockRejectedValue(new Error("DB error"));

    const result = await sendRetentionNudge({}, BASE_USER, BASE_OPTS);

    expect(result).toEqual({ delivered: false, emailSent: false });
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: "retention.streak_recovery.notification",
        userId: "user-1",
      }),
    );
  });

  it("does not attempt to send email when notification creation fails", async () => {
    mockCreateNotification.mockRejectedValue(new Error("timeout"));
    const resendSend = vi.fn();

    await sendRetentionNudge({}, BASE_USER, { ...BASE_OPTS, resendSend });

    expect(resendSend).not.toHaveBeenCalled();
  });

  it("uses reengagement as the notification type when specified", async () => {
    mockCreateNotification.mockResolvedValue(undefined);

    await sendRetentionNudge({}, BASE_USER, {
      ...BASE_OPTS,
      notificationType: "reengagement",
    });

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: "reengagement" }),
    );
  });
});
