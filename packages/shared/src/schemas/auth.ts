import { z } from "zod";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  consentedAt: z.date().optional(),
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
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const completeOnboardingSchema = z.object({
  name: z.string().min(1).max(100),
  unitSystem: z.enum(["metric", "imperial"]),
  fitnessGoal: z.enum(["lose_weight", "build_muscle", "endurance", "general"]).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export const passkeyRegisterVerifySchema = z.object({
  attestation: z.custom<RegistrationResponseJSON>(),
  name: z.string().max(50).optional(),
});
export type PasskeyRegisterVerifyInput = z.infer<typeof passkeyRegisterVerifySchema>;

export const passkeyLoginVerifySchema = z.object({
  assertion: z.custom<AuthenticationResponseJSON>(),
  challenge: z.string().min(1).max(512),
});
export type PasskeyLoginVerifyInput = z.infer<typeof passkeyLoginVerifySchema>;

export const passkeyRenameSchema = z.object({
  passkeyId: z.string().uuid(),
  name: z.string().min(1).max(50),
});
export type PasskeyRenameInput = z.infer<typeof passkeyRenameSchema>;

export const passkeyDeleteSchema = z.object({
  passkeyId: z.string().uuid(),
});
export type PasskeyDeleteInput = z.infer<typeof passkeyDeleteSchema>;

export const removePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128).optional(),
  passkeyAssertion: z.custom<AuthenticationResponseJSON>().optional(),
});
export type RemovePasswordInput = z.infer<typeof removePasswordSchema>;

export const mobileOAuthSignInSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
});
export type MobileOAuthSignInInput = z.infer<typeof mobileOAuthSignInSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(1),
});
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export const confirmEmailChangeSchema = z.object({
  token: z.string().min(1).max(512),
});
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
