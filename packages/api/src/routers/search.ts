import { z } from "zod";
import { rateLimitedProcedure, createTRPCRouter } from "../trpc";

export const searchRouter = createTRPCRouter({
  global: rateLimitedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const q = input.query;

      const [exercises, users, workouts] = await Promise.all([
        ctx.db.exercise.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          select: { id: true, name: true, category: true, equipment: true },
          take: 5,
        }),
        ctx.db.user.findMany({
          where: {
            id: { not: ctx.user.id },
            name: { contains: q, mode: "insensitive" },
          },
          select: { id: true, name: true, avatarUrl: true },
          take: 5,
        }),
        ctx.db.workout.findMany({
          where: {
            userId: ctx.user.id,
            name: { contains: q, mode: "insensitive" },
          },
          select: { id: true, name: true, startedAt: true, completedAt: true },
          take: 5,
          orderBy: { startedAt: "desc" },
        }),
      ]);

      return { exercises, users, workouts };
    }),
});
