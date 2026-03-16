import { TRPCError } from "@trpc/server";
import {
  followSchema,
  unfollowSchema,
  searchUsersSchema,
  feedSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const socialRouter = createTRPCRouter({
  follow: protectedProcedure
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

  unfollow: protectedProcedure
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

  followers: protectedProcedure.query(async ({ ctx }) => {
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

  following: protectedProcedure.query(async ({ ctx }) => {
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

  searchUsers: protectedProcedure
    .input(searchUsersSchema)
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          id: { not: ctx.user.id },
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
        take: 20,
      });

      return { users };
    }),

  feed: protectedProcedure
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
        },
      });

      const hasMore = items.length > input.limit;
      const data = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),
});
