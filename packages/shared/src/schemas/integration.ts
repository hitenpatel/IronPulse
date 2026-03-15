import { z } from "zod";

export const disconnectProviderSchema = z.object({
  provider: z.enum(["strava", "garmin", "apple_health"]),
});

export const completeStravaAuthSchema = z.object({
  code: z.string().min(1),
});

export const syncNowSchema = z.object({
  provider: z.enum(["strava", "garmin", "apple_health"]),
});
