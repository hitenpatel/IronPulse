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

  // GDPR Article 20 (data portability) — return everything personally
  // identifiable about the user in a machine-readable format.
  allData: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [
      profile,
      workouts,
      cardioSessions,
      bodyMetrics,
      personalRecords,
      progressPhotos,
      sleepLogs,
      mealLogs,
      goals,
      notifications,
      sentMessages,
      receivedMessages,
      challengeParticipations,
      achievements,
      customExercises,
      workoutTemplates,
      follows,
      deviceConnections,
      coachProfile,
    ] = await Promise.all([
      ctx.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          unitSystem: true,
          tier: true,
          subscriptionStatus: true,
          onboardingComplete: true,
          fitnessGoal: true,
          experienceLevel: true,
          defaultRestSeconds: true,
          weeklySummaryEnabled: true,
          consentedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      ctx.db.workout.findMany({
        where: { userId },
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
        where: { userId },
        orderBy: { startedAt: "desc" },
      }),
      ctx.db.bodyMetric.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      ctx.db.personalRecord.findMany({
        where: { userId },
        include: { exercise: { select: { name: true } } },
      }),
      ctx.db.progressPhoto.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      ctx.db.sleepLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      ctx.db.mealLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
      }),
      ctx.db.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.message.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.challengeParticipant.findMany({
        where: { userId },
        include: { challenge: true },
      }),
      ctx.db.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
      }),
      ctx.db.exercise.findMany({
        where: { createdById: userId },
      }),
      ctx.db.workoutTemplate.findMany({
        where: { userId },
        include: {
          templateExercises: {
            include: {
              templateSets: true,
              exercise: { select: { name: true } },
            },
          },
        },
      }),
      ctx.db.follow.findMany({
        where: { OR: [{ followerId: userId }, { followingId: userId }] },
      }),
      ctx.db.deviceConnection.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          createdAt: true,
          updatedAt: true,
          // Do not export OAuth tokens — not portable data, and a leak risk
        },
      }),
      ctx.db.coachProfile.findUnique({
        where: { userId },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      dataPortabilityNotice:
        "This archive contains all personal data IronPulse stores about you, exported under GDPR Article 20. OAuth tokens for linked devices are intentionally excluded.",
      profile,
      coachProfile,
      workouts,
      cardioSessions,
      bodyMetrics,
      personalRecords,
      progressPhotos,
      sleepLogs,
      mealLogs,
      goals,
      notifications,
      messages: { sent: sentMessages, received: receivedMessages },
      challengeParticipations,
      achievements,
      customExercises,
      workoutTemplates,
      follows,
      deviceConnections,
    };

    return {
      data: JSON.stringify(exportData, null, 2),
      mimeType: "application/json",
    };
  }),
});
