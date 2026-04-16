import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPushNotification } from "../src/lib/push";

const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

describe("sendPushNotification", () => {
  it("calls fetch with Expo Push API URL", async () => {
    await sendPushNotification("ExponentPushToken[abc]", "Title", "Body");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://exp.host/--/api/v2/push/send",
    );
  });

  it("sends correct JSON body with token, title, body, and sound", async () => {
    await sendPushNotification("ExponentPushToken[abc]", "My Title", "My Body");

    const call = mockFetch.mock.calls[0];
    const options = call[1];
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(options.body);
    expect(body.to).toBe("ExponentPushToken[abc]");
    expect(body.title).toBe("My Title");
    expect(body.body).toBe("My Body");
    expect(body.sound).toBe("default");
  });

  it("includes data when provided", async () => {
    await sendPushNotification("ExponentPushToken[abc]", "T", "B", {
      screen: "workout",
      id: "123",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data).toEqual({ screen: "workout", id: "123" });
  });

  it("does not include data when not provided", async () => {
    await sendPushNotification("ExponentPushToken[abc]", "T", "B");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data).toBeUndefined();
  });
});
