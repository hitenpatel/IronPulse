import Redis from "ioredis";

const CHANNEL_PREFIX = "messages:";

/** Get a dedicated Redis subscriber instance (cannot reuse the shared one for subscriptions) */
let subscriberInstance: Redis | null = null;
function getSubscriber(): Redis {
  if (!subscriberInstance) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    subscriberInstance = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return subscriberInstance;
}

/** Get a dedicated Redis publisher instance */
let publisherInstance: Redis | null = null;
function getPublisher(): Redis {
  if (!publisherInstance) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    publisherInstance = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return publisherInstance;
}

/**
 * Publish a new message event to a user's channel.
 * Called from the message.send tRPC mutation.
 */
export async function publishNewMessage(
  receiverId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const pub = getPublisher();
  await pub.publish(
    `${CHANNEL_PREFIX}${receiverId}`,
    JSON.stringify(payload),
  );
}

/**
 * Subscribe to a user's message channel.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  userId: string,
  onMessage: (payload: Record<string, unknown>) => void,
): () => void {
  const sub = getSubscriber();
  const channel = `${CHANNEL_PREFIX}${userId}`;

  const handler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        onMessage(JSON.parse(message));
      } catch {
        // Invalid JSON — skip
      }
    }
  };

  sub.subscribe(channel);
  sub.on("message", handler);

  return () => {
    sub.unsubscribe(channel);
    sub.removeListener("message", handler);
  };
}
