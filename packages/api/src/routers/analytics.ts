import {
  weeklyVolumeSchema,
  personalRecordsSchema,
  bodyWeightTrendSchema,
  activityCalendarSchema,
  trainingLoadSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  calculateCardioLoad,
  calculateStrengthLoad,
  calculateEWMA,
  calculateTrainingStatus,
} from "../lib/training-load";

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

  trainingLoad: protectedProcedure
    .input(trainingLoadSchema)
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const [workoutSets, cardioSessions] = await Promise.all([
        ctx.db.exerciseSet.findMany({
          where: {
            completed: true,
            weightKg: { gt: 0 },
            reps: { gt: 0 },
            workoutExercise: {
              workout: {
                userId: ctx.user.id,
                completedAt: { gte: since },
              },
            },
          },
          select: {
            weightKg: true,
            reps: true,
            workoutExercise: {
              select: {
                workout: { select: { completedAt: true } },
              },
            },
          },
        }),
        ctx.db.cardioSession.findMany({
          where: {
            userId: ctx.user.id,
            startedAt: { gte: since },
          },
          select: {
            startedAt: true,
            durationSeconds: true,
            avgHeartRate: true,
          },
        }),
      ]);

      // Aggregate per day
      const dayMap = new Map<
        string,
        { cardioLoad: number; strengthLoad: number }
      >();

      function getOrCreate(date: string) {
        if (!dayMap.has(date))
          dayMap.set(date, { cardioLoad: 0, strengthLoad: 0 });
        return dayMap.get(date)!;
      }

      for (const set of workoutSets) {
        const date =
          set.workoutExercise.workout.completedAt!
            .toISOString()
            .split("T")[0]!;
        const volume = Number(set.weightKg) * (set.reps ?? 0);
        getOrCreate(date).strengthLoad += volume;
      }

      // Convert raw volume to strength load units
      for (const [, day] of dayMap) {
        day.strengthLoad = calculateStrengthLoad(day.strengthLoad);
      }

      for (const session of cardioSessions) {
        const date = session.startedAt.toISOString().split("T")[0]!;
        getOrCreate(date).cardioLoad += calculateCardioLoad(
          session.durationSeconds,
          session.avgHeartRate,
        );
      }

      const data = Array.from(dayMap.entries())
        .map(([date, loads]) => ({
          date,
          cardioLoad: Math.round(loads.cardioLoad * 10) / 10,
          strengthLoad: Math.round(loads.strengthLoad * 10) / 10,
          totalLoad:
            Math.round((loads.cardioLoad + loads.strengthLoad) * 10) / 10,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { data };
    }),

  fitnessStatus: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const [workoutSets, cardioSessions] = await Promise.all([
      ctx.db.exerciseSet.findMany({
        where: {
          completed: true,
          weightKg: { gt: 0 },
          reps: { gt: 0 },
          workoutExercise: {
            workout: {
              userId: ctx.user.id,
              completedAt: { gte: since },
            },
          },
        },
        select: {
          weightKg: true,
          reps: true,
          workoutExercise: {
            select: {
              workout: { select: { completedAt: true } },
            },
          },
        },
      }),
      ctx.db.cardioSession.findMany({
        where: {
          userId: ctx.user.id,
          startedAt: { gte: since },
        },
        select: {
          startedAt: true,
          durationSeconds: true,
          avgHeartRate: true,
        },
      }),
    ]);

    // Build daily load map
    const dayMap = new Map<string, number>();

    for (const set of workoutSets) {
      const date =
        set.workoutExercise.workout.completedAt!
          .toISOString()
          .split("T")[0]!;
      const volume = Number(set.weightKg) * (set.reps ?? 0);
      dayMap.set(date, (dayMap.get(date) ?? 0) + volume);
    }

    // Convert raw volume to strength load
    for (const [date, vol] of dayMap) {
      dayMap.set(date, calculateStrengthLoad(vol));
    }

    for (const session of cardioSessions) {
      const date = session.startedAt.toISOString().split("T")[0]!;
      const load = calculateCardioLoad(
        session.durationSeconds,
        session.avgHeartRate,
      );
      dayMap.set(date, (dayMap.get(date) ?? 0) + load);
    }

    // Fill all 60 days (including zeros) and sort
    const dailyLoads: { date: string; load: number }[] = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0]!;
      dailyLoads.push({ date, load: dayMap.get(date) ?? 0 });
    }

    const atl = calculateEWMA(dailyLoads, 7);
    const ctl = calculateEWMA(dailyLoads, 42);
    const { tsb, status } = calculateTrainingStatus(atl, ctl);

    // Build history with rolling ATL/CTL for each day
    const history: { date: string; atl: number; ctl: number; tsb: number }[] =
      [];
    let rollingAtl = dailyLoads[0].load;
    let rollingCtl = dailyLoads[0].load;
    const alphaAtl = 2 / (7 + 1);
    const alphaCtl = 2 / (42 + 1);

    for (let i = 0; i < dailyLoads.length; i++) {
      if (i === 0) {
        rollingAtl = dailyLoads[0].load;
        rollingCtl = dailyLoads[0].load;
      } else {
        rollingAtl =
          alphaAtl * dailyLoads[i].load + (1 - alphaAtl) * rollingAtl;
        rollingCtl =
          alphaCtl * dailyLoads[i].load + (1 - alphaCtl) * rollingCtl;
      }
      history.push({
        date: dailyLoads[i].date,
        atl: Math.round(rollingAtl * 10) / 10,
        ctl: Math.round(rollingCtl * 10) / 10,
        tsb: Math.round((rollingCtl - rollingAtl) * 10) / 10,
      });
    }

    return {
      atl: Math.round(atl * 10) / 10,
      ctl: Math.round(ctl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      status,
      history,
    };
  }),
});
