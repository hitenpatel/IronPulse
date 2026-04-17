// Weekly training summary — computes stats for a user over the last 7 days,
// composes an email body, and persists a Notification row.

import { createNotification } from "./notifications";
import { captureError } from "./capture-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface WeeklySummaryData {
  userId: string;
  userName: string;
  workoutsCompleted: number;
  totalVolumeKg: number;
  cardioSessions: number;
  cardioDistanceKm: number;
  prsHit: number;
  prDetails: { exerciseName: string; type: string; value: number }[];
  currentStreak: number;
  sleepAvgHours: number | null;
}

/**
 * Gather stats for a single user over the last 7 days.
 */
export async function gatherWeeklySummary(
  db: Db,
  userId: string,
): Promise<WeeklySummaryData | null> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  since.setHours(0, 0, 0, 0);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, weeklySummaryEnabled: true },
  });
  if (!user) return null;

  const [workouts, cardio, prs, sleep] = await Promise.all([
    db.workout.findMany({
      where: {
        userId,
        completedAt: { gte: since },
      },
      select: {
        id: true,
        workoutExercises: {
          select: {
            sets: {
              select: { weightKg: true, reps: true, completed: true },
            },
          },
        },
      },
    }),
    db.cardioSession.findMany({
      where: { userId, startedAt: { gte: since } },
      select: { distanceMeters: true },
    }),
    db.personalRecord.findMany({
      where: { userId, achievedAt: { gte: since } },
      orderBy: { achievedAt: "desc" },
      take: 5,
      select: {
        type: true,
        value: true,
        exercise: { select: { name: true } },
      },
    }),
    db.sleepLog.findMany({
      where: { userId, date: { gte: since } },
      select: { durationMins: true },
    }),
  ]);

  let totalVolumeKg = 0;
  for (const w of workouts) {
    for (const we of w.workoutExercises) {
      for (const s of we.sets) {
        if (s.completed && s.weightKg != null && s.reps != null) {
          totalVolumeKg += Number(s.weightKg) * s.reps;
        }
      }
    }
  }

  const cardioDistanceKm = cardio.reduce(
    (sum: number, c: { distanceMeters: unknown }) =>
      sum + (c.distanceMeters ? Number(c.distanceMeters) : 0),
    0,
  ) / 1000;

  // Compute current streak — consecutive days with a completed workout back from today
  const recent = await db.workout.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 100,
    select: { completedAt: true },
  });
  const workoutDays = new Set(
    recent
      .map((r: { completedAt: Date | null }) =>
        r.completedAt ? r.completedAt.toISOString().slice(0, 10) : null,
      )
      .filter(Boolean) as string[],
  );
  let currentStreak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (workoutDays.has(key)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    if (currentStreak > 365) break;
  }

  const sleepMins = sleep.map((s: { durationMins: number | null }) => s.durationMins).filter(
    (m: number | null): m is number => m != null,
  );
  const sleepAvgHours =
    sleepMins.length > 0
      ? sleepMins.reduce((a: number, b: number) => a + b, 0) / sleepMins.length / 60
      : null;

  return {
    userId: user.id,
    userName: user.name,
    workoutsCompleted: workouts.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    cardioSessions: cardio.length,
    cardioDistanceKm: Math.round(cardioDistanceKm * 10) / 10,
    prsHit: prs.length,
    prDetails: prs.map((p: { exercise: { name: string } | null; type: string; value: unknown }) => ({
      exerciseName: p.exercise?.name ?? "Exercise",
      type: p.type,
      value: Number(p.value),
    })),
    currentStreak,
    sleepAvgHours: sleepAvgHours != null ? Math.round(sleepAvgHours * 10) / 10 : null,
  };
}

export function formatWeeklySummaryText(data: WeeklySummaryData): string {
  const lines: string[] = [
    `Hi ${data.userName},`,
    "",
    "Here's your IronPulse weekly summary:",
    "",
    `🏋️  Workouts completed: ${data.workoutsCompleted}`,
    `💪 Total volume lifted: ${data.totalVolumeKg.toLocaleString()} kg`,
  ];
  if (data.cardioSessions > 0) {
    lines.push(
      `🏃 Cardio: ${data.cardioSessions} session${data.cardioSessions === 1 ? "" : "s"}, ${data.cardioDistanceKm} km`,
    );
  }
  if (data.prsHit > 0) {
    lines.push("");
    lines.push(`🏆 Personal records hit: ${data.prsHit}`);
    for (const pr of data.prDetails.slice(0, 3)) {
      lines.push(
        `   • ${pr.exerciseName} — ${pr.type}: ${pr.value}${pr.type === "reps" ? " reps" : " kg"}`,
      );
    }
  }
  if (data.currentStreak > 0) {
    lines.push("");
    lines.push(`🔥 Current streak: ${data.currentStreak} day${data.currentStreak === 1 ? "" : "s"}`);
  }
  if (data.sleepAvgHours != null) {
    lines.push(`😴 Average sleep: ${data.sleepAvgHours} hours/night`);
  }
  lines.push("");
  lines.push("Keep pushing — see you next week.");
  lines.push("");
  lines.push("— The IronPulse team");
  lines.push("");
  lines.push(
    "You can disable weekly summaries in Settings → Notifications.",
  );
  return lines.join("\n");
}

export function formatWeeklySummaryPushBody(data: WeeklySummaryData): string {
  const parts: string[] = [];
  parts.push(`${data.workoutsCompleted} workouts`);
  if (data.prsHit > 0) parts.push(`${data.prsHit} PRs`);
  if (data.currentStreak > 0) parts.push(`${data.currentStreak}-day streak`);
  return parts.join(" · ");
}

/**
 * Send a weekly summary for a single user: writes a Notification row (which
 * also fires a push), optionally sends an email via Resend. Updates
 * weeklySummaryLastSentAt on success.
 */
export async function sendWeeklySummaryForUser(
  db: Db,
  userId: string,
  opts: {
    sendEmail?: boolean;
    emailAddress?: string;
    resendSend?: (args: { to: string; subject: string; text: string }) => Promise<unknown>;
  } = {},
): Promise<{ sent: boolean; skipped?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      weeklySummaryEnabled: true,
    },
  });
  if (!user) return { sent: false, skipped: "no-user" };
  if (!user.weeklySummaryEnabled) return { sent: false, skipped: "opted-out" };

  const data = await gatherWeeklySummary(db, userId);
  if (!data) return { sent: false, skipped: "no-data" };
  if (data.workoutsCompleted === 0 && data.cardioSessions === 0) {
    return { sent: false, skipped: "no-activity" };
  }

  const body = formatWeeklySummaryPushBody(data);

  // In-app + push
  try {
    await createNotification(db, {
      userId,
      type: "workout_complete",
      title: "Your weekly summary is ready 🎉",
      body,
      linkPath: "/stats",
      data: { kind: "weekly_summary", week_ending: new Date().toISOString().slice(0, 10) },
    });
  } catch (err) {
    captureError(err, { context: "weeklySummary.notification", userId });
  }

  // Email via Resend (best-effort)
  if (opts.sendEmail && opts.emailAddress && opts.resendSend) {
    try {
      await opts.resendSend({
        to: opts.emailAddress,
        subject: "Your IronPulse weekly summary",
        text: formatWeeklySummaryText(data),
      });
    } catch (err) {
      captureError(err, { context: "weeklySummary.email", userId });
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { weeklySummaryLastSentAt: new Date() },
  });

  return { sent: true };
}
