import { db } from "@ironpulse/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id!;
  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll DB every 2 seconds for new messages (much cheaper than client polling)
      const interval = setInterval(async () => {
        try {
          const newMessages = await db.message.findMany({
            where: {
              receiverId: userId,
              createdAt: { gt: lastCheck },
            },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: "asc" },
          });

          if (newMessages.length > 0) {
            lastCheck = new Date();
            send({ type: "new_messages", messages: newMessages });
          }
        } catch {
          // Connection may have closed
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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
