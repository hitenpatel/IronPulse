// Progress calculation for a user goal. Kept standalone from the router so
// it is unit-testable with a mocked db.

export type GoalProgressInput = {
  userId: string;
  type: string;
  unit: string;
  targetValue: number;
  startValue: number | null;
  exerciseId: string | null;
  createdAt: Date;
};

export type ProgressDb = {
  workout: { count: (args: unknown) => Promise<number> };
  bodyMetric: { findFirst: (args: unknown) => Promise<{ weightKg: unknown } | null> };
  personalRecord: { findFirst: (args: unknown) => Promise<{ value: unknown } | null> };
  cardioSession: { findMany: (args: unknown) => Promise<{ distanceMeters: unknown }[]> };
};

export async function computeGoalProgress(
  db: ProgressDb,
  goal: GoalProgressInput,
): Promise<number> {
  switch (goal.type) {
    case "body_weight": {
      const latest = await db.bodyMetric.findFirst({
        where: { userId: goal.userId, weightKg: { not: null } },
        orderBy: { date: "desc" },
        select: { weightKg: true },
      });
      return latest?.weightKg != null ? Number(latest.weightKg) : 0;
    }
    case "exercise_pr": {
      if (!goal.exerciseId) return 0;
      const pr = await db.personalRecord.findFirst({
        where: {
          userId: goal.userId,
          exerciseId: goal.exerciseId,
          type: "weight",
        },
        orderBy: { value: "desc" },
        select: { value: true },
      });
      return pr?.value != null ? Number(pr.value) : 0;
    }
    case "weekly_workouts": {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      return db.workout.count({
        where: { userId: goal.userId, completedAt: { gte: since } },
      });
    }
    case "cardio_distance": {
      const sessions = await db.cardioSession.findMany({
        where: {
          userId: goal.userId,
          startedAt: { gte: goal.createdAt },
          distanceMeters: { not: null },
        },
        select: { distanceMeters: true },
      });
      const meters = sessions.reduce(
        (sum, s) => sum + (s.distanceMeters ? Number(s.distanceMeters) : 0),
        0,
      );
      if (goal.unit === "mi") return meters / 1609.344;
      return meters / 1000;
    }
    default:
      return 0;
  }
}

export function computeProgressPct(
  currentValue: number,
  targetValue: number,
  startValue: number | null,
): number {
  const start = startValue ?? 0;
  const isDecreasing = start > targetValue;
  let pct: number;
  if (isDecreasing) {
    const total = start - targetValue;
    const done = start - currentValue;
    pct = total > 0 ? (done / total) * 100 : 0;
  } else {
    pct = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  }
  return Math.round(Math.max(0, Math.min(100, pct)));
}
