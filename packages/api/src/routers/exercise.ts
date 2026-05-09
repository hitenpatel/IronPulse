import { z } from "zod";
import {
  createExerciseSchema,
  listExercisesSchema,
  uploadExerciseMediaSchema,
} from "@ironpulse/shared";
import { getPresignedUploadUrl } from "../lib/s3";
import {
  createTRPCRouter,
  publicProcedure,
  rateLimitedProcedure,
} from "../trpc";

function computeMatchRanges(
  name: string,
  query: string,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();
  let idx = 0;
  while (idx <= nameLower.length - queryLower.length) {
    const found = nameLower.indexOf(queryLower, idx);
    if (found === -1) break;
    ranges.push({ start: found, end: found + queryLower.length });
    idx = found + queryLower.length;
  }
  return ranges;
}

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

      const dataWithRanges = data.map((e) => ({
        ...e,
        matchedRanges: input.search
          ? computeMatchRanges(e.name, input.search)
          : [],
      }));

      return { data: dataWithRanges, nextCursor };
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

  getDetail: rateLimitedProcedure
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
        },
      });

      const personalRecords = await ctx.db.personalRecord.findMany({
        where: {
          userId: ctx.user.id,
          exerciseId: input.id,
        },
        orderBy: { achievedAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          value: true,
          achievedAt: true,
        },
      });

      const recentSets = await ctx.db.exerciseSet.findMany({
        where: {
          completed: true,
          workoutExercise: {
            exerciseId: input.id,
            workout: { userId: ctx.user.id },
          },
        },
        orderBy: { workoutExercise: { workout: { startedAt: "desc" } } },
        take: 20,
        select: {
          id: true,
          setNumber: true,
          weightKg: true,
          reps: true,
          rpe: true,
          workoutExercise: {
            select: {
              workout: {
                select: { startedAt: true },
              },
            },
          },
        },
      });

      return { exercise, personalRecords, recentSets };
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

  uploadExerciseMedia: rateLimitedProcedure
    .input(uploadExerciseMediaSchema)
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType.split("/")[1];
      const folder = input.mediaType === "image" ? "images" : "videos";
      const key = `exercises/${input.exerciseId}/${folder}/${Date.now()}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(key, input.contentType);

      // Persist the key into the exercise's media arrays
      const exercise = await ctx.db.exercise.findUniqueOrThrow({
        where: { id: input.exerciseId },
        select: { imageUrls: true, videoUrls: true },
      });

      if (input.mediaType === "image") {
        await ctx.db.exercise.update({
          where: { id: input.exerciseId },
          data: { imageUrls: [...exercise.imageUrls, key] },
        });
      } else {
        await ctx.db.exercise.update({
          where: { id: input.exerciseId },
          data: { videoUrls: [...exercise.videoUrls, key] },
        });
      }

      return { uploadUrl, key };
    }),
});
