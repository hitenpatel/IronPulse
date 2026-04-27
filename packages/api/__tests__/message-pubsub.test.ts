import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSubscribe = vi.fn().mockResolvedValue(undefined);
const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
const mockPublish = vi.fn().mockResolvedValue(1);
const mockOn = vi.fn();
const mockRemoveListener = vi.fn();

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    publish: mockPublish,
    on: mockOn,
    removeListener: mockRemoveListener,
  })),
}));

import { publishNewMessage, subscribeToMessages } from "../src/lib/message-pubsub";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishNewMessage", () => {
  it("publishes to the messages:<receiverId> channel", async () => {
    await publishNewMessage("user-42", { text: "hello" });
    expect(mockPublish).toHaveBeenCalledWith(
      "messages:user-42",
      JSON.stringify({ text: "hello" }),
    );
  });

  it("serializes the full payload as JSON", async () => {
    const payload = { type: "new_message", messageId: "msg-1", senderId: "user-5" };
    await publishNewMessage("user-7", payload);
    expect(mockPublish).toHaveBeenCalledWith(
      "messages:user-7",
      JSON.stringify(payload),
    );
  });

  it("uses the receiverId in the channel name", async () => {
    await publishNewMessage("receiver-99", { from: "sender-1" });
    const [channel] = mockPublish.mock.calls[0] as [string, string];
    expect(channel).toBe("messages:receiver-99");
  });

  it("publishes an empty object as a valid JSON payload", async () => {
    await publishNewMessage("user-1", {});
    expect(mockPublish).toHaveBeenCalledWith("messages:user-1", "{}");
  });
});

describe("subscribeToMessages", () => {
  function lastHandler(): (ch: string, msg: string) => void {
    const calls = mockOn.mock.calls as Array<[string, (ch: string, msg: string) => void]>;
    return calls[calls.length - 1][1];
  }

  it("subscribes to the messages:<userId> channel", () => {
    subscribeToMessages("alice", vi.fn());
    expect(mockSubscribe).toHaveBeenCalledWith("messages:alice");
  });

  it("registers a message event listener on the subscriber", () => {
    subscribeToMessages("bob", vi.fn());
    expect(mockOn).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("calls onMessage with the parsed payload when the channel matches", () => {
    const onMessage = vi.fn();
    subscribeToMessages("charlie", onMessage);
    const handler = lastHandler();

    const payload = { type: "chat", text: "hi there" };
    handler("messages:charlie", JSON.stringify(payload));

    expect(onMessage).toHaveBeenCalledWith(payload);
  });

  it("does not call onMessage for messages on a different channel", () => {
    const onMessage = vi.fn();
    subscribeToMessages("dave", onMessage);
    const handler = lastHandler();

    handler("messages:other-user", JSON.stringify({ text: "not for dave" }));

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("silently ignores invalid JSON without throwing", () => {
    const onMessage = vi.fn();
    subscribeToMessages("eve", onMessage);
    const handler = lastHandler();

    expect(() => handler("messages:eve", "not{valid}json")).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("returns an unsubscribe function that unsubscribes the channel", () => {
    const unsubscribe = subscribeToMessages("frank", vi.fn());
    unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledWith("messages:frank");
  });

  it("returns an unsubscribe function that removes the registered listener", () => {
    const onMessage = vi.fn();
    const unsubscribe = subscribeToMessages("grace", onMessage);
    const handler = lastHandler();

    unsubscribe();

    expect(mockRemoveListener).toHaveBeenCalledWith("message", handler);
  });
});
