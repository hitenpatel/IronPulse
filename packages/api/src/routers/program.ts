import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProgramSchema,
  updateProgramSchema,
  assignProgramSchema,
  unassignProgramSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

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

      // Resolve template names from schedule
      const schedule = program.schedule as Record<
        string,
        Record<string, string>
      >;
      const templateIds = new Set<string>();
      for (const week of Object.values(schedule)) {
        for (const templateId of Object.values(week)) {
          if (templateId) templateIds.add(templateId);
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
        Record<string, { templateId: string; templateName: string | null }>
      > = {};
      for (const [week, days] of Object.entries(schedule)) {
        resolvedSchedule[week] = {};
        for (const [day, templateId] of Object.entries(days)) {
          resolvedSchedule[week][day] = {
            templateId,
            templateName: templateMap.get(templateId) ?? null,
          };
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
