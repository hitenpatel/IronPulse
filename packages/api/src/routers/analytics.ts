import {
  weeklyVolumeSchema,
  personalRecordsSchema,
  bodyWeightTrendSchema,
  activityCalendarSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  weeklyVolume: protectedProcedure
    .input(weeklyVolumeSchema)
    .query(async ({ ctx, input }) => {
      const weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - input.weeks * 7);

      // Get completed sets from completed workouts in the time range
      const sets = await ctx.db.exerciseSet.findMany({
        where: {
          completed: true,
          weightKg: { gt: 0 },
          reps: { gt: 0 },
          workoutExercise: {
            workout: {
              userId: ctx.user.id,
              completedAt: { gte: weeksAgo },
            },
          },
        },
        select: {
          weightKg: true,
          reps: true,
          workoutExercise: {
            select: {
              exercise: {
                select: { primaryMuscles: true },
              },
              workout: {
                select: { completedAt: true },
              },
            },
          },
        },
      });

      // Get the Monday (ISO week start) for a date
      function getWeekStart(date: Date): string {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        return d.toISOString().split("T")[0]!;
      }

      // Aggregate volume by week + muscle group
      const volumeMap = new Map<string, number>();

      for (const set of sets) {
        const volume = Number(set.weightKg) * (set.reps ?? 0);
        const week = getWeekStart(set.workoutExercise.workout.completedAt!);
        for (const muscle of set.workoutExercise.exercise.primaryMuscles) {
          const key = `${week}|${muscle}`;
          volumeMap.set(key, (volumeMap.get(key) ?? 0) + volume);
        }
      }

      const data = Array.from(volumeMap.entries()).map(([key, totalVolume]) => {
        const [week, muscleGroup] = key.split("|");
        return { week: week!, muscleGroup: muscleGroup!, totalVolume };
      });

      // Sort by week descending, then muscle group
      data.sort((a, b) => b.week.localeCompare(a.week) || a.muscleGroup.localeCompare(b.muscleGroup));

      return { data };
    }),

  personalRecords: protectedProcedure
    .input(personalRecordsSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.personalRecord.findMany({
        where: {
          userId: ctx.user.id,
          exerciseId: input.exerciseId,
        },
        orderBy: { achievedAt: "asc" },
        select: {
          id: true,
          type: true,
          value: true,
          achievedAt: true,
          setId: true,
        },
      });

      return { data };
    }),

  bodyWeightTrend: protectedProcedure
    .input(bodyWeightTrendSchema)
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const data = await ctx.db.bodyMetric.findMany({
        where: {
          userId: ctx.user.id,
          date: { gte: since },
          weightKg: { not: null },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          weightKg: true,
        },
      });

      return { data };
    }),

  activityCalendar: protectedProcedure
    .input(activityCalendarSchema)
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 0, 23, 59, 59);

      const [workouts, cardioSessions] = await Promise.all([
        ctx.db.workout.findMany({
          where: {
            userId: ctx.user.id,
            startedAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            name: true,
            startedAt: true,
            durationSeconds: true,
          },
        }),
        ctx.db.cardioSession.findMany({
          where: {
            userId: ctx.user.id,
            startedAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            type: true,
            startedAt: true,
            durationSeconds: true,
          },
        }),
      ]);

      const days: Record<
        string,
        { workouts: typeof workouts; cardio: typeof cardioSessions }
      > = {};

      for (const w of workouts) {
        const key = w.startedAt.toISOString().split("T")[0]!;
        if (!days[key]) days[key] = { workouts: [], cardio: [] };
        days[key].workouts.push(w);
      }

      for (const c of cardioSessions) {
        const key = c.startedAt.toISOString().split("T")[0]!;
        if (!days[key]) days[key] = { workouts: [], cardio: [] };
        days[key].cardio.push(c);
      }

      return { days };
    }),
});
