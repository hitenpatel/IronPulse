import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@zor/db";
import {
  logInjurySchema,
  updateInjurySchema,
  listInjuriesSchema,
  deleteInjurySchema,
  getInjuryByIdSchema,
  logRecoveryActivitySchema,
  listRecoveryActivitiesSchema,
  createRestrictionSchema,
  listRestrictionsSchema,
  deleteRestrictionSchema,
} from "@zor/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

async function assertOwnsInjury(
  db: PrismaClient,
  injuryId: string,
  userId: string
) {
  const owned = await db.injuryLog.count({ where: { id: injuryId, userId } });
  if (owned === 0) throw new TRPCError({ code: "NOT_FOUND" });
}

export const injuryRouter = createTRPCRouter({
  log: rateLimitedProcedure
    .input(logInjurySchema)
    .mutation(async ({ ctx, input }) => {
      const injury = await ctx.db.injuryLog.create({
        data: {
          userId: ctx.user.id,
          injuredAt: input.injuredAt,
          injuryType: input.injuryType,
          severity: input.severity,
          // Stored lower-cased so the `bodyPart` filter on `list` (which
          // also lower-cases its input) can match with a case-sensitive
          // `has` — see the muscle/body-part vocabulary amendment.
          bodyParts: input.bodyParts.map((b) => b.toLowerCase()),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      return { injury };
    }),

  list: rateLimitedProcedure
    .input(listInjuriesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.injuryLog.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
          // NOTE: `has` is case-sensitive. Both the logging form and this
          // filter must submit body parts already lower-cased (see the
          // vocabulary amendment in Global Constraints).
          ...(input.bodyPart && { bodyParts: { has: input.bodyPart.toLowerCase() } }),
          ...((input.from || input.to) && {
            injuredAt: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }),
        },
        orderBy: { injuredAt: "desc" },
        take: input.limit,
      });
      return { data };
    }),

  getById: rateLimitedProcedure
    .input(getInjuryByIdSchema)
    .query(async ({ ctx, input }) => {
      const injury = await ctx.db.injuryLog.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!injury) throw new TRPCError({ code: "NOT_FOUND" });
      return { injury };
    }),

  update: rateLimitedProcedure
    .input(updateInjurySchema)
    .mutation(async ({ ctx, input }) => {
      // Not wrapped in a transaction: a concurrent delete between the
      // updateMany and the findUniqueOrThrow below would surface as
      // INTERNAL (findUniqueOrThrow throwing) rather than NOT_FOUND. This
      // is accepted rather than fixed with $transaction because injury
      // rows have no other writer than their owning user, so the race
      // requires the same user to delete and update the same injury from
      // two concurrent requests — an edge case worth documenting, not
      // worth the added complexity of wrapping two calls that already
      // each execute atomically.
      const { count } = await ctx.db.injuryLog.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: {
          ...(input.severity !== undefined && { severity: input.severity }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.resolvedAt !== undefined && { resolvedAt: input.resolvedAt }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const injury = await ctx.db.injuryLog.findUniqueOrThrow({ where: { id: input.id } });
      return { injury };
    }),

  delete: rateLimitedProcedure
    .input(deleteInjurySchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.injuryLog.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),

  logRecovery: rateLimitedProcedure
    .input(logRecoveryActivitySchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnsInjury(ctx.db, input.injuryId, ctx.user.id);
      const activity = await ctx.db.recoveryActivity.create({
        data: {
          userId: ctx.user.id,
          injuryId: input.injuryId,
          performedAt: input.performedAt,
          modality: input.modality,
          ...(input.durationMins !== undefined && { durationMins: input.durationMins }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      return { activity };
    }),

  listRecovery: rateLimitedProcedure
    .input(listRecoveryActivitiesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.recoveryActivity.findMany({
        where: { userId: ctx.user.id, ...(input.injuryId && { injuryId: input.injuryId }) },
        orderBy: { performedAt: "desc" },
        take: input.limit,
      });
      return { data };
    }),

  addRestriction: rateLimitedProcedure
    .input(createRestrictionSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnsInjury(ctx.db, input.injuryId, ctx.user.id);
      const restriction = await ctx.db.exerciseRestriction.create({
        data: {
          userId: ctx.user.id,
          injuryId: input.injuryId,
          muscleGroups: input.muscleGroups,
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
          ...(input.note !== undefined && { note: input.note }),
        },
      });
      return { restriction };
    }),

  listRestrictions: rateLimitedProcedure
    .input(listRestrictionsSchema)
    .query(async ({ ctx, input }) => {
      const activeOn = input.activeOn ?? new Date();
      const data = await ctx.db.exerciseRestriction.findMany({
        where: {
          userId: ctx.user.id,
          startsAt: { lte: activeOn },
          expiresAt: { gte: activeOn },
        },
        // Explicit select: the documented row shape must be the actual row
        // shape, and userId must not travel to the client.
        select: {
          id: true,
          injuryId: true,
          muscleGroups: true,
          note: true,
          startsAt: true,
          expiresAt: true,
        },
        orderBy: { expiresAt: "asc" },
        take: 200,
      });
      return { data };
    }),

  deleteRestriction: rateLimitedProcedure
    .input(deleteRestrictionSchema)
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.exerciseRestriction.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
});
