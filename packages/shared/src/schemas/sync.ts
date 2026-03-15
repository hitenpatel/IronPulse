import { z } from "zod";

const SYNCED_TABLES = [
  "workouts",
  "workout_exercises",
  "exercise_sets",
  "cardio_sessions",
  "laps",
  "workout_templates",
  "template_exercises",
  "template_sets",
  "body_metrics",
  "personal_records",
  "exercises",
] as const;

export const syncedTableSchema = z.enum(SYNCED_TABLES);

export const syncApplySchema = z.object({
  table: syncedTableSchema,
  record: z
    .record(z.string(), z.unknown())
    .refine((r) => typeof r.id === "string", {
      message: "record must include a string id",
    }),
});

export const syncUpdateSchema = z.object({
  table: syncedTableSchema,
  id: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
});

export const syncDeleteSchema = z.object({
  table: syncedTableSchema,
  id: z.string().uuid(),
});
