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
]);
export type NotificationType = z.infer<typeof notificationTypeEnum>;

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
