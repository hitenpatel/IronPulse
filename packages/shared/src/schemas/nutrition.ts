import { z } from "zod";

export const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof mealTypeEnum>;

export const logMealSchema = z.object({
  date: z.date(),
  mealType: mealTypeEnum,
  name: z.string().min(1).max(255),
  calories: z.number().int().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});
export type LogMealInput = z.infer<typeof logMealSchema>;

export const listMealsSchema = z.object({
  date: z.date(),
});
export type ListMealsInput = z.infer<typeof listMealsSchema>;

export const deleteMealSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteMealInput = z.infer<typeof deleteMealSchema>;

export const dailySummarySchema = z.object({
  date: z.date(),
});
export type DailySummaryInput = z.infer<typeof dailySummarySchema>;
