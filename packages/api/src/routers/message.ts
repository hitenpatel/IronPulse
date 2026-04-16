import { TRPCError } from "@trpc/server";
import {
  sendMessageSchema,
  messageHistorySchema,
  markReadSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { notifyNewMessage } from "../lib/notifications";
import { captureError } from "../lib/capture-error";

async function hasCoachAthleteRelationship(
  db: any,
  userA: string,
  userB: string
): Promise<boolean> {
  const assignment = await db.programAssignment.findFirst({
    where: {
      OR: [
        { coachId: userA, athleteId: userB },
        { coachId: userB, athleteId: userA },
      ],
    },
  });
  return !!assignment;
}

export const messageRouter = createTRPCRouter({
  send: rateLimitedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.receiverId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send a message to yourself",
        });
      }

      const hasRelationship = await hasCoachAthleteRelationship(
        ctx.db,
        ctx.user.id,
        input.receiverId
      );

      if (!hasRelationship) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only message users you have a coach-athlete relationship with",
        });
      }

      const message = await ctx.db.message.create({
        data: {
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          content: input.content,
        },
      });

      // Push notification (fire-and-forget)
      const sender = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { name: true },
      });
      notifyNewMessage(
        ctx.db,
        input.receiverId,
        sender?.name ?? "Someone"
      ).catch((err) =>
        captureError(err, { context: "notifyNewMessage", receiverId: input.receiverId, senderId: ctx.user.id })
      );

      return message;
    }),

  conversations: rateLimitedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get all messages where the user is sender or receiver
    const messages = await ctx.db.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Group by conversation partner
    const conversationMap = new Map<
      string,
      {
        partnerId: string;
        partnerName: string;
        partnerAvatarUrl: string | null;
        lastMessage: string;
        lastMessageAt: Date;
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      const partnerId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partner =
        msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partnerName: partner.name,
          partnerAvatarUrl: partner.avatarUrl,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }

      // Count unread messages from this partner
      if (msg.senderId === partnerId && !msg.readAt) {
        const conv = conversationMap.get(partnerId)!;
        conv.unreadCount++;
      }
    }

    return [...conversationMap.values()].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }),

  history: rateLimitedProcedure
    .input(messageHistorySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const messages = await ctx.db.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: input.partnerId },
            { senderId: input.partnerId, receiverId: userId },
          ],
          ...(input.cursor
            ? { createdAt: { lt: new Date(input.cursor) } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const last = messages.pop()!;
        nextCursor = last.createdAt.toISOString();
      }

      return { messages, nextCursor };
    }),

  markRead: rateLimitedProcedure
    .input(markReadSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.message.updateMany({
        where: {
          senderId: input.partnerId,
          receiverId: ctx.user.id,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return { markedRead: updated.count };
    }),
});
