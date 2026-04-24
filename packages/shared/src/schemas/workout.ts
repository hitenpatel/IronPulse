import { z } from "zod";
import { SetType } from "../enums";

export const createWorkoutSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  templateId: z.string().uuid().optional(),
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export const addExerciseSchema = z.object({
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});
export type AddExerciseInput = z.infer<typeof addExerciseSchema>;

export const addSetSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  weight: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  type: z
    .enum([SetType.WORKING, SetType.WARMUP, SetType.DROPSET, SetType.FAILURE])
    .optional(),
  rpe: z.number().min(1).max(10).optional(),
});
export type AddSetInput = z.infer<typeof addSetSchema>;

export const updateSetSchema = z.object({
  setId: z.string().uuid(),
  weight: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  rpe: z.number().min(1).max(10).optional(),
  type: z
    .enum([SetType.WORKING, SetType.WARMUP, SetType.DROPSET, SetType.FAILURE])
    .optional(),
  completed: z.boolean().optional(),
});
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const deleteSetSchema = z.object({
  setId: z.string().uuid(),
});
export type DeleteSetInput = z.infer<typeof deleteSetSchema>;

export const completeWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  completedAt: z.date().optional(),
});
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;
