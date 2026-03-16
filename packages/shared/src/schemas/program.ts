import { z } from "zod";

export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  durationWeeks: z.number().int().min(1).max(52),
  schedule: z.record(z.string(), z.record(z.string(), z.string())),
});

export const updateProgramSchema = createProgramSchema.extend({
  id: z.string().uuid(),
});

export const assignProgramSchema = z.object({
  programId: z.string().uuid(),
  athleteId: z.string().uuid(),
  startDate: z.string(),
});

export const unassignProgramSchema = z.object({
  assignmentId: z.string().uuid(),
});
