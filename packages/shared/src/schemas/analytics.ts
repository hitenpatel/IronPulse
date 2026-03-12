import { z } from "zod";

export const weeklyVolumeSchema = z.object({
  weeks: z.number().int().min(1).max(52).default(4),
});
export type WeeklyVolumeInput = z.infer<typeof weeklyVolumeSchema>;

export const personalRecordsSchema = z.object({
  exerciseId: z.string().uuid(),
});
export type PersonalRecordsInput = z.infer<typeof personalRecordsSchema>;

export const bodyWeightTrendSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});
export type BodyWeightTrendInput = z.infer<typeof bodyWeightTrendSchema>;
