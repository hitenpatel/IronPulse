import { z } from "zod";
import { UnitSystem } from "../enums.js";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unitSystem: z.enum([UnitSystem.METRIC, UnitSystem.IMPERIAL]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
