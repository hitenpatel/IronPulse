import { createNotification } from "./notifications";
import { captureError } from "./capture-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface RetentionUser {
  id: string;
  email: string;
  name: string | null;
  currentStreak: number;
  /** Count of achievements unlocked so far — motivator for re-engagement copy. */
  achievementCount: number;
  /** Date of the user's most recent completed workout (or null if none). */
  lastWorkoutAt: Date | null;
}

/**
 * Daily calendar-day streak for a user based on completed workouts.
 * Walks `completed_at` timestamps backwards and counts consecutive days
 * in the local UTC calendar. Returns 0 when the user has never worked out.
 */
export async function computeCurrentStreak(
  db: Db,
  userId: string,
): Promise<number> {
  const rows: Array<{ completedAt: Date | null }> = await db.workout.findMany({
    where: { userId, completedAt: { not: null } },
    select: { completedAt: true },
    orderBy: { completedAt: "desc" },
    take: 365,
  });
  const days = new Set<string>();
  for (const r of rows) {
    if (r.completedAt) days.add(r.completedAt.toISOString().slice(0, 10));
  }
  const ordered = Array.from(days).sort().reverse();
  let streak = 0;
  let prev: Date | null = null;
  for (const dayStr of ordered) {
    const day = new Date(`${dayStr}T00:00:00Z`);
    if (prev === null) {
      streak = 1;
    } else {
      const diff = (prev.getTime() - day.getTime()) / (24 * 60 * 60 * 1000);
      if (diff === 1) streak++;
      else break;
    }
    prev = day;
  }
  return streak;
}

/**
 * Candidates for the streak-loss recovery email: users with a streak of
 * 7+ days whose last workout was 20+ hours ago (so they're approaching
 * the 24h boundary that would break the streak) and who have NOT been
 * nudged within the last 24h.
 */
export async function findStreakAtRiskUsers(db: Db): Promise<RetentionUser[]> {
  // Broad first-pass: users active enough recently that a 7+ streak is
  // plausible. We recompute the exact streak per candidate below.
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const candidates: Array<{
    id: string;
    email: string;
    name: string | null;
    lastWorkoutAt: Date | null;
  }> = await db.$queryRaw`
    SELECT u.id,
           u.email,
           u.name,
           MAX(w.completed_at) AS "lastWorkoutAt"
    FROM users u
    JOIN workouts w ON w.user_id = u.id
    WHERE u.onboarding_complete = true
      AND u.deletion_requested_at IS NULL
      AND w.completed_at IS NOT NULL
    GROUP BY u.id, u.email, u.name
    HAVING MAX(w.completed_at) < ${twentyHoursAgo}
       AND MAX(w.completed_at) > ${threeDaysAgo}
  `;

  const results: RetentionUser[] = [];
  for (const c of candidates) {
    // Idempotency: skip if we nudged them in the last 24h already.
    const recent = await db.notification.findFirst({
      where: {
        userId: c.id,
        type: "streak_recovery",
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    });
    if (recent) continue;

    const streak = await computeCurrentStreak(db, c.id);
    if (streak < 7) continue;

    const achievementCount = await db.achievement.count({
      where: { userId: c.id },
    });

    results.push({
      id: c.id,
      email: c.email,
      name: c.name,
      currentStreak: streak,
      achievementCount,
      lastWorkoutAt: c.lastWorkoutAt,
    });
  }
  return results;
}

/**
 * Candidates for re-engagement. Users who have finished onboarding, haven't
 * completed a workout or cardio session in the target window, and haven't
 * already received a reengagement nudge within the last 14 days.
 *
 * We send two nudges per dormant period:
 *   - day 7 (first reminder)
 *   - day 21 (stronger reminder, different copy handled by caller)
 */
export async function findInactiveUsers(
  db: Db,
  windowDays: number,
): Promise<RetentionUser[]> {
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now - (windowDays - 1) * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // Users whose most recent activity (workout OR cardio) is within the
  // day-N..day-(N-1) window — gives us a one-day slice per run rather
  // than blasting every dormant user every time the cron ticks.
  const candidates: Array<{
    id: string;
    email: string;
    name: string | null;
    lastActivityAt: Date | null;
  }> = await db.$queryRaw`
    WITH last_activity AS (
      SELECT u.id,
             u.email,
             u.name,
             GREATEST(
               COALESCE(MAX(w.completed_at), 'epoch'::timestamp),
               COALESCE(MAX(c.started_at),   'epoch'::timestamp)
             ) AS last_at
      FROM users u
      LEFT JOIN workouts w       ON w.user_id = u.id AND w.completed_at IS NOT NULL
      LEFT JOIN cardio_sessions c ON c.user_id = u.id
      WHERE u.onboarding_complete = true
        AND u.deletion_requested_at IS NULL
      GROUP BY u.id, u.email, u.name
    )
    SELECT id, email, name, last_at AS "lastActivityAt"
    FROM last_activity
    WHERE last_at >= ${windowStart}
      AND last_at <  ${windowEnd}
  `;

  const results: RetentionUser[] = [];
  for (const c of candidates) {
    const recent = await db.notification.findFirst({
      where: {
        userId: c.id,
        type: "reengagement",
        createdAt: { gte: fourteenDaysAgo },
      },
      select: { id: true },
    });
    if (recent) continue;

    const [achievementCount, streak] = await Promise.all([
      db.achievement.count({ where: { userId: c.id } }),
      computeCurrentStreak(db, c.id),
    ]);

    results.push({
      id: c.id,
      email: c.email,
      name: c.name,
      currentStreak: streak,
      achievementCount,
      lastWorkoutAt: c.lastActivityAt,
    });
  }
  return results;
}

export interface RetentionSendOptions {
  subject: string;
  body: string;
  /** In-app notification title (push title). */
  pushTitle: string;
  /** In-app notification body (push body). */
  pushBody: string;
  linkPath: string;
  notificationType: "streak_recovery" | "reengagement";
  /** Function that actually ships the email; undefined to skip email. */
  resendSend?: (args: { to: string; subject: string; text: string }) => Promise<void>;
}

/**
 * Runs the full retention-nudge pipeline for one user: create the
 * in-app + push notification (which also serves as the idempotency
 * marker for the next cron run) and optionally send an email.
 * Failures on email don't block the notification — we'd rather deliver
 * something than nothing, and the next run will skip the user anyway.
 */
export async function sendRetentionNudge(
  db: Db,
  user: RetentionUser,
  opts: RetentionSendOptions,
): Promise<{ delivered: boolean; emailSent: boolean }> {
  try {
    await createNotification(db, {
      userId: user.id,
      type: opts.notificationType,
      title: opts.pushTitle,
      body: opts.pushBody,
      linkPath: opts.linkPath,
    });
  } catch (err) {
    captureError(err, {
      context: `retention.${opts.notificationType}.notification`,
      userId: user.id,
    });
    return { delivered: false, emailSent: false };
  }

  if (opts.resendSend && user.email) {
    try {
      await opts.resendSend({
        to: user.email,
        subject: opts.subject,
        text: opts.body,
      });
      return { delivered: true, emailSent: true };
    } catch (err) {
      captureError(err, {
        context: `retention.${opts.notificationType}.email`,
        userId: user.id,
      });
    }
  }
  return { delivered: true, emailSent: false };
}
