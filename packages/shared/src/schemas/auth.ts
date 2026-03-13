import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const sendMagicLinkSchema = z.object({
  email: z.string().email(),
});
export type SendMagicLinkInput = z.infer<typeof sendMagicLinkSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const completeOnboardingSchema = z.object({
  name: z.string().min(1).max(100),
  unitSystem: z.enum(["metric", "imperial"]),
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
