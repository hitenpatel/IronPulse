import { TRPCError } from "@trpc/server";
import {
  listTemplatesSchema,
  getTemplateSchema,
  createTemplateSchema,
  saveWorkoutAsTemplateSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  setShareableSchema,
  copyToClientSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure } from "../trpc";

const coachProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.tier !== "coach") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach tier required" });
  }
  return next();
});

export const templateRouter = createTRPCRouter({
  list: rateLimitedProcedure
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) => {
      const templates = await ctx.db.workoutTemplate.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          userId: true,
          name: true,
          createdAt: true,
          _count: { select: { templateExercises: true } },
        },
      });

      const hasMore = templates.length > input.limit;
      const data = hasMore ? templates.slice(0, -1) : templates;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  getById: rateLimitedProcedure
    .input(getTemplateSchema)
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.workoutTemplate.findFirst({
        where: { id: input.templateId, userId: ctx.user.id },
        include: {
          templateExercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: {
                select: { id: true, name: true, category: true, equipment: true },
              },
              templateSets: { orderBy: { setNumber: "asc" } },
            },
          },
        },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return { template };
    }),

  create: rateLimitedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.workoutTemplate.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          templateExercises: {
            create: input.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              order: ex.order,
              notes: ex.notes,
              templateSets: {
                create: ex.sets.map((s) => ({
                  setNumber: s.setNumber,
                  targetReps: s.targetReps,
                  targetWeightKg: s.targetWeightKg,
                  type: s.type,
                })),
              },
            })),
          },
        },
        select: { id: true, name: true, createdAt: true },
      });

      return { template };
    }),

  saveFromWorkout: rateLimitedProcedure
    .input(saveWorkoutAsTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        include: {
          workoutExercises: {
            orderBy: { order: "asc" },
            include: { sets: { orderBy: { setNumber: "asc" } } },
          },
        },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const template = await ctx.db.workoutTemplate.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          templateExercises: {
            create: workout.workoutExercises.map((we) => ({
              exerciseId: we.exerciseId,
              order: we.order,
              notes: we.notes,
              templateSets: {
                create: we.sets.map((s) => ({
                  setNumber: s.setNumber,
                  targetReps: s.reps,
                  targetWeightKg: s.weightKg,
                  type: s.type,
                })),
              },
            })),
          },
        },
        select: { id: true, name: true, createdAt: true },
      });

      return { template };
    }),

  update: rateLimitedProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutTemplate.findFirst({
        where: { id: input.templateId, userId: ctx.user.id },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // If exercises provided, replace all exercises and sets
      if (input.exercises) {
        await ctx.db.templateExercise.deleteMany({
          where: { templateId: input.templateId },
        });

        for (const ex of input.exercises) {
          await ctx.db.templateExercise.create({
            data: {
              templateId: input.templateId,
              exerciseId: ex.exerciseId,
              order: ex.order,
              notes: ex.notes,
              templateSets: {
                create: ex.sets.map((s) => ({
                  setNumber: s.setNumber,
                  targetReps: s.targetReps,
                  targetWeightKg: s.targetWeightKg,
                  type: s.type,
                })),
              },
            },
          });
        }
      }

      const template = await ctx.db.workoutTemplate.update({
        where: { id: input.templateId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
        },
        select: { id: true, name: true, createdAt: true },
      });

      return { template };
    }),

  delete: rateLimitedProcedure
    .input(deleteTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutTemplate.findFirst({
        where: { id: input.templateId, userId: ctx.user.id },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      await ctx.db.workoutTemplate.delete({
        where: { id: input.templateId },
      });

      return { success: true };
    }),

  setShareable: coachProcedure
    .input(setShareableSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutTemplate.findFirst({
        where: { id: input.templateId, userId: ctx.user.id },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const template = await ctx.db.workoutTemplate.update({
        where: { id: input.templateId },
        data: { isShareable: input.isShareable },
        select: { id: true, isShareable: true },
      });

      return { template };
    }),

  copyToClient: coachProcedure
    .input(copyToClientSchema)
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.workoutTemplate.findFirst({
        where: { id: input.templateId, userId: ctx.user.id },
        include: {
          templateExercises: {
            orderBy: { order: "asc" },
            include: { templateSets: { orderBy: { setNumber: "asc" } } },
          },
        },
      });

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const clientAssignment = await ctx.db.programAssignment.findFirst({
        where: { athleteId: input.athleteId, coachId: ctx.user.id, status: "active" },
        select: { id: true },
      });

      if (!clientAssignment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Athlete is not your client" });
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const athleteTemplate = await tx.workoutTemplate.create({
          data: {
            userId: input.athleteId,
            name: source.name,
            isShareable: false,
            templateExercises: {
              create: source.templateExercises.map((te) => ({
                exerciseId: te.exerciseId,
                order: te.order,
                notes: te.notes,
                templateSets: {
                  create: te.templateSets.map((s) => ({
                    setNumber: s.setNumber,
                    targetReps: s.targetReps,
                    targetWeightKg: s.targetWeightKg,
                    type: s.type,
                  })),
                },
              })),
            },
          },
          select: { id: true },
        });

        const program = await tx.program.create({
          data: {
            coachId: ctx.user.id,
            name: input.programName,
            durationWeeks: input.durationWeeks,
            schedule: { "1": { "1": athleteTemplate.id } },
          },
          select: { id: true },
        });

        const assignment = await tx.programAssignment.create({
          data: {
            programId: program.id,
            athleteId: input.athleteId,
            coachId: ctx.user.id,
            startedAt: new Date(),
            status: "pending",
          },
          select: { id: true },
        });

        return { programId: program.id, assignmentId: assignment.id };
      });

      return result;
    }),
});
