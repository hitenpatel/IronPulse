import { db } from "@ironpulse/db";
import { subscribeToMessages } from "@ironpulse/api/src/lib/message-pubsub";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id!;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may have closed
        }
      };

      // Subscribe to Redis Pub/Sub for real-time messages
      const unsubscribe = subscribeToMessages(userId, (payload) => {
        send(payload);
      });

      // Send a heartbeat every 30s to keep the connection alive
      const heartbeat = setInterval(() => {
        send({ type: "heartbeat" });
      }, 30_000);

      // Load any messages missed since the client's last connection
      // (client sends ?since=ISO timestamp as query param)
      const url = new URL(req.url);
      const since = url.searchParams.get("since");
      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) {
          db.message
            .findMany({
              where: {
                receiverId: userId,
                createdAt: { gt: sinceDate },
              },
              include: {
                sender: { select: { id: true, name: true, avatarUrl: true } },
              },
              orderBy: { createdAt: "asc" },
            })
            .then((missed) => {
              if (missed.length > 0) {
                send({ type: "missed_messages", messages: missed });
              }
            })
            .catch(() => {});
        }
      }

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        controller.close();
      });

      send({ type: "connected" });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
