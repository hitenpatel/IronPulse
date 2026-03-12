import {
  createBodyMetricSchema,
  listBodyMetricsSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const bodyMetricRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createBodyMetricSchema)
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.bodyMetric.upsert({
        where: {
          userId_date: {
            userId: ctx.user.id,
            date: input.date,
          },
        },
        create: {
          userId: ctx.user.id,
          date: input.date,
          ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
          ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
          ...(input.measurements !== undefined && { measurements: input.measurements }),
        },
        update: {
          ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
          ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
          ...(input.measurements !== undefined && { measurements: input.measurements }),
        },
      });

      return { metric };
    }),

  list: protectedProcedure
    .input(listBodyMetricsSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.bodyMetric.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: input.from, lte: input.to },
        },
        orderBy: { date: "asc" },
      });

      return { data };
    }),
});
