import { z } from "zod";

export const aiWorkoutGoal = z.enum(["strength", "hypertrophy", "endurance"]);
export type AiWorkoutGoal = z.infer<typeof aiWorkoutGoal>;

export const aiWorkoutExperienceLevel = z.enum(["beginner", "intermediate", "advanced"]);
export type AiWorkoutExperienceLevel = z.infer<typeof aiWorkoutExperienceLevel>;

export const generateAiWorkoutSchema = z.object({
  goal: aiWorkoutGoal,
  experienceLevel: aiWorkoutExperienceLevel,
  equipment: z.array(z.string().min(1)).min(1).max(10),
});
export type GenerateAiWorkoutInput = z.infer<typeof generateAiWorkoutSchema>;

export const aiWorkoutSetSchema = z.object({
  setNumber: z.number().int().positive(),
  targetReps: z.number().int().positive(),
});
export type AiWorkoutSet = z.infer<typeof aiWorkoutSetSchema>;

export const aiWorkoutExerciseSchema = z.object({
  exerciseName: z.string(),
  matchedExerciseId: z.string().uuid().nullable(),
  order: z.number().int().nonnegative(),
  notes: z.string(),
  sets: z.array(aiWorkoutSetSchema),
});
export type AiWorkoutExercise = z.infer<typeof aiWorkoutExerciseSchema>;

export const aiWorkoutResultSchema = z.object({
  name: z.string(),
  exercises: z.array(aiWorkoutExerciseSchema),
});
export type AiWorkoutResult = z.infer<typeof aiWorkoutResultSchema>;
