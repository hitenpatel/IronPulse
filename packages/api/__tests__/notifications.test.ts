import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock push and capture-error before importing notifications
vi.mock("../src/lib/push", () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import {
  notifyAchievement,
  notifyNewMessage,
  notifyNewPR,
} from "../src/lib/notifications";
import { ACHIEVEMENT_CATALOG } from "@ironpulse/shared";
import { sendPushNotification } from "../src/lib/push";
import { captureError } from "../src/lib/capture-error";

const mockSend = vi.mocked(sendPushNotification);
const mockCapture = vi.mocked(captureError);

function mockDb(tokens: string[]) {
  return {
    pushToken: {
      findMany: vi.fn().mockResolvedValue(tokens.map((t) => ({ token: t }))),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyNewPR", () => {
  it("sends push notification for each token", async () => {
    mockSend.mockResolvedValue(undefined);
    const db = mockDb(["token-a", "token-b"]);

    await notifyNewPR(db, "user-1", "Bench Press", "Est. 1RM: 100kg");

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith("token-a", "New PR!", "Bench Press — Est. 1RM: 100kg");
    expect(mockSend).toHaveBeenCalledWith("token-b", "New PR!", "Bench Press — Est. 1RM: 100kg");
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("captures error via Sentry when push fails", async () => {
    const pushError = new Error("push failed");
    mockSend.mockRejectedValue(pushError);
    const db = mockDb(["token-a"]);

    await notifyNewPR(db, "user-1", "Squat", "Volume: 5000kg");

    expect(mockCapture).toHaveBeenCalledWith(
      pushError,
      expect.objectContaining({
        context: "createNotification.push",
        userId: "user-1",
        type: "pr",
      }),
    );
  });

  it("does not throw when push fails", async () => {
    mockSend.mockRejectedValue(new Error("network error"));
    const db = mockDb(["token-a"]);

    await expect(
      notifyNewPR(db, "user-1", "Deadlift", "100kg"),
    ).resolves.toBeUndefined();
  });
});

describe("notifyNewMessage", () => {
  it("sends push notification for each token", async () => {
    mockSend.mockResolvedValue(undefined);
    const db = mockDb(["token-x"]);

    await notifyNewMessage(db, "receiver-1", "Alice");

    expect(mockSend).toHaveBeenCalledWith("token-x", "New Message", "From Alice");
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("captures error via Sentry when push fails", async () => {
    const pushError = new Error("invalid token");
    mockSend.mockRejectedValue(pushError);
    const db = mockDb(["token-x"]);

    await notifyNewMessage(db, "receiver-1", "Bob");

    expect(mockCapture).toHaveBeenCalledWith(
      pushError,
      expect.objectContaining({
        context: "createNotification.push",
        userId: "receiver-1",
        type: "message",
      }),
    );
  });

  it("does not throw when push fails", async () => {
    mockSend.mockRejectedValue(new Error("timeout"));
    const db = mockDb(["token-x"]);

    await expect(
      notifyNewMessage(db, "receiver-1", "Charlie"),
    ).resolves.toBeUndefined();
  });
});

describe("notifyAchievement", () => {
  it("pushes a notification with the badge's label and description", async () => {
    mockSend.mockResolvedValue(undefined);
    const db = mockDb(["token-a"]);
    const badge = ACHIEVEMENT_CATALOG.find((b) => b.type === "streak_7")!;

    await notifyAchievement(db, "user-1", badge);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [token, title, body] = mockSend.mock.calls[0]!;
    expect(token).toBe("token-a");
    expect(title).toContain(badge.label);
    expect(body).toBe(badge.description);
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
