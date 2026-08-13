import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  addExerciseSchema,
  addSetSchema,
  updateSetSchema,
  deleteSetSchema,
  completeWorkoutSchema,
  cursorPaginationSchema,
} from "@zor/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { notifyCoachActivity } from "../lib/notifications";
import { captureError } from "../lib/capture-error";
import {
  registerWorkoutFinalization,
  processWorkoutFinalization,
} from "../lib/workout-finalization";
import type { NewPR } from "../lib/pr-detection";

export const workoutRouter = createTRPCRouter({
  create: rateLimitedProcedure
    .input(createWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      // If templateId provided, copy template exercises and sets
      if (input.templateId) {
        const template = await ctx.db.workoutTemplate.findUnique({
          where: { id: input.templateId, userId: ctx.user.id },
          include: {
            templateExercises: {
              orderBy: { order: "asc" },
              include: { templateSets: { orderBy: { setNumber: "asc" } } },
            },
          },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        const workout = await ctx.db.workout.create({
          data: {
            userId: ctx.user.id,
            name: input.name ?? template.name,
            startedAt: now,
            templateId: template.id,
            workoutExercises: {
              create: template.templateExercises.map((te) => ({
                exerciseId: te.exerciseId,
                order: te.order,
                notes: te.notes,
                sets: {
                  create: te.templateSets.map((ts) => ({
                    setNumber: ts.setNumber,
                    type: ts.type,
                    weightKg: ts.targetWeightKg,
                    reps: ts.targetReps,
                  })),
                },
              })),
            },
          },
          select: { id: true, name: true, userId: true, startedAt: true, completedAt: true, templateId: true },
        });

        return { workout };
      }

      const workout = await ctx.db.workout.create({
        data: {
          userId: ctx.user.id,
          name: input.name ?? null,
          startedAt: now,
        },
        select: { id: true, name: true, userId: true, startedAt: true, completedAt: true },
      });

      return { workout };
    }),

  getById: rateLimitedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        include: {
          workoutExercises: {
            orderBy: { order: "asc" },
            include: {
              exercise: { select: { id: true, name: true, category: true, equipment: true } },
              sets: { orderBy: { setNumber: "asc" } },
            },
          },
        },
      });

      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      return { workout };
    }),

  list: rateLimitedProcedure
    .input(cursorPaginationSchema)
    .query(async ({ ctx, input }) => {
      const workouts = await ctx.db.workout.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          name: true,
          startedAt: true,
          completedAt: true,
          durationSeconds: true,
          _count: { select: { workoutExercises: true } },
        },
      });

      const hasMore = workouts.length > input.limit;
      const data = hasMore ? workouts.slice(0, -1) : workouts;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  update: rateLimitedProcedure
    .input(updateWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.updateMany({
        where: { id: input.workoutId, userId: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });

      if (workout.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const updated = await ctx.db.workout.findUniqueOrThrow({
        where: { id: input.workoutId },
        select: { id: true, name: true, notes: true, startedAt: true, completedAt: true },
      });

      return { workout: updated };
    }),

  addExercise: rateLimitedProcedure
    .input(addExerciseSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify workout belongs to user
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      // Get next order
      const lastExercise = await ctx.db.workoutExercise.findFirst({
        where: { workoutId: input.workoutId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const workoutExercise = await ctx.db.workoutExercise.create({
        data: {
          workoutId: input.workoutId,
          exerciseId: input.exerciseId,
          order: (lastExercise?.order ?? -1) + 1,
        },
        select: { id: true, exerciseId: true, order: true },
      });

      return { workoutExercise };
    }),

  addSet: rateLimitedProcedure
    .input(addSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through workout exercise → workout → user
      const we = await ctx.db.workoutExercise.findFirst({
        where: {
          id: input.workoutExerciseId,
          workout: { userId: ctx.user.id },
        },
        select: { id: true },
      });
      if (!we) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout exercise not found" });
      }

      // Get next set number
      const lastSet = await ctx.db.exerciseSet.findFirst({
        where: { workoutExerciseId: input.workoutExerciseId },
        orderBy: { setNumber: "desc" },
        select: { setNumber: true },
      });

      const set = await ctx.db.exerciseSet.create({
        data: {
          workoutExerciseId: input.workoutExerciseId,
          setNumber: (lastSet?.setNumber ?? 0) + 1,
          ...(input.weight !== undefined && { weightKg: input.weight }),
          ...(input.reps !== undefined && { reps: input.reps }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.rpe !== undefined && { rpe: input.rpe }),
        },
        select: { id: true, setNumber: true, weightKg: true, reps: true, type: true, rpe: true, completed: true },
      });

      return { set };
    }),

  updateSet: rateLimitedProcedure
    .input(updateSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.exerciseSet.findFirst({
        where: {
          id: input.setId,
          workoutExercise: { workout: { userId: ctx.user.id } },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });
      }

      const set = await ctx.db.exerciseSet.update({
        where: { id: input.setId },
        data: {
          ...(input.weight !== undefined && { weightKg: input.weight }),
          ...(input.reps !== undefined && { reps: input.reps }),
          ...(input.rpe !== undefined && { rpe: input.rpe }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.completed !== undefined && { completed: input.completed }),
        },
        select: { id: true, setNumber: true, weightKg: true, reps: true, type: true, rpe: true, completed: true },
      });

      return { set };
    }),

  deleteSet: rateLimitedProcedure
    .input(deleteSetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.exerciseSet.findFirst({
        where: {
          id: input.setId,
          workoutExercise: { workout: { userId: ctx.user.id } },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set not found" });
      }

      await ctx.db.exerciseSet.delete({ where: { id: input.setId } });
      return { success: true };
    }),

  updateExerciseNotes: rateLimitedProcedure
    .input(z.object({
      workoutExerciseId: z.string(),
      notes: z.string().max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through workout exercise → workout → user
      const we = await ctx.db.workoutExercise.findFirst({
        where: {
          id: input.workoutExerciseId,
          workout: { userId: ctx.user.id },
        },
        select: { id: true },
      });
      if (!we) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout exercise not found" });
      }

      return ctx.db.workoutExercise.update({
        where: { id: input.workoutExerciseId },
        data: { notes: input.notes },
      });
    }),

  toggleShare: rateLimitedProcedure
    .input(z.object({ workoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
      });
      if (!workout) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.workout.update({
        where: { id: input.workoutId },
        data: { isPublic: !workout.isPublic },
        select: { isPublic: true, shareToken: true },
      });
    }),

  getPreviousPerformance: rateLimitedProcedure
    .input(z.object({ exerciseIds: z.array(z.string()), excludeWorkoutId: z.string() }))
    .query(async ({ ctx, input }) => {
      // For each exerciseId, find the most recent completed sets from a different workout
      const results = await ctx.db.exerciseSet.findMany({
        where: {
          workoutExercise: {
            exerciseId: { in: input.exerciseIds },
            workout: {
              userId: ctx.user.id,
              id: { not: input.excludeWorkoutId },
              completedAt: { not: null },
            },
          },
          completed: true,
        },
        orderBy: { workoutExercise: { workout: { startedAt: "desc" } } },
        select: {
          weightKg: true,
          reps: true,
          rpe: true,
          workoutExercise: { select: { exerciseId: true } },
        },
      });
      return results;
    }),

  complete: rateLimitedProcedure
    .input(completeWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true, startedAt: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const completedAt = input.completedAt ?? new Date();
      const durationSeconds = Math.round(
        (completedAt.getTime() - existing.startedAt.getTime()) / 1000,
      );

      // Register finalization inside a transaction — idempotent, first-writer wins.
      await ctx.db.$transaction(async (tx) => {
        await registerWorkoutFinalization(tx, {
          workoutId: input.workoutId,
          userId: ctx.user.id,
          completedAt,
          durationSeconds,
        });
      });

      // Attempt immediate processing after the transaction commits (fire-and-forget
      // on failure — the sweep cron will retry if this errors).
      processWorkoutFinalization(ctx.db, input.workoutId).catch((err) =>
        captureError(err, { context: "processWorkoutFinalization", workoutId: input.workoutId }),
      );

      // Notify coach (best-effort, never block the response).
      (async () => {
        try {
          const assignment = await ctx.db.programAssignment.findFirst({
            where: { athleteId: ctx.user.id, status: "active" },
            select: { coachId: true },
          });
          if (!assignment) return;
          const athlete = await ctx.db.user.findUnique({
            where: { id: ctx.user.id },
            select: { name: true },
          });
          await notifyCoachActivity(
            ctx.db,
            assignment.coachId,
            athlete?.name ?? "Athlete",
            "completed a workout",
            ctx.user.id,
          );
        } catch (err) {
          captureError(err, { context: "notifyCoachActivity", userId: ctx.user.id });
        }
      })();

      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true, name: true, startedAt: true, completedAt: true, durationSeconds: true },
      });

      // Read back finalization status/result.
      const finalization = await ctx.db.workoutFinalization.findUnique({
        where: { workoutId: input.workoutId },
        select: { status: true, result: true, processedAt: true },
      });

      const newPRs =
        finalization?.status === "completed" && finalization.result
          ? ((finalization.result as { newPRs?: NewPR[] }).newPRs ?? [])
          : [];

      return { workout: workout!, newPRs };
    }),

  finalizationStatus: rateLimitedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Scope to owner — throw NOT_FOUND for missing or cross-user.
      const workout = await ctx.db.workout.findFirst({
        where: { id: input.workoutId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!workout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      }

      const finalization = await ctx.db.workoutFinalization.findUnique({
        where: { workoutId: input.workoutId },
        select: { status: true, result: true, processedAt: true },
      });

      if (!finalization) {
        return { status: "pending" as const, newPRs: [], message: "Records will appear after syncing." };
      }

      const newPRs =
        finalization.status === "completed" && finalization.result
          ? ((finalization.result as { newPRs?: unknown[] }).newPRs ?? [])
          : [];

      return {
        status: finalization.status as "pending" | "processing" | "completed" | "failed",
        newPRs,
        finalizedAt: finalization.processedAt ?? undefined,
        message:
          finalization.status === "completed"
            ? undefined
            : "Records will appear after syncing.",
      };
    }),
});
