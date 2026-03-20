import { z } from "zod";

export const sleepQualityEnum = z.enum(["poor", "fair", "good", "excellent"]);
export type SleepQuality = z.infer<typeof sleepQualityEnum>;

export const sleepSourceEnum = z.enum(["manual", "garmin", "apple_health"]);
export type SleepSource = z.infer<typeof sleepSourceEnum>;

export const logSleepSchema = z.object({
  date: z.date(),
  bedtime: z.date().optional(),
  wakeTime: z.date().optional(),
  durationMins: z.number().int().positive().optional(),
  quality: sleepQualityEnum.optional(),
  source: sleepSourceEnum.optional(),
  notes: z.string().optional(),
});
export type LogSleepInput = z.infer<typeof logSleepSchema>;

export const listSleepSchema = z.object({
  days: z.number().int().positive().max(90).default(7),
});
export type ListSleepInput = z.infer<typeof listSleepSchema>;

export const deleteSleepSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteSleepInput = z.infer<typeof deleteSleepSchema>;
