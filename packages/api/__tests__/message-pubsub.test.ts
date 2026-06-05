import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  let capturedHandlers: Array<(ch: string, msg: string) => void> = [];
  return {
    mockPublish: vi.fn().mockResolvedValue(1),
    mockSubscribe: vi.fn().mockResolvedValue(undefined),
    mockUnsubscribe: vi.fn().mockResolvedValue(undefined),
    mockRemoveListener: vi.fn(),
    mockOn: vi.fn((event: string, handler: unknown) => {
      if (event === "message")
        capturedHandlers.push(handler as (ch: string, msg: string) => void);
    }),
    getCapturedHandlers: () => capturedHandlers,
    resetCapturedHandlers: () => { capturedHandlers = []; },
  };
});

vi.mock("ioredis", () => {
  class MockRedis {
    publish = mocks.mockPublish;
    subscribe = mocks.mockSubscribe;
    unsubscribe = mocks.mockUnsubscribe;
    on = mocks.mockOn;
    removeListener = mocks.mockRemoveListener;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_url: string, _opts?: unknown) {}
  }
  return { default: MockRedis };
});

import { publishNewMessage, subscribeToMessages } from "../src/lib/message-pubsub";

beforeEach(() => {
  mocks.mockPublish.mockClear();
  mocks.mockSubscribe.mockClear();
  mocks.mockUnsubscribe.mockClear();
  mocks.mockOn.mockClear();
  mocks.mockRemoveListener.mockClear();
  mocks.resetCapturedHandlers();
});

describe("publishNewMessage", () => {
  it("publishes to a channel prefixed with 'messages:'", async () => {
    await publishNewMessage("user-abc", { type: "new_message" });
    expect(mocks.mockPublish).toHaveBeenCalledWith(
      "messages:user-abc",
      expect.any(String),
    );
  });

  it("serialises the payload as JSON", async () => {
    const payload = { type: "new_message", from: "user-xyz" };
    await publishNewMessage("user-abc", payload);
    const [, body] = mocks.mockPublish.mock.calls[0]!;
    expect(JSON.parse(body as string)).toEqual(payload);
  });

  it("publishes once per call", async () => {
    await publishNewMessage("user-1", {});
    await publishNewMessage("user-2", {});
    expect(mocks.mockPublish).toHaveBeenCalledTimes(2);
  });
});

describe("subscribeToMessages", () => {
  it("subscribes to a channel prefixed with 'messages:'", () => {
    subscribeToMessages("user-abc", () => {});
    expect(mocks.mockSubscribe).toHaveBeenCalledWith("messages:user-abc");
  });

  it("registers a 'message' listener on the subscriber", () => {
    subscribeToMessages("user-abc", () => {});
    expect(mocks.mockOn).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("invokes onMessage with parsed payload when message arrives on the subscribed channel", () => {
    const onMessage = vi.fn();
    subscribeToMessages("user-123", onMessage);
    const payload = { text: "hello" };
    mocks.getCapturedHandlers().at(-1)!("messages:user-123", JSON.stringify(payload));
    expect(onMessage).toHaveBeenCalledWith(payload);
  });

  it("does not invoke onMessage for messages on other channels", () => {
    const onMessage = vi.fn();
    subscribeToMessages("user-123", onMessage);
    mocks.getCapturedHandlers().at(-1)!("messages:user-999", JSON.stringify({ text: "hi" }));
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("silently drops invalid JSON without throwing", () => {
    const onMessage = vi.fn();
    subscribeToMessages("user-123", onMessage);
    expect(() =>
      mocks.getCapturedHandlers().at(-1)!("messages:user-123", "not-json"),
    ).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function that calls unsubscribe and removeListener", () => {
    const onMessage = vi.fn();
    const unsubscribe = subscribeToMessages("user-abc", onMessage);
    const handler = mocks.getCapturedHandlers().at(-1)!;
    unsubscribe();
    expect(mocks.mockUnsubscribe).toHaveBeenCalledWith("messages:user-abc");
    expect(mocks.mockRemoveListener).toHaveBeenCalledWith("message", handler);
  });
});
