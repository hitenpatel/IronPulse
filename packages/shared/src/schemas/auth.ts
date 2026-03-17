import { z } from "zod";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

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

export const passkeyRegisterVerifySchema = z.object({
  attestation: z.custom<RegistrationResponseJSON>(),
  name: z.string().max(50).optional(),
});
export type PasskeyRegisterVerifyInput = z.infer<typeof passkeyRegisterVerifySchema>;

export const passkeyLoginVerifySchema = z.object({
  assertion: z.custom<AuthenticationResponseJSON>(),
  challenge: z.string(),
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
  currentPassword: z.string().optional(),
  passkeyAssertion: z.custom<AuthenticationResponseJSON>().optional(),
});
export type RemovePasswordInput = z.infer<typeof removePasswordSchema>;
