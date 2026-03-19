import { z } from "zod";

export const followSchema = z.object({
  userId: z.string().uuid(),
});
export type FollowInput = z.infer<typeof followSchema>;

export const unfollowSchema = z.object({
  userId: z.string().uuid(),
});
export type UnfollowInput = z.infer<typeof unfollowSchema>;

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

export const getUserProfileSchema = z.object({
  userId: z.string().uuid(),
});
export type GetUserProfileInput = z.infer<typeof getUserProfileSchema>;

export const feedSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type FeedInput = z.infer<typeof feedSchema>;

export const reactionTypeEnum = z.enum(["kudos", "fire", "muscle"]);
export type ReactionType = z.infer<typeof reactionTypeEnum>;

export const toggleReactionSchema = z.object({
  feedItemId: z.string().uuid(),
  type: reactionTypeEnum,
});
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
