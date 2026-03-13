import { z } from "zod";
import { CardioType } from "../enums";

const cardioTypeEnum = z.enum([
  CardioType.RUN,
  CardioType.CYCLE,
  CardioType.SWIM,
  CardioType.HIKE,
  CardioType.WALK,
  CardioType.ROW,
  CardioType.ELLIPTICAL,
  CardioType.OTHER,
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
  notes: z.string().optional(),
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
