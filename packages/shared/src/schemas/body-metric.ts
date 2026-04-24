import { z } from "zod";

/**
 * Body measurements map — keyed by a short muscle-group or site name,
 * value is the measurement in centimetres. Bounded to 30 entries × 30-char
 * keys × non-negative finite numbers so the Prisma JSON column can't be
 * stuffed with megabytes of garbage through the API.
 */
export const bodyMeasurementsSchema = z
  .record(
    z.string().min(1).max(30),
    z.number().finite().nonnegative().max(1000),
  )
  .refine((o) => Object.keys(o).length <= 30, {
    message: "At most 30 measurement entries",
  });

export const createBodyMetricSchema = z.object({
  date: z.date(),
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  measurements: bodyMeasurementsSchema.optional(),
});
export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;

export const listBodyMetricsSchema = z.object({
  from: z.date(),
  to: z.date(),
});
export type ListBodyMetricsInput = z.infer<typeof listBodyMetricsSchema>;
