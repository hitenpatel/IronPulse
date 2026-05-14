import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPublish = vi.fn().mockResolvedValue(1);
const mockSubscribe = vi.fn().mockResolvedValue("OK");
const mockUnsubscribe = vi.fn().mockResolvedValue("OK");
const mockOn = vi.fn();
const mockRemoveListener = vi.fn();

const MockRedis = vi.fn(() => ({
  publish: mockPublish,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  on: mockOn,
  removeListener: mockRemoveListener,
}));

vi.mock("ioredis", () => ({ default: MockRedis }));

beforeEach(() => {
  vi.resetModules();
  MockRedis.mockClear();
  mockPublish.mockClear();
  mockSubscribe.mockClear();
  mockUnsubscribe.mockClear();
  mockOn.mockClear();
  mockRemoveListener.mockClear();
});

afterEach(() => {
  delete process.env.REDIS_URL;
});

async function importFresh() {
  return import("../src/lib/message-pubsub");
}

function getMessageHandler() {
  const call = mockOn.mock.calls.find(([event]: [string]) => event === "message");
  return call?.[1] as ((ch: string, msg: string) => void) | undefined;
}

describe("publishNewMessage", () => {
  it("publishes to messages:<receiverId> with JSON-serialized payload", async () => {
    const { publishNewMessage } = await importFresh();
    const payload = { id: "msg-1", text: "hello" };
    await publishNewMessage("user-abc", payload);
    expect(mockPublish).toHaveBeenCalledOnce();
    expect(mockPublish).toHaveBeenCalledWith(
      "messages:user-abc",
      JSON.stringify(payload),
    );
  });

  it("reuses the same publisher instance across calls (singleton)", async () => {
    const { publishNewMessage } = await importFresh();
    await publishNewMessage("u1", {});
    await publishNewMessage("u2", {});
    expect(MockRedis).toHaveBeenCalledOnce();
  });

  it("creates the publisher with REDIS_URL from env when set", async () => {
    process.env.REDIS_URL = "redis://custom-host:6380";
    const { publishNewMessage } = await importFresh();
    await publishNewMessage("u1", {});
    expect(MockRedis).toHaveBeenCalledWith(
      "redis://custom-host:6380",
      expect.any(Object),
    );
  });

  it("falls back to redis://localhost:6379 when REDIS_URL is unset", async () => {
    delete process.env.REDIS_URL;
    const { publishNewMessage } = await importFresh();
    await publishNewMessage("u1", {});
    expect(MockRedis).toHaveBeenCalledWith(
      "redis://localhost:6379",
      expect.any(Object),
    );
  });
});

describe("subscribeToMessages", () => {
  it("subscribes to the messages:<userId> channel", async () => {
    const { subscribeToMessages } = await importFresh();
    subscribeToMessages("user-xyz", vi.fn());
    expect(mockSubscribe).toHaveBeenCalledWith("messages:user-xyz");
  });

  it("calls onMessage with the parsed payload when a matching message arrives", async () => {
    const { subscribeToMessages } = await importFresh();
    const onMessage = vi.fn();
    subscribeToMessages("user-xyz", onMessage);
    const handler = getMessageHandler();
    expect(handler).toBeDefined();
    const payload = { id: "msg-1", senderId: "u2" };
    handler!("messages:user-xyz", JSON.stringify(payload));
    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith(payload);
  });

  it("does not call onMessage for messages on a different channel", async () => {
    const { subscribeToMessages } = await importFresh();
    const onMessage = vi.fn();
    subscribeToMessages("user-xyz", onMessage);
    const handler = getMessageHandler();
    handler!("messages:other-user", JSON.stringify({ id: "msg-2" }));
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("silently ignores invalid JSON without throwing", async () => {
    const { subscribeToMessages } = await importFresh();
    const onMessage = vi.fn();
    subscribeToMessages("user-xyz", onMessage);
    const handler = getMessageHandler();
    expect(() => handler!("messages:user-xyz", "not-valid-json")).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("unsubscribes from the channel and removes the listener on cleanup", async () => {
    const { subscribeToMessages } = await importFresh();
    const unsubscribe = subscribeToMessages("user-xyz", vi.fn());
    const handler = getMessageHandler();
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledWith("messages:user-xyz");
    expect(mockRemoveListener).toHaveBeenCalledWith("message", handler);
  });

  it("reuses the same subscriber instance across multiple subscriptions", async () => {
    const { subscribeToMessages } = await importFresh();
    subscribeToMessages("user-a", vi.fn());
    subscribeToMessages("user-b", vi.fn());
    expect(MockRedis).toHaveBeenCalledOnce();
  });
});
