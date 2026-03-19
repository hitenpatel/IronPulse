import { TRPCError } from "@trpc/server";
import {
  followSchema,
  unfollowSchema,
  searchUsersSchema,
  getUserProfileSchema,
  feedSchema,
  toggleReactionSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const socialRouter = createTRPCRouter({
  follow: rateLimitedProcedure
    .input(followSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot follow yourself",
        });
      }

      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const follow = await ctx.db.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: ctx.user.id,
            followingId: input.userId,
          },
        },
        create: {
          followerId: ctx.user.id,
          followingId: input.userId,
        },
        update: {},
        select: { id: true, followingId: true, createdAt: true },
      });

      return { follow };
    }),

  unfollow: rateLimitedProcedure
    .input(unfollowSchema)
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.follow.deleteMany({
        where: {
          followerId: ctx.user.id,
          followingId: input.userId,
        },
      });

      return { success: deleted.count > 0 };
    }),

  followers: rateLimitedProcedure.query(async ({ ctx }) => {
    const followers = await ctx.db.follow.findMany({
      where: { followingId: ctx.user.id },
      select: {
        id: true,
        createdAt: true,
        follower: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { followers: followers.map((f) => ({ ...f.follower, followedAt: f.createdAt })) };
  }),

  following: rateLimitedProcedure.query(async ({ ctx }) => {
    const following = await ctx.db.follow.findMany({
      where: { followerId: ctx.user.id },
      select: {
        id: true,
        createdAt: true,
        following: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { following: following.map((f) => ({ ...f.following, followedAt: f.createdAt })) };
  }),

  searchUsers: rateLimitedProcedure
    .input(searchUsersSchema)
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          id: { not: ctx.user.id },
          name: { contains: input.query, mode: "insensitive" },
        },
        select: { id: true, name: true, avatarUrl: true },
        take: 20,
      });

      return { users };
    }),

  getUserProfile: rateLimitedProcedure
    .input(getUserProfileSchema)
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
              workouts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const isFollowing = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.user.id,
            followingId: input.userId,
          },
        },
        select: { id: true },
      });

      const recentActivity = await ctx.db.activityFeedItem.findMany({
        where: {
          userId: input.userId,
          visibility: input.userId === ctx.user.id
            ? undefined
            : isFollowing
              ? { in: ["public", "followers"] }
              : "public",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          referenceId: true,
          createdAt: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        workoutCount: user._count.workouts,
        isFollowing: !!isFollowing,
        isOwnProfile: input.userId === ctx.user.id,
        recentActivity,
      };
    }),

  feed: rateLimitedProcedure
    .input(feedSchema)
    .query(async ({ ctx, input }) => {
      // Get IDs of users the current user follows
      const followingRows = await ctx.db.follow.findMany({
        where: { followerId: ctx.user.id },
        select: { followingId: true },
      });
      const followingIds = followingRows.map((f) => f.followingId);

      const items = await ctx.db.activityFeedItem.findMany({
        where: {
          OR: [
            // Own items (any visibility)
            { userId: ctx.user.id },
            // Followed users' public or followers-only items
            {
              userId: { in: followingIds },
              visibility: { in: ["public", "followers"] },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          type: true,
          referenceId: true,
          visibility: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          reactions: {
            select: { type: true, userId: true },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const rawData = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore ? rawData[rawData.length - 1]!.id : null;

      // Shape reactions: counts per type + current user's reactions
      const data = rawData.map((item) => {
        const reactionCounts: Record<string, number> = {};
        const myReactions: string[] = [];
        for (const r of item.reactions) {
          reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
          if (r.userId === ctx.user.id) {
            myReactions.push(r.type);
          }
        }
        const { reactions: _reactions, ...rest } = item;
        return { ...rest, reactionCounts, myReactions };
      });

      // Collect reference IDs by type to avoid N+1
      const workoutIds = data.filter((i) => i.type === "workout").map((i) => i.referenceId);
      const cardioIds = data.filter((i) => i.type === "cardio").map((i) => i.referenceId);
      const prIds = data.filter((i) => i.type === "pr").map((i) => i.referenceId);

      // Fetch preview data in parallel
      const [workouts, cardioSessions, personalRecords] = await Promise.all([
        workoutIds.length > 0
          ? ctx.db.workout.findMany({
              where: { id: { in: workoutIds } },
              select: {
                id: true,
                name: true,
                durationSeconds: true,
                workoutExercises: {
                  orderBy: { order: "asc" },
                  select: {
                    order: true,
                    exercise: { select: { name: true } },
                    sets: {
                      where: { completed: true },
                      select: { weightKg: true, reps: true },
                    },
                  },
                },
              },
            })
          : Promise.resolve([]),
        cardioIds.length > 0
          ? ctx.db.cardioSession.findMany({
              where: { id: { in: cardioIds } },
              select: {
                id: true,
                type: true,
                durationSeconds: true,
                distanceMeters: true,
              },
            })
          : Promise.resolve([]),
        prIds.length > 0
          ? ctx.db.personalRecord.findMany({
              where: { id: { in: prIds } },
              select: {
                id: true,
                type: true,
                value: true,
                exercise: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
      ]);

      // Build lookup maps
      type WorkoutPreview = {
        workoutName: string | null;
        durationSeconds: number | null;
        topExercises: string[];
        totalVolumeKg: number;
        prCount: number;
      };
      type CardioPreview = {
        cardioType: string;
        durationSeconds: number;
        distanceMeters: number | null;
      };
      type PrPreview = {
        exerciseName: string;
        prType: string;
        value: number;
      };

      const workoutMap = new Map<string, WorkoutPreview>();
      for (const w of workouts) {
        const topExercises = w.workoutExercises
          .slice(0, 3)
          .map((we) => we.exercise.name);
        let totalVolumeKg = 0;
        for (const we of w.workoutExercises) {
          for (const s of we.sets) {
            if (s.weightKg != null && s.reps != null) {
              totalVolumeKg += Number(s.weightKg) * s.reps;
            }
          }
        }
        workoutMap.set(w.id, {
          workoutName: w.name,
          durationSeconds: w.durationSeconds,
          topExercises,
          totalVolumeKg,
          prCount: 0, // populated below
        });
      }

      const cardioMap = new Map<string, CardioPreview>();
      for (const c of cardioSessions) {
        cardioMap.set(c.id, {
          cardioType: c.type,
          durationSeconds: c.durationSeconds,
          distanceMeters: c.distanceMeters != null ? Number(c.distanceMeters) : null,
        });
      }

      const prMap = new Map<string, PrPreview>();
      for (const pr of personalRecords) {
        prMap.set(pr.id, {
          exerciseName: pr.exercise.name,
          prType: pr.type,
          value: Number(pr.value),
        });
      }

      // Attach preview data to each item
      const enriched = data.map((item) => ({
        ...item,
        workoutPreview: item.type === "workout" ? (workoutMap.get(item.referenceId) ?? null) : null,
        cardioPreview: item.type === "cardio" ? (cardioMap.get(item.referenceId) ?? null) : null,
        prPreview: item.type === "pr" ? (prMap.get(item.referenceId) ?? null) : null,
      }));

      return { data: enriched, nextCursor };
    }),

  toggleReaction: rateLimitedProcedure
    .input(toggleReactionSchema)
    .mutation(async ({ ctx, input }) => {
      const feedItem = await ctx.db.activityFeedItem.findUnique({
        where: { id: input.feedItemId },
        select: { id: true },
      });
      if (!feedItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feed item not found" });
      }

      const existing = await ctx.db.feedReaction.findUnique({
        where: {
          feedItemId_userId_type: {
            feedItemId: input.feedItemId,
            userId: ctx.user.id,
            type: input.type,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await ctx.db.feedReaction.delete({ where: { id: existing.id } });
        return { active: false };
      }

      await ctx.db.feedReaction.create({
        data: {
          feedItemId: input.feedItemId,
          userId: ctx.user.id,
          type: input.type,
        },
      });
      return { active: true };
    }),
});
