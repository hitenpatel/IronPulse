import { TRPCError } from "@trpc/server";
import { generateAiWorkoutSchema } from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { generateWorkoutWithAi } from "../lib/ai-workout";
import { env } from "../lib/env";

export const aiWorkoutRouter = createTRPCRouter({
  generate: rateLimitedProcedure
    .input(generateAiWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI workout generation is not configured on this server. Set OPENAI_API_KEY.",
        });
      }

      const aiResult = await generateWorkoutWithAi({
        goal: input.goal,
        experienceLevel: input.experienceLevel,
        equipment: input.equipment,
        apiKey,
        model: env.OPENAI_MODEL,
        promptTemplate: env.AI_WORKOUT_PROMPT_TEMPLATE,
      }).catch((err: unknown) => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      });

      const exercises = await Promise.all(
        aiResult.exercises.map(async (ex, i) => {
          const matched = await ctx.db.exercise.findFirst({
            where: { name: { contains: ex.name, mode: "insensitive" } },
            select: { id: true },
          });
          return {
            exerciseName: ex.name,
            matchedExerciseId: matched?.id ?? null,
            order: i,
            notes: ex.notes ?? "",
            sets: Array.from({ length: ex.sets }, (_, j) => ({
              setNumber: j + 1,
              targetReps: ex.reps,
            })),
          };
        }),
      );

      return {
        workout: {
          name: aiResult.workoutName,
          exercises,
        },
      };
    }),
});
