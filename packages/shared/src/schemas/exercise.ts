import { z } from "zod";
import { ExerciseCategory, Equipment } from "../enums";
import { cursorPaginationSchema } from "./pagination";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    ExerciseCategory.COMPOUND,
    ExerciseCategory.ISOLATION,
    ExerciseCategory.CARDIO,
    ExerciseCategory.STRETCHING,
    ExerciseCategory.PLYOMETRIC,
  ]),
  primaryMuscles: z.array(z.string().max(50)).min(1).max(20),
  secondaryMuscles: z.array(z.string().max(50)).max(20).default([]),
  equipment: z
    .enum([
      Equipment.BARBELL,
      Equipment.DUMBBELL,
      Equipment.KETTLEBELL,
      Equipment.MACHINE,
      Equipment.CABLE,
      Equipment.BODYWEIGHT,
      Equipment.BAND,
      Equipment.OTHER,
    ])
    .nullable()
    .optional(),
  instructions: z.string().max(5000).optional(),
});
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export const uploadExerciseMediaSchema = z.object({
  exerciseId: z.string().uuid(),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]),
  mediaType: z.enum(["image", "video"]),
});
export type UploadExerciseMediaInput = z.infer<typeof uploadExerciseMediaSchema>;

export const listExercisesSchema = cursorPaginationSchema.extend({
  muscleGroup: z.string().max(50).optional(),
  equipment: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
});
export type ListExercisesInput = z.infer<typeof listExercisesSchema>;
