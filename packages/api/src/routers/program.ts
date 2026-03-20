import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProgramSchema,
  updateProgramSchema,
  updateScheduleSchema,
  assignProgramSchema,
  unassignProgramSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure } from "../trpc";

const coachProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.tier !== "coach") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Coach tier required",
    });
  }
  return next();
});

export const programRouter = createTRPCRouter({
  create: coachProcedure
    .input(createProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.create({
        data: {
          coachId: ctx.user.id,
          name: input.name,
          description: input.description,
          durationWeeks: input.durationWeeks,
          schedule: input.schedule,
        },
      });

      return program;
    }),

  update: coachProcedure
    .input(updateProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.program.findFirst({
        where: { id: input.id, coachId: ctx.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      const program = await ctx.db.program.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          durationWeeks: input.durationWeeks,
          schedule: input.schedule,
        },
      });

      return program;
    }),

  updateSchedule: coachProcedure
    .input(updateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.findFirst({
        where: { id: input.programId, coachId: ctx.user.id },
      });

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      return ctx.db.program.update({
        where: { id: input.programId },
        data: { schedule: input.schedule },
      });
    }),

  delete: coachProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.program.findFirst({
        where: { id: input.id, coachId: ctx.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      await ctx.db.program.delete({ where: { id: input.id } });

      return { deleted: true };
    }),

  list: coachProcedure.query(async ({ ctx }) => {
    const programs = await ctx.db.program.findMany({
      where: { coachId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { assignments: true } },
      },
    });

    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.durationWeeks,
      assignmentCount: p._count.assignments,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }),

  getById: coachProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const program = await ctx.db.program.findFirst({
        where: { id: input.id, coachId: ctx.user.id },
        include: {
          assignments: {
            include: {
              athlete: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      // Resolve schedule — supports both legacy (string) and structured ({ templateId, templateName }) formats
      type ScheduleCell = { templateId: string; templateName: string | null; isRestDay?: boolean } | null;
      const rawSchedule = program.schedule as Record<string, Record<string, string | ScheduleCell>>;

      const templateIds = new Set<string>();
      for (const week of Object.values(rawSchedule)) {
        for (const cell of Object.values(week)) {
          if (typeof cell === "string" && cell) {
            templateIds.add(cell);
          } else if (cell && typeof cell === "object" && cell.templateId) {
            templateIds.add(cell.templateId);
          }
        }
      }

      const templates = templateIds.size
        ? await ctx.db.workoutTemplate.findMany({
            where: { id: { in: [...templateIds] } },
            select: { id: true, name: true },
          })
        : [];

      const templateMap = new Map(templates.map((t) => [t.id, t.name]));

      const resolvedSchedule: Record<
        string,
        Record<string, { templateId: string; templateName: string | null; isRestDay?: boolean }>
      > = {};
      for (const [week, days] of Object.entries(rawSchedule)) {
        resolvedSchedule[week] = {};
        for (const [day, cell] of Object.entries(days)) {
          if (typeof cell === "string") {
            resolvedSchedule[week][day] = {
              templateId: cell,
              templateName: templateMap.get(cell) ?? null,
            };
          } else if (cell && typeof cell === "object") {
            resolvedSchedule[week][day] = {
              templateId: cell.templateId,
              templateName: templateMap.get(cell.templateId) ?? cell.templateName,
              isRestDay: cell.isRestDay,
            };
          }
        }
      }

      return {
        ...program,
        schedule: resolvedSchedule,
      };
    }),

  assign: coachProcedure
    .input(assignProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.program.findFirst({
        where: { id: input.programId, coachId: ctx.user.id },
      });

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      const assignment = await ctx.db.programAssignment.create({
        data: {
          programId: input.programId,
          athleteId: input.athleteId,
          coachId: ctx.user.id,
          startedAt: new Date(input.startDate),
          status: "active",
        },
      });

      return assignment;
    }),

  unassign: coachProcedure
    .input(unassignProgramSchema)
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.programAssignment.findFirst({
        where: { id: input.assignmentId, coachId: ctx.user.id },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      await ctx.db.programAssignment.delete({
        where: { id: input.assignmentId },
      });

      return { deleted: true };
    }),

  // ── Athlete-facing procedures ──

  myAssignment: rateLimitedProcedure.query(async ({ ctx }) => {
    const assignment = await ctx.db.programAssignment.findFirst({
      where: { athleteId: ctx.user.id, status: "active" },
      include: {
        program: true,
        coach: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!assignment || !assignment.program) return null;

    const program = assignment.program;

    // Resolve schedule template names
    type ScheduleCell = { templateId: string; templateName: string | null; isRestDay?: boolean } | null;
    const rawSchedule = (program.schedule ?? {}) as Record<string, Record<string, string | ScheduleCell>>;

    const templateIds = new Set<string>();
    for (const week of Object.values(rawSchedule)) {
      for (const cell of Object.values(week)) {
        if (typeof cell === "string" && cell) templateIds.add(cell);
        else if (cell && typeof cell === "object" && cell.templateId) templateIds.add(cell.templateId);
      }
    }

    const templates = templateIds.size
      ? await ctx.db.workoutTemplate.findMany({
          where: { id: { in: [...templateIds] } },
          select: { id: true, name: true },
        })
      : [];
    const templateMap = new Map(templates.map((t) => [t.id, t.name]));

    const resolvedSchedule: Record<
      string,
      Record<string, { templateId: string; templateName: string | null; isRestDay?: boolean }>
    > = {};
    for (const [week, days] of Object.entries(rawSchedule)) {
      resolvedSchedule[week] = {};
      for (const [day, cell] of Object.entries(days)) {
        if (typeof cell === "string") {
          resolvedSchedule[week][day] = { templateId: cell, templateName: templateMap.get(cell) ?? null };
        } else if (cell && typeof cell === "object") {
          resolvedSchedule[week][day] = {
            templateId: cell.templateId,
            templateName: templateMap.get(cell.templateId) ?? cell.templateName,
            isRestDay: cell.isRestDay,
          };
        }
      }
    }

    // Calculate current week number
    const startDate = new Date(assignment.startedAt);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const currentWeek = Math.max(1, Math.min(program.durationWeeks, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))));

    // Calculate completion status
    // Fetch all completed workouts for this athlete that have a templateId matching any template in the schedule
    const completedWorkouts = templateIds.size
      ? await ctx.db.workout.findMany({
          where: {
            userId: ctx.user.id,
            templateId: { in: [...templateIds] },
            completedAt: { not: null },
          },
          select: { templateId: true, completedAt: true },
        })
      : [];

    // For each week/day in schedule, determine if a workout was completed with the matching templateId
    // within that week's date range (startDate + (weekNum-1)*7 days to startDate + weekNum*7 days)
    const completedDays: Record<string, string[]> = {};
    let totalScheduledDays = 0;
    let totalCompletedDays = 0;

    for (const [weekStr, days] of Object.entries(resolvedSchedule)) {
      const weekNum = parseInt(weekStr, 10);
      const weekStart = new Date(startDate.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      completedDays[weekStr] = [];

      for (const [day, cell] of Object.entries(days)) {
        if (cell.isRestDay || !cell.templateId) continue;

        totalScheduledDays++;

        // Check if any completed workout matches the templateId within this week's range
        const matched = completedWorkouts.some(
          (w) =>
            w.templateId === cell.templateId &&
            w.completedAt !== null &&
            w.completedAt >= weekStart &&
            w.completedAt < weekEnd
        );

        if (matched) {
          completedDays[weekStr].push(day);
          totalCompletedDays++;
        }
      }
    }

    const adherencePct =
      totalScheduledDays > 0 ? Math.round((totalCompletedDays / totalScheduledDays) * 100) : 0;

    return {
      assignmentId: assignment.id,
      startedAt: assignment.startedAt,
      program: {
        id: program.id,
        name: program.name,
        description: program.description,
        durationWeeks: program.durationWeeks,
        schedule: resolvedSchedule,
      },
      coach: assignment.coach,
      currentWeek,
      completedDays,
      adherencePct,
    };
  }),

  listAssignments: coachProcedure
    .input(z.object({ programId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const program = await ctx.db.program.findFirst({
        where: { id: input.programId, coachId: ctx.user.id },
      });

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Program not found",
        });
      }

      const assignments = await ctx.db.programAssignment.findMany({
        where: { programId: input.programId, coachId: ctx.user.id },
        include: {
          athlete: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return assignments.map((a) => ({
        id: a.id,
        athleteId: a.athlete.id,
        athleteName: a.athlete.name,
        athleteEmail: a.athlete.email,
        status: a.status,
        startedAt: a.startedAt,
      }));
    }),
});
