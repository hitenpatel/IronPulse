import { z } from "zod";

export const addClientSchema = z.object({ athleteEmail: z.string().email() });
export const removeClientSchema = z.object({ athleteId: z.string().uuid() });
export const clientProgressSchema = z.object({ athleteId: z.string().uuid() });
export const updateCoachProfileSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const uploadCoachProfileImageSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
