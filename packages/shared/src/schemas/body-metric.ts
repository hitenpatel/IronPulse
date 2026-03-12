import { z } from "zod";

export const createBodyMetricSchema = z.object({
  date: z.date(),
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  measurements: z.record(z.number()).optional(),
});
export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;

export const listBodyMetricsSchema = z.object({
  from: z.date(),
  to: z.date(),
});
export type ListBodyMetricsInput = z.infer<typeof listBodyMetricsSchema>;
