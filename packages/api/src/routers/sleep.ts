import { TRPCError } from "@trpc/server";
import {
  logSleepSchema,
  listSleepSchema,
  deleteSleepSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const sleepRouter = createTRPCRouter({
  logSleep: rateLimitedProcedure
    .input(logSleepSchema)
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.sleepLog.create({
        data: {
          userId: ctx.user.id,
          date: input.date,
          ...(input.bedtime !== undefined && { bedtime: input.bedtime }),
          ...(input.wakeTime !== undefined && { wakeTime: input.wakeTime }),
          ...(input.durationMins !== undefined && {
            durationMins: input.durationMins,
          }),
          ...(input.quality !== undefined && { quality: input.quality }),
          ...(input.source !== undefined && { source: input.source }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        select: {
          id: true,
          date: true,
          bedtime: true,
          wakeTime: true,
          durationMins: true,
          quality: true,
          source: true,
          notes: true,
          createdAt: true,
        },
      });

      return { log };
    }),

  listSleep: rateLimitedProcedure
    .input(listSleepSchema)
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      since.setHours(0, 0, 0, 0);

      const logs = await ctx.db.sleepLog.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: since },
        },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          bedtime: true,
          wakeTime: true,
          durationMins: true,
          quality: true,
          source: true,
          notes: true,
          createdAt: true,
        },
      });

      return { logs };
    }),

  deleteSleep: rateLimitedProcedure
    .input(deleteSleepSchema)
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.sleepLog.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });

      if (!log) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sleep log not found",
        });
      }

      await ctx.db.sleepLog.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
