import { TRPCError } from "@trpc/server";
import {
  listNotificationsSchema,
  markNotificationReadSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const notificationRouter = createTRPCRouter({
  list: rateLimitedProcedure
    .input(listNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.unreadOnly && { readAt: null }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      const hasMore = items.length > input.limit;
      const sliced = items.slice(0, input.limit);
      return {
        notifications: sliced,
        nextCursor: hasMore ? sliced[sliced.length - 1]!.id : null,
      };
    }),

  unreadCount: rateLimitedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { userId: ctx.user.id, readAt: null },
    });
    return { count };
  }),

  markRead: rateLimitedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.notification.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }
      await ctx.db.notification.update({
        where: { id: input.id },
        data: { readAt: new Date() },
      });
      return { success: true };
    }),

  markAllRead: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.notification.updateMany({
      where: { userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedRead: result.count };
  }),

  delete: rateLimitedProcedure
    .input(markNotificationReadSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.notification.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }
      await ctx.db.notification.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
