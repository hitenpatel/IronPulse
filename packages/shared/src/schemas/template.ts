import { z } from "zod";
import { SetType } from "../enums";
import { cursorPaginationSchema } from "./pagination";

export const listTemplatesSchema = cursorPaginationSchema;
export type ListTemplatesInput = z.infer<typeof listTemplatesSchema>;

export const getTemplateSchema = z.object({
  templateId: z.string().uuid(),
});
export type GetTemplateInput = z.infer<typeof getTemplateSchema>;

const templateSetInput = z.object({
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().nonnegative().optional(),
  targetWeightKg: z.number().nonnegative().optional(),
  type: z
    .enum([SetType.WORKING, SetType.WARMUP, SetType.DROPSET, SetType.FAILURE])
    .default(SetType.WORKING),
});

const templateExerciseInput = z.object({
  exerciseId: z.string().uuid(),
  order: z.number().int().nonnegative(),
  notes: z.string().max(2000).optional(),
  sets: z.array(templateSetInput).default([]),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  exercises: z.array(templateExerciseInput).default([]),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const saveWorkoutAsTemplateSchema = z.object({
  workoutId: z.string().uuid(),
  name: z.string().min(1).max(200),
});
export type SaveWorkoutAsTemplateInput = z.infer<typeof saveWorkoutAsTemplateSchema>;

export const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  exercises: z.array(templateExerciseInput).optional(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const deleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
});
export type DeleteTemplateInput = z.infer<typeof deleteTemplateSchema>;
