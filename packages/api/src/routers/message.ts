import { TRPCError } from "@trpc/server";
import {
  sendMessageSchema,
  messageHistorySchema,
  markReadSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { notifyNewMessage } from "../lib/notifications";
import { captureError } from "../lib/capture-error";
import { publishNewMessage } from "../lib/message-pubsub";

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

      // Real-time SSE push via Redis Pub/Sub (fire-and-forget)
      publishNewMessage(input.receiverId, {
        type: "new_message",
        message: {
          id: message.id,
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          content: input.content,
          createdAt: message.createdAt,
        },
      }).catch((err) =>
        captureError(err, { context: "publishNewMessage", receiverId: input.receiverId })
      );

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

    // Use raw SQL to efficiently get the latest message per conversation partner
    // instead of loading ALL messages into memory
    const conversations = await ctx.db.$queryRaw<
      {
        partnerId: string;
        partnerName: string;
        partnerAvatarUrl: string | null;
        lastMessage: string;
        lastMessageAt: Date;
        unreadCount: bigint;
      }[]
    >`
      WITH ranked AS (
        SELECT
          CASE WHEN m.sender_id = ${userId}::uuid THEN m.receiver_id ELSE m.sender_id END AS partner_id,
          m.content,
          m.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN m.sender_id = ${userId}::uuid THEN m.receiver_id ELSE m.sender_id END
            ORDER BY m.created_at DESC
          ) AS rn
        FROM messages m
        WHERE m.sender_id = ${userId}::uuid OR m.receiver_id = ${userId}::uuid
      ),
      unread_counts AS (
        SELECT sender_id AS partner_id, COUNT(*) AS unread_count
        FROM messages
        WHERE receiver_id = ${userId}::uuid AND read_at IS NULL
        GROUP BY sender_id
      )
      SELECT
        r.partner_id AS "partnerId",
        u.name AS "partnerName",
        u.avatar_url AS "partnerAvatarUrl",
        r.content AS "lastMessage",
        r.created_at AS "lastMessageAt",
        COALESCE(uc.unread_count, 0) AS "unreadCount"
      FROM ranked r
      JOIN users u ON u.id = r.partner_id
      LEFT JOIN unread_counts uc ON uc.partner_id = r.partner_id
      WHERE r.rn = 1
      ORDER BY r.created_at DESC
    `;

    return conversations.map((c) => ({
      ...c,
      unreadCount: Number(c.unreadCount),
    }));
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
