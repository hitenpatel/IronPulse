import { z } from "zod";
import {
  createExerciseSchema,
  listExercisesSchema,
} from "@ironpulse/shared";
import {
  createTRPCRouter,
  publicProcedure,
  rateLimitedProcedure,
} from "../trpc";

export const exerciseRouter = createTRPCRouter({
  list: publicProcedure
    .input(listExercisesSchema)
    .query(async ({ ctx, input }) => {
      const exercises = await ctx.db.exercise.findMany({
        where: {
          ...(input.muscleGroup && {
            primaryMuscles: { has: input.muscleGroup },
          }),
          ...(input.equipment && { equipment: input.equipment }),
          ...(input.category && { category: input.category }),
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" as const },
          }),
        },
        orderBy: { name: "asc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          imageUrls: true,
          isCustom: true,
        },
      });

      const hasMore = exercises.length > input.limit;
      const data = hasMore ? exercises.slice(0, -1) : exercises;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const exercise = await ctx.db.exercise.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          instructions: true,
          imageUrls: true,
          videoUrls: true,
          isCustom: true,
          createdById: true,
        },
      });

      return { exercise };
    }),

  create: rateLimitedProcedure
    .input(createExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      const exercise = await ctx.db.exercise.create({
        data: {
          name: input.name,
          category: input.category,
          primaryMuscles: input.primaryMuscles,
          secondaryMuscles: input.secondaryMuscles,
          equipment: input.equipment ?? null,
          instructions: input.instructions ?? null,
          isCustom: true,
          createdById: ctx.user.id,
        },
        select: {
          id: true,
          name: true,
          category: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          instructions: true,
          isCustom: true,
          createdById: true,
        },
      });

      return { exercise };
    }),
});
