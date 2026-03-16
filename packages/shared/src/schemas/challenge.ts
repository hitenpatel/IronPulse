import { z } from "zod";

export const createChallengeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["volume", "distance", "streak"]),
  target: z.number().positive(),
  startsAt: z.string(),
  endsAt: z.string(),
});
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const joinChallengeSchema = z.object({
  challengeId: z.string().uuid(),
});
export type JoinChallengeInput = z.infer<typeof joinChallengeSchema>;

export const leaveChallengeSchema = z.object({
  challengeId: z.string().uuid(),
});
export type LeaveChallengeInput = z.infer<typeof leaveChallengeSchema>;

export const updateChallengeProgressSchema = z.object({
  challengeId: z.string().uuid(),
  progress: z.number().min(0),
});
export type UpdateChallengeProgressInput = z.infer<typeof updateChallengeProgressSchema>;
