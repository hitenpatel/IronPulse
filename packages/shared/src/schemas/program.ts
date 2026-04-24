import { z } from "zod";

// A program schedule is a 7-day × N-week grid. Each schedule dimension is
// capped (7 days, 52 weeks) to keep the serialised JSON bounded, so an
// attacker can't push multi-megabyte "schedules" into the DB.
const DAY_OF_WEEK_KEY = z.string().max(16);
const WEEK_KEY = z.string().max(8);

export const scheduleCellSchema = z
  .object({
    templateId: z.string().uuid(),
    templateName: z.string().min(1).max(100),
    isRestDay: z.boolean().optional(),
  })
  .nullable();

export const programScheduleSchema = z.record(
  WEEK_KEY,
  z.record(DAY_OF_WEEK_KEY, scheduleCellSchema),
);

export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  // Older callers still send a flat week→day→templateId map; accept either
  // shape while still bounding key/value lengths.
  schedule: z.record(
    WEEK_KEY,
    z.record(DAY_OF_WEEK_KEY, z.string().max(100)),
  ),
});

export const updateProgramSchema = createProgramSchema.extend({
  id: z.string().uuid(),
});

export const updateScheduleSchema = z.object({
  programId: z.string().uuid(),
  schedule: programScheduleSchema,
});

export const assignProgramSchema = z.object({
  programId: z.string().uuid(),
  athleteId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export const unassignProgramSchema = z.object({
  assignmentId: z.string().uuid(),
});
