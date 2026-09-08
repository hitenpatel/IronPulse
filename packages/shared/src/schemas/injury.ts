import { z } from "zod";

export const injuryTypeEnum = z.enum([
  "strain",
  "sprain",
  "fracture",
  "tendinopathy",
  "soreness",
  "impact",
  "other",
]);
export type InjuryType = z.infer<typeof injuryTypeEnum>;

export const injuryStatusEnum = z.enum(["active", "recovering", "resolved"]);
export type InjuryStatus = z.infer<typeof injuryStatusEnum>;

export const recoveryModalityEnum = z.enum([
  "physical_therapy",
  "rest_day",
  "mobility",
  "massage",
  "ice",
  "heat",
  "other",
]);
export type RecoveryModality = z.infer<typeof recoveryModalityEnum>;

const bodyPartsSchema = z
  .array(z.string().min(1).max(40))
  .min(1)
  .max(20);

export const logInjurySchema = z.object({
  injuredAt: z.date(),
  injuryType: injuryTypeEnum,
  severity: z.number().int().min(1).max(10),
  bodyParts: bodyPartsSchema,
  notes: z.string().max(2000).optional(),
});
export type LogInjuryInput = z.infer<typeof logInjurySchema>;

export const updateInjurySchema = z.object({
  id: z.string().uuid(),
  severity: z.number().int().min(1).max(10).optional(),
  status: injuryStatusEnum.optional(),
  resolvedAt: z.date().nullable().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateInjuryInput = z.infer<typeof updateInjurySchema>;

export const listInjuriesSchema = z.object({
  bodyPart: z.string().min(1).max(40).optional(),
  status: injuryStatusEnum.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  limit: z.number().int().positive().max(100).default(50),
});
export type ListInjuriesInput = z.infer<typeof listInjuriesSchema>;

export const deleteInjurySchema = z.object({ id: z.string().uuid() });
export type DeleteInjuryInput = z.infer<typeof deleteInjurySchema>;

export const getInjuryByIdSchema = z.object({ id: z.string().uuid() });
export type GetInjuryByIdInput = z.infer<typeof getInjuryByIdSchema>;

export const logRecoveryActivitySchema = z.object({
  injuryId: z.string().uuid(),
  performedAt: z.date(),
  modality: recoveryModalityEnum,
  durationMins: z.number().int().positive().max(1440).optional(),
  notes: z.string().max(2000).optional(),
});
export type LogRecoveryActivityInput = z.infer<typeof logRecoveryActivitySchema>;

export const listRecoveryActivitiesSchema = z.object({
  injuryId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(200).default(100),
});
export type ListRecoveryActivitiesInput = z.infer<typeof listRecoveryActivitiesSchema>;

export const createRestrictionSchema = z
  .object({
    injuryId: z.string().uuid(),
    // max(50) matches Exercise.primaryMuscles in packages/shared/src/schemas/exercise.ts:14.
    // A shorter cap would make 41-50 character muscle names permanently unrestrictable.
    muscleGroups: z.array(z.string().min(1).max(50)).min(1).max(20),
    note: z.string().max(200).optional(),
    startsAt: z.date(),
    expiresAt: z.date(),
  })
  .refine((v) => v.expiresAt > v.startsAt, {
    message: "expiresAt must be after startsAt",
    path: ["expiresAt"],
  });
export type CreateRestrictionInput = z.infer<typeof createRestrictionSchema>;

export const listRestrictionsSchema = z.object({
  activeOn: z.date().optional(),
});
export type ListRestrictionsInput = z.infer<typeof listRestrictionsSchema>;

export const deleteRestrictionSchema = z.object({ id: z.string().uuid() });
export type DeleteRestrictionInput = z.infer<typeof deleteRestrictionSchema>;
