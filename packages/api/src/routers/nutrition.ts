import { TRPCError } from "@trpc/server";
import {
  logMealSchema,
  listMealsSchema,
  deleteMealSchema,
  dailySummarySchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const nutritionRouter = createTRPCRouter({
  logMeal: rateLimitedProcedure
    .input(logMealSchema)
    .mutation(async ({ ctx, input }) => {
      const meal = await ctx.db.mealLog.create({
        data: {
          userId: ctx.user.id,
          date: input.date,
          mealType: input.mealType,
          name: input.name,
          ...(input.calories !== undefined && { calories: input.calories }),
          ...(input.proteinG !== undefined && { proteinG: input.proteinG }),
          ...(input.carbsG !== undefined && { carbsG: input.carbsG }),
          ...(input.fatG !== undefined && { fatG: input.fatG }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        select: {
          id: true,
          date: true,
          mealType: true,
          name: true,
          calories: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
          notes: true,
          createdAt: true,
        },
      });

      return { meal };
    }),

  listMeals: rateLimitedProcedure
    .input(listMealsSchema)
    .query(async ({ ctx, input }) => {
      const meals = await ctx.db.mealLog.findMany({
        where: {
          userId: ctx.user.id,
          date: input.date,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          date: true,
          mealType: true,
          name: true,
          calories: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
          notes: true,
          createdAt: true,
        },
      });

      return { meals };
    }),

  deleteMeal: rateLimitedProcedure
    .input(deleteMealSchema)
    .mutation(async ({ ctx, input }) => {
      const meal = await ctx.db.mealLog.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });

      if (!meal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meal not found" });
      }

      await ctx.db.mealLog.delete({ where: { id: input.id } });

      return { success: true };
    }),

  dailySummary: rateLimitedProcedure
    .input(dailySummarySchema)
    .query(async ({ ctx, input }) => {
      const meals = await ctx.db.mealLog.findMany({
        where: {
          userId: ctx.user.id,
          date: input.date,
        },
        select: {
          calories: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
        },
      });

      const summary = meals.reduce(
        (acc, meal) => ({
          totalCalories: acc.totalCalories + (meal.calories ?? 0),
          totalProteinG:
            acc.totalProteinG + (meal.proteinG ? Number(meal.proteinG) : 0),
          totalCarbsG:
            acc.totalCarbsG + (meal.carbsG ? Number(meal.carbsG) : 0),
          totalFatG: acc.totalFatG + (meal.fatG ? Number(meal.fatG) : 0),
          mealCount: acc.mealCount + 1,
        }),
        {
          totalCalories: 0,
          totalProteinG: 0,
          totalCarbsG: 0,
          totalFatG: 0,
          mealCount: 0,
        }
      );

      return { date: input.date, ...summary };
    }),
});
