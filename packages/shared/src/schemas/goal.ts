import { z } from "zod";

export const goalTypeEnum = z.enum([
  "body_weight",
  "exercise_pr",
  "weekly_workouts",
  "cardio_distance",
]);
export type GoalType = z.infer<typeof goalTypeEnum>;

export const goalStatusEnum = z.enum(["active", "completed", "abandoned"]);
export type GoalStatus = z.infer<typeof goalStatusEnum>;

export const goalUnitEnum = z.enum(["kg", "lb", "count", "km", "mi"]);
export type GoalUnit = z.infer<typeof goalUnitEnum>;

export const createGoalSchema = z
  .object({
    type: goalTypeEnum,
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    targetValue: z.number().positive(),
    startValue: z.number().nonnegative().optional(),
    unit: goalUnitEnum,
    exerciseId: z.string().uuid().optional(),
    targetDate: z.date().optional(),
  })
  .refine(
    (data) => data.type !== "exercise_pr" || !!data.exerciseId,
    { message: "exerciseId required for exercise_pr goals", path: ["exerciseId"] },
  );
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  targetValue: z.number().positive().optional(),
  targetDate: z.date().optional().nullable(),
  status: goalStatusEnum.optional(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const deleteGoalSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteGoalInput = z.infer<typeof deleteGoalSchema>;

export const listGoalsSchema = z.object({
  status: goalStatusEnum.optional(),
});
export type ListGoalsInput = z.infer<typeof listGoalsSchema>;
