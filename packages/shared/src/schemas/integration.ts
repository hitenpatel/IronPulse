import { z } from "zod";

export const providerEnum = z.enum([
  "strava",
  "garmin",
  "apple_health",
  "polar",
  "withings",
  "oura",
  "intervals_icu",
]);

export const disconnectProviderSchema = z.object({
  provider: providerEnum,
});

export const completeStravaAuthSchema = z.object({
  code: z.string().min(1),
});

export const completeGarminAuthSchema = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
});

export const completeIntervalsIcuAuthSchema = z.object({
  apiKey: z.string().min(1),
  athleteId: z.string().min(1),
});

export const syncNowSchema = z.object({
  provider: providerEnum,
});
