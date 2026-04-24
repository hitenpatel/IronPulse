import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "follow",
  "reaction",
  "message",
  "pr",
  "workout_complete",
  "goal_complete",
  "achievement",
  "coach_activity",
  // Retention hooks
  "streak_recovery",
  "reengagement",
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

/**
 * Deep-link payload attached to a notification. Kept narrow so future code
 * can rely on the shape rather than parsing arbitrary JSON. Extend as new
 * deep links are added.
 */
export const notificationDataSchema = z
  .object({
    achievementType: z.string().max(50).optional(),
    exerciseId: z.string().uuid().optional(),
    workoutId: z.string().uuid().optional(),
    messageThreadUserId: z.string().uuid().optional(),
    feedPostId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
  })
  .strict();
export type NotificationData = z.infer<typeof notificationDataSchema>;

export const listNotificationsSchema = z.object({
  limit: z.number().int().positive().max(50).default(20),
  cursor: z.string().uuid().optional(),
  unreadOnly: z.boolean().default(false),
});
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

export const markNotificationReadSchema = z.object({
  id: z.string().uuid(),
});
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
