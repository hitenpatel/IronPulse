import { z } from "zod";

export const createProgressPhotoSchema = z.object({
  photoUrl: z.string().min(1),
  date: z.string(), // ISO date string YYYY-MM-DD
  notes: z.string().max(2000).optional(),
});

export const uploadProgressPhotoSchema = z.object({
  contentType: z.string().regex(/^image\//),
});

export const deleteProgressPhotoSchema = z.object({
  id: z.string().uuid(),
});
