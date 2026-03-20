import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addClientSchema,
  removeClientSchema,
  clientProgressSchema,
  updateCoachProfileSchema,
  uploadCoachProfileImageSchema,
} from "@ironpulse/shared";
import { getPresignedUploadUrl } from "../lib/s3";
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

export const coachRouter = createTRPCRouter({
  clients: coachProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.programAssignment.findMany({
      where: { coachId: ctx.user.id },
      include: {
        athlete: { select: { id: true, name: true, email: true } },
        program: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      athleteId: a.athlete.id,
      athleteName: a.athlete.name,
      athleteEmail: a.athlete.email,
      programName: a.program?.name ?? null,
      status: a.status,
      startedAt: a.startedAt,
    }));
  }),

  addClient: coachProcedure
    .input(addClientSchema)
    .mutation(async ({ ctx, input }) => {
      const athlete = await ctx.db.user.findUnique({
        where: { email: input.athleteEmail },
        select: { id: true },
      });

      if (!athlete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with that email",
        });
      }

      if (athlete.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add yourself as a client",
        });
      }

      const existing = await ctx.db.programAssignment.findFirst({
        where: { coachId: ctx.user.id, athleteId: athlete.id },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This athlete is already your client",
        });
      }

      const MAX_CLIENTS = 25;
      const clientCount = await ctx.db.programAssignment.count({
        where: { coachId: ctx.user.id, status: { not: "cancelled" } },
      });
      if (clientCount >= MAX_CLIENTS) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Client limit reached (${MAX_CLIENTS}). Upgrade your plan to add more clients.`,
        });
      }

      const assignment = await ctx.db.programAssignment.create({
        data: {
          coachId: ctx.user.id,
          athleteId: athlete.id,
          status: "pending",
        },
      });

      return { assignmentId: assignment.id, athleteId: athlete.id };
    }),

  removeClient: coachProcedure
    .input(removeClientSchema)
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.programAssignment.deleteMany({
        where: { coachId: ctx.user.id, athleteId: input.athleteId },
      });

      if (deleted.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No assignments found for this athlete",
        });
      }

      return { removed: deleted.count };
    }),

  clientProgress: coachProcedure
    .input(clientProgressSchema)
    .query(async ({ ctx, input }) => {
      // Verify coach-athlete relationship
      const relationship = await ctx.db.programAssignment.findFirst({
        where: { coachId: ctx.user.id, athleteId: input.athleteId },
      });

      if (!relationship) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This athlete is not your client",
        });
      }

      const [workouts, cardioSessions, personalRecords, bodyMetrics] =
        await Promise.all([
          ctx.db.workout.findMany({
            where: { userId: input.athleteId },
            orderBy: { startedAt: "desc" },
            take: 10,
            include: {
              workoutExercises: {
                include: { exercise: { select: { name: true } }, sets: true },
              },
            },
          }),
          ctx.db.cardioSession.findMany({
            where: { userId: input.athleteId },
            orderBy: { startedAt: "desc" },
            take: 10,
          }),
          ctx.db.personalRecord.findMany({
            where: { userId: input.athleteId },
            orderBy: { achievedAt: "desc" },
            take: 10,
            include: { exercise: { select: { name: true } } },
          }),
          ctx.db.bodyMetric.findMany({
            where: { userId: input.athleteId },
            orderBy: { date: "desc" },
            take: 10,
          }),
        ]);

      return { workouts, cardioSessions, personalRecords, bodyMetrics };
    }),

  profile: coachProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.coachProfile.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id },
      update: {},
    });

    return profile;
  }),

  updateProfile: coachProcedure
    .input(updateCoachProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.coachProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          ...input,
        },
        update: input,
      });

      return profile;
    }),

  uploadProfileImage: coachProcedure
    .input(uploadCoachProfileImageSchema)
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType.split("/")[1];
      const imageKey = `coach-profiles/${ctx.user.id}/${Date.now()}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(imageKey, input.contentType);

      return { uploadUrl, imageKey };
    }),

  listPublicCoaches: rateLimitedProcedure
    .input(
      z.object({
        specialty: z.string().optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { isPublic: true };
      if (input.specialty) {
        where.specialties = { has: input.specialty };
      }
      if (input.search) {
        where.user = { name: { contains: input.search, mode: "insensitive" } };
      }

      const profiles = await ctx.db.coachProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              _count: {
                select: {
                  coachAssignments: { where: { status: "active" } },
                },
              },
            },
          },
        },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
      });

      const hasMore = profiles.length > input.limit;
      const sliced = profiles.slice(0, input.limit);
      return {
        coaches: sliced.map((p) => ({
          id: p.id,
          userId: p.userId,
          bio: p.bio,
          specialties: p.specialties,
          imageUrl: p.imageUrl,
          createdAt: p.createdAt,
          user: {
            id: p.user.id,
            name: p.user.name,
            avatarUrl: p.user.avatarUrl,
          },
          activeClientCount: p.user._count.coachAssignments,
        })),
        nextCursor: hasMore ? sliced[sliced.length - 1]!.id : null,
      };
    }),
});
