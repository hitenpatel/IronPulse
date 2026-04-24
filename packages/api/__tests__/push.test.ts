import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendPushNotification } from "../src/lib/push";

type FetchLike = ReturnType<typeof vi.fn>;

function stubFetch(impl: () => Promise<Response>): FetchLike {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendPushNotification — request shape", () => {
  it("POSTs to the Expo Push API with the correct body", async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse({ data: { status: "ok", id: "t1" } })),
    );

    await sendPushNotification("ExponentPushToken[abc]", "Title", "Body", {
      screen: "workout",
      id: "123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    expect(init.method).toBe("POST");
    const parsed = JSON.parse(init.body);
    expect(parsed).toEqual({
      to: "ExponentPushToken[abc]",
      title: "Title",
      body: "Body",
      data: { screen: "workout", id: "123" },
      sound: "default",
    });
  });
});

describe("sendPushNotification — delivery classification", () => {
  it("returns delivered on a status:ok ticket", async () => {
    stubFetch(() =>
      Promise.resolve(jsonResponse({ data: { status: "ok", id: "t1" } })),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result).toEqual({ delivered: true, deadToken: false });
  });

  it("flags the token dead on DeviceNotRegistered", async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          data: {
            status: "error",
            message: "…",
            details: { error: "DeviceNotRegistered" },
          },
        }),
      ),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result.deadToken).toBe(true);
    expect(result.delivered).toBe(false);
    expect(result.error).toBe("DeviceNotRegistered");
  });

  it("flags the token dead on InvalidCredentials", async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          data: { status: "error", details: { error: "InvalidCredentials" } },
        }),
      ),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result.deadToken).toBe(true);
  });

  it("keeps the token on transient errors (MessageRateExceeded)", async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          data: {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
        }),
      ),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result.deadToken).toBe(false);
    expect(result.delivered).toBe(false);
  });

  it("treats non-OK HTTP responses as transient", async () => {
    stubFetch(() =>
      Promise.resolve(new Response("upstream down", { status: 503 })),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result).toEqual({
      delivered: false,
      deadToken: false,
      error: "Expo push API 503",
    });
  });

  it("treats fetch() rejections as transient", async () => {
    stubFetch(() => Promise.reject(new Error("ENOTFOUND exp.host")));
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result.deadToken).toBe(false);
    expect(result.error).toBe("ENOTFOUND exp.host");
  });

  it("normalises an array data response into a single ticket", async () => {
    stubFetch(() =>
      Promise.resolve(jsonResponse({ data: [{ status: "ok", id: "t1" }] })),
    );
    const result = await sendPushNotification("tok", "Hi", "body");
    expect(result.delivered).toBe(true);
  });
});
