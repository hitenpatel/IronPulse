import { stringify } from "csv-stringify/sync";
import { exportFormatSchema } from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

export const exportRouter = createTRPCRouter({
  workouts: rateLimitedProcedure
    .input(exportFormatSchema)
    .mutation(async ({ ctx, input }) => {
      const workouts = await ctx.db.workout.findMany({
        where: { userId: ctx.user.id },
        include: {
          workoutExercises: {
            include: {
              exercise: { select: { name: true } },
              sets: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });

      if (input.format === "json") {
        return { data: JSON.stringify(workouts, null, 2), mimeType: "application/json" };
      }

      // Flatten to CSV rows
      const rows: Record<string, unknown>[] = [];
      for (const w of workouts) {
        for (const we of w.workoutExercises) {
          for (const set of we.sets) {
            rows.push({
              workout_id: w.id,
              workout_name: w.name,
              started_at: w.startedAt?.toISOString() ?? "",
              completed_at: w.completedAt?.toISOString() ?? "",
              exercise: we.exercise.name,
              set_number: set.setNumber,
              weight_kg: set.weightKg?.toString() ?? "",
              reps: set.reps ?? "",
              rpe: set.rpe?.toString() ?? "",
              completed: set.completed,
            });
          }
        }
      }

      const csv = rows.length > 0 ? stringify(rows, { header: true }) : "";
      return { data: csv, mimeType: "text/csv" };
    }),

  cardio: rateLimitedProcedure
    .input(exportFormatSchema)
    .mutation(async ({ ctx, input }) => {
      const sessions = await ctx.db.cardioSession.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
      });

      if (input.format === "json") {
        return { data: JSON.stringify(sessions, null, 2), mimeType: "application/json" };
      }

      const rows = sessions.map((s) => ({
        id: s.id,
        type: s.type,
        started_at: s.startedAt.toISOString(),
        duration_seconds: s.durationSeconds,
        distance_meters: s.distanceMeters?.toString() ?? "",
        avg_heart_rate: s.avgHeartRate ?? "",
        max_heart_rate: s.maxHeartRate ?? "",
        calories: s.calories ?? "",
      }));

      const csv = rows.length > 0 ? stringify(rows, { header: true }) : "";
      return { data: csv, mimeType: "text/csv" };
    }),

  bodyMetrics: rateLimitedProcedure
    .input(exportFormatSchema)
    .mutation(async ({ ctx, input }) => {
      const metrics = await ctx.db.bodyMetric.findMany({
        where: { userId: ctx.user.id },
        orderBy: { date: "desc" },
      });

      if (input.format === "json") {
        return { data: JSON.stringify(metrics, null, 2), mimeType: "application/json" };
      }

      const rows = metrics.map((m) => ({
        id: m.id,
        date: m.date.toISOString().split("T")[0],
        weight_kg: m.weightKg?.toString() ?? "",
        body_fat_pct: m.bodyFatPct?.toString() ?? "",
      }));

      const csv = rows.length > 0 ? stringify(rows, { header: true }) : "";
      return { data: csv, mimeType: "text/csv" };
    }),

  allData: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const [workouts, cardioSessions, bodyMetrics, personalRecords, progressPhotos] = await Promise.all([
      ctx.db.workout.findMany({
        where: { userId: ctx.user.id },
        include: {
          workoutExercises: {
            include: {
              exercise: { select: { name: true } },
              sets: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      }),
      ctx.db.cardioSession.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
      }),
      ctx.db.bodyMetric.findMany({
        where: { userId: ctx.user.id },
        orderBy: { date: "desc" },
      }),
      ctx.db.personalRecord.findMany({
        where: { userId: ctx.user.id },
        include: { exercise: { select: { name: true } } },
      }),
      ctx.db.progressPhoto.findMany({
        where: { userId: ctx.user.id },
        orderBy: { date: "desc" },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      workouts,
      cardioSessions,
      bodyMetrics,
      personalRecords,
      progressPhotos,
    };

    return { data: JSON.stringify(exportData, null, 2), mimeType: "application/json" };
  }),
});
