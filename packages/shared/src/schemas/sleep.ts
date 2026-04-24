import { z } from "zod";

/**
 * Sleep stage breakdown as delivered by consumer devices (Oura, Apple
 * Watch, Garmin). Bounded to a small, typed record so downstream readers
 * can rely on the shape and the DB can't be stuffed with arbitrary JSON.
 */
export const sleepStagesSchema = z.object({
  awakeMins: z.number().finite().nonnegative().max(1440).optional(),
  lightMins: z.number().finite().nonnegative().max(1440).optional(),
  deepMins: z.number().finite().nonnegative().max(1440).optional(),
  remMins: z.number().finite().nonnegative().max(1440).optional(),
});
export type SleepStages = z.infer<typeof sleepStagesSchema>;

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
  stages: sleepStagesSchema.optional(),
  notes: z.string().max(2000).optional(),
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
