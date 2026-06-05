import { z } from "zod";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const deloadRouter = createTRPCRouter({
  suggestion: rateLimitedProcedure.query(async ({ ctx }) => {
    const notification = await ctx.db.notification.findFirst({
      where: {
        userId: ctx.user.id,
        type: "deload_suggestion",
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, data: true },
    });

    if (notification) {
      const data = notification.data as Record<string, unknown> | null;
      return {
        suggested: true,
        notificationId: notification.id as string,
        stagnantLifts: (data?.stagnantLifts as string[] | undefined) ?? [],
        deloadWeightFactor:
          (data?.deloadWeightFactor as number | undefined) ?? 0.6,
      };
    }

    return {
      suggested: false,
      notificationId: null as string | null,
      stagnantLifts: [] as string[],
      deloadWeightFactor: 0.6,
    };
  }),

  dismiss: rateLimitedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: ctx.user.id,
          type: "deload_suggestion",
        },
        data: { readAt: new Date() },
      });
      return { success: true };
    }),
});
