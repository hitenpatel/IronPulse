import { z } from "zod";
import { UnitSystem } from "../enums";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unitSystem: z.enum([UnitSystem.METRIC, UnitSystem.IMPERIAL]).optional(),
  defaultRestSeconds: z.number().int().min(15).max(600).optional(),
  weeklySummaryEnabled: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const uploadAvatarSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>;

export const registerPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.string().min(1),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

export const unregisterPushTokenSchema = z.object({
  token: z.string().min(1),
});
export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;
