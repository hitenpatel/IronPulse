import { z } from "zod";
import { CardioType } from "../enums";

export const cardioTypeEnum = z.enum([
  CardioType.RUN,
  CardioType.CYCLE,
  CardioType.SWIM,
  CardioType.HIKE,
  CardioType.WALK,
  CardioType.ROW,
  CardioType.ELLIPTICAL,
  CardioType.OTHER,
  CardioType.SKI_ERG,
  CardioType.SLED_PUSH,
  CardioType.SLED_PULL,
  CardioType.SANDBAG_CARRY,
  CardioType.BURPEE_BROAD_JUMP,
  CardioType.WALL_BALL,
]);

export const createCardioSchema = z.object({
  type: cardioTypeEnum,
  startedAt: z.date(),
  durationSeconds: z.number().int().positive(),
  distanceMeters: z.number().nonnegative().optional(),
  elevationGainM: z.number().nonnegative().optional(),
  avgHeartRate: z.number().int().positive().optional(),
  maxHeartRate: z.number().int().positive().optional(),
  calories: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateCardioInput = z.infer<typeof createCardioSchema>;

const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevation: z.number().nullable().optional(),
  timestamp: z.date(),
});

export const completeGpsSessionSchema = z.object({
  type: cardioTypeEnum,
  startedAt: z.date(),
  routePoints: z.array(routePointSchema).min(1).max(50000),
});
export type CompleteGpsSessionInput = z.infer<typeof completeGpsSessionSchema>;

export const importGpxSchema = z.object({
  gpxContent: z.string().max(10_000_000),
  type: cardioTypeEnum.optional(),
});
export type ImportGpxInput = z.infer<typeof importGpxSchema>;

export const previewGpxSchema = z.object({
  gpxContent: z.string().max(10_000_000),
});
export type PreviewGpxInput = z.infer<typeof previewGpxSchema>;

// FIT files are small — 100 KB in raw form rarely, ~135 KB base64-encoded
// at the upper end of real-world activities. 20 MB gives headroom without
// letting someone PAYLOAD the server.
export const previewFitSchema = z.object({
  fileBase64: z.string().max(20_000_000),
});
export type PreviewFitInput = z.infer<typeof previewFitSchema>;

export const importFitSchema = z.object({
  fileBase64: z.string().max(20_000_000),
  notes: z.string().max(2000).optional(),
});
export type ImportFitInput = z.infer<typeof importFitSchema>;

export const listCardioSchema = z.object({
  limit: z.number().int().positive().max(200).default(50),
  cursor: z.string().uuid().optional(),
  type: cardioTypeEnum.optional(),
});
export type ListCardioInput = z.infer<typeof listCardioSchema>;
