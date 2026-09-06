import { z } from "zod";

// Strava
export const stravaWebhookSchema = z.object({
  object_type: z.string(),
  aspect_type: z.string(),
  object_id: z.number(),
  owner_id: z.number(),
});
export type StravaWebhookEvent = z.infer<typeof stravaWebhookSchema>;
export function stravaEventKey(p: StravaWebhookEvent) {
  return { providerAccountId: String(p.owner_id), externalId: String(p.object_id) };
}

// Garmin — one queue row per batch; per-activity connection lookup happens in the dispatcher.
export const garminWebhookSchema = z.object({
  activityDetails: z
    .array(z.object({ userId: z.string(), activityId: z.number() }))
    .optional(),
});
export type GarminWebhookEvent = z.infer<typeof garminWebhookSchema>;
export function garminEventKey(_p: GarminWebhookEvent) {
  return { providerAccountId: null as string | null, externalId: null as string | null };
}

// Oura
export const ouraWebhookSchema = z.object({
  event_type: z.string(),
  data_type: z.string(),
  user_id: z.string(),
  event_date: z.string(),
});
export type OuraWebhookEvent = z.infer<typeof ouraWebhookSchema>;
export function ouraEventKey(p: OuraWebhookEvent) {
  return {
    providerAccountId: p.user_id,
    externalId: `${p.user_id}:${p.data_type}:${p.event_date}`,
  };
}

// Withings — form-urlencoded body; coerce numerics.
export const withingsWebhookSchema = z.object({
  userid: z.string(),
  appli: z.coerce.number(),
  startdate: z.coerce.number(),
  enddate: z.coerce.number(),
});
export type WithingsWebhookEvent = z.infer<typeof withingsWebhookSchema>;
export function withingsEventKey(p: WithingsWebhookEvent) {
  return { providerAccountId: p.userid, externalId: null as string | null };
}

// Polar — user_id is a string per the current route contract.
export const polarWebhookSchema = z.object({
  event: z.string(),
  user_id: z.string(),
  entity_id: z.string(),
  timestamp: z.string(),
  url: z.string(),
});
export type PolarWebhookEvent = z.infer<typeof polarWebhookSchema>;
export function polarEventKey(p: PolarWebhookEvent) {
  return { providerAccountId: p.user_id, externalId: p.entity_id };
}
