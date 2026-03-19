import { TRPCError } from "@trpc/server";
import {
  createChallengeSchema,
  joinChallengeSchema,
  leaveChallengeSchema,
  updateChallengeProgressSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const challengeRouter = createTRPCRouter({
  create: rateLimitedProcedure
    .input(createChallengeSchema)
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.create({
        data: {
          creatorId: ctx.user.id,
          name: input.name,
          type: input.type,
          target: input.target,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          participants: {
            create: {
              userId: ctx.user.id,
              progress: 0,
            },
          },
        },
        include: {
          _count: { select: { participants: true } },
        },
      });

      return { challenge };
    }),

  join: rateLimitedProcedure
    .input(joinChallengeSchema)
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.challengeId },
        select: { id: true, endsAt: true },
      });

      if (!challenge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
      }

      if (challenge.endsAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge has ended" });
      }

      const participant = await ctx.db.challengeParticipant.upsert({
        where: {
          challengeId_userId: {
            challengeId: input.challengeId,
            userId: ctx.user.id,
          },
        },
        create: {
          challengeId: input.challengeId,
          userId: ctx.user.id,
          progress: 0,
        },
        update: {},
        select: { id: true, challengeId: true, joinedAt: true },
      });

      return { participant };
    }),

  leave: rateLimitedProcedure
    .input(leaveChallengeSchema)
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.challengeId },
        select: { creatorId: true },
      });

      if (!challenge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
      }

      if (challenge.creatorId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot leave a challenge you created",
        });
      }

      const deleted = await ctx.db.challengeParticipant.deleteMany({
        where: {
          challengeId: input.challengeId,
          userId: ctx.user.id,
        },
      });

      return { success: deleted.count > 0 };
    }),

  list: rateLimitedProcedure.query(async ({ ctx }) => {
    const challenges = await ctx.db.challenge.findMany({
      where: {
        endsAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { participants: true } },
        participants: {
          where: { userId: ctx.user.id },
          select: { id: true, progress: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      challenges: challenges.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        target: Number(c.target),
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        createdAt: c.createdAt,
        creatorName: c.creator.name,
        participantCount: c._count.participants,
        joined: c.participants.length > 0,
        myProgress: c.participants[0] ? Number(c.participants[0].progress) : null,
      })),
    };
  }),

  getById: rateLimitedProcedure
    .input(joinChallengeSchema)
    .query(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.challengeId },
        include: {
          creator: { select: { id: true, name: true } },
          participants: {
            orderBy: { progress: "desc" },
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });

      if (!challenge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
      }

      return {
        challenge: {
          id: challenge.id,
          name: challenge.name,
          type: challenge.type,
          target: Number(challenge.target),
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
          createdAt: challenge.createdAt,
          creatorName: challenge.creator.name,
          leaderboard: challenge.participants.map((p, i) => ({
            rank: i + 1,
            userId: p.user.id,
            name: p.user.name,
            avatarUrl: p.user.avatarUrl,
            progress: Number(p.progress),
          })),
        },
      };
    }),

  updateProgress: rateLimitedProcedure
    .input(updateChallengeProgressSchema)
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.db.challengeParticipant.findUnique({
        where: {
          challengeId_userId: {
            challengeId: input.challengeId,
            userId: ctx.user.id,
          },
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a participant of this challenge",
        });
      }

      const updated = await ctx.db.challengeParticipant.update({
        where: { id: participant.id },
        data: { progress: input.progress },
        select: { id: true, progress: true },
      });

      return { participant: updated };
    }),
});
