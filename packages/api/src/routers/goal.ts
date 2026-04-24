import { TRPCError } from "@trpc/server";
import {
  createGoalSchema,
  updateGoalSchema,
  deleteGoalSchema,
  listGoalsSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { computeGoalProgress, computeProgressPct } from "../lib/goal-progress";
import { captureError } from "../lib/capture-error";

export const goalRouter = createTRPCRouter({
  list: rateLimitedProcedure
    .input(listGoalsSchema)
    .query(async ({ ctx, input }) => {
      const goals = await ctx.db.goal.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      // `Promise.allSettled` so a single bad goal (stale exerciseId, query
      // hiccup) doesn't kill the whole list. Failures are logged to Sentry
      // with goal context; the UI renders the goal with `currentValue: null`
      // so it's still visible but marked as "progress unavailable".
      const settled = await Promise.allSettled(
        goals.map(async (g) => {
          const target = Number(g.targetValue);
          const start = g.startValue != null ? Number(g.startValue) : null;
          const currentValue = await computeGoalProgress(ctx.db as never, {
            userId: g.userId,
            type: g.type,
            unit: g.unit,
            targetValue: target,
            startValue: start,
            exerciseId: g.exerciseId,
            createdAt: g.createdAt,
          });
          const progressPct = computeProgressPct(currentValue, target, start);

          return {
            ...g,
            targetValue: target,
            startValue: start,
            currentValue,
            progressPct,
            isComplete: progressPct >= 100,
          };
        }),
      );

      const withProgress = settled.map((r, idx) => {
        if (r.status === "fulfilled") return r.value;
        const g = goals[idx]!;
        captureError(r.reason, {
          context: "goal.list.computeProgress",
          goalId: g.id,
          goalType: g.type,
          userId: ctx.user.id,
        });
        const target = Number(g.targetValue);
        const start = g.startValue != null ? Number(g.startValue) : null;
        return {
          ...g,
          targetValue: target,
          startValue: start,
          currentValue: null,
          progressPct: null,
          isComplete: false,
        };
      });

      return { goals: withProgress };
    }),

  create: rateLimitedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.type === "exercise_pr" && input.exerciseId) {
        const exists = await ctx.db.exercise.findUnique({
          where: { id: input.exerciseId },
          select: { id: true },
        });
        if (!exists) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
        }
      }

      const goal = await ctx.db.goal.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          targetValue: input.targetValue,
          startValue: input.startValue ?? null,
          unit: input.unit,
          exerciseId: input.exerciseId ?? null,
          targetDate: input.targetDate ?? null,
        },
      });

      return { goal };
    }),

  update: rateLimitedProcedure
    .input(updateGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
      }

      const data: Record<string, unknown> = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.targetValue !== undefined) data.targetValue = input.targetValue;
      if (input.targetDate !== undefined) data.targetDate = input.targetDate;
      if (input.status !== undefined) {
        data.status = input.status;
        if (input.status === "completed" && existing.status !== "completed") {
          data.completedAt = new Date();
        }
      }

      const goal = await ctx.db.goal.update({
        where: { id: input.id },
        data,
      });

      return { goal };
    }),

  delete: rateLimitedProcedure
    .input(deleteGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
      }

      await ctx.db.goal.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
