import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { notifyAchievement } from "../lib/notifications";
import type { PrismaClient } from "@ironpulse/db";
import {
  ACHIEVEMENT_CATALOG,
  type AchievementBadge,
} from "@ironpulse/shared";

type AchievementType = string;

/**
 * Internal helper — checks conditions for each achievement type and creates
 * any that have been earned but not yet recorded. Idempotent: calling it
 * repeatedly never re-awards the same badge thanks to the (userId, type)
 * unique index on the Achievement table.
 *
 * Safe to call retroactively: it recomputes from current data, so existing
 * users will "catch up" to any newly-added badge the next time this runs.
 */
export async function checkAndUnlock(
  db: PrismaClient,
  userId: string,
): Promise<AchievementType[]> {
  const existing = await db.achievement.findMany({
    where: { userId },
    select: { type: true },
  });
  const unlocked = new Set(existing.map((a) => a.type));

  // Short-circuit if the user already has everything.
  if (unlocked.size >= ACHIEVEMENT_CATALOG.length) return [];

  const toUnlock: AchievementType[] = [];

  // ── Workouts / streaks ────────────────────────────────
  const workoutCount = await db.workout.count({
    where: { userId, completedAt: { not: null } },
  });

  pushIf(toUnlock, unlocked, "first_workout", workoutCount >= 1);
  pushIf(toUnlock, unlocked, "workouts_10", workoutCount >= 10);
  pushIf(toUnlock, unlocked, "workouts_50", workoutCount >= 50);
  pushIf(toUnlock, unlocked, "workouts_100", workoutCount >= 100);
  pushIf(toUnlock, unlocked, "workouts_250", workoutCount >= 250);
  pushIf(toUnlock, unlocked, "workouts_500", workoutCount >= 500);

  // Daily-streak calculation is only run if at least one streak badge is
  // still locked — it's the most expensive query in this helper.
  const needsStreak7 = !unlocked.has("streak_7");
  const needsStreak30 = !unlocked.has("streak_30");
  const needsStreak90 = !unlocked.has("streak_90");
  if (needsStreak7 || needsStreak30 || needsStreak90) {
    const streak = await computeCurrentStreak(db, userId);
    pushIf(toUnlock, unlocked, "streak_7", streak >= 7);
    pushIf(toUnlock, unlocked, "streak_30", streak >= 30);
    pushIf(toUnlock, unlocked, "streak_90", streak >= 90);
  }

  // ── Strength: PR counts + total volume ────────────────
  if (!unlocked.has("pr_count_10") || !unlocked.has("pr_count_25") || !unlocked.has("pr_count_50")) {
    const prCount = await db.personalRecord.count({ where: { userId } });
    pushIf(toUnlock, unlocked, "pr_count_10", prCount >= 10);
    pushIf(toUnlock, unlocked, "pr_count_25", prCount >= 25);
    pushIf(toUnlock, unlocked, "pr_count_50", prCount >= 50);
  }

  if (!unlocked.has("volume_10k_kg") || !unlocked.has("volume_100k_kg")) {
    const volume = await computeTotalVolumeKg(db, userId);
    pushIf(toUnlock, unlocked, "volume_10k_kg", volume >= 10_000);
    pushIf(toUnlock, unlocked, "volume_100k_kg", volume >= 100_000);
  }

  // ── Cardio totals ──────────────────────────────────────
  if (
    !unlocked.has("first_cardio") ||
    !unlocked.has("cardio_total_10km") ||
    !unlocked.has("cardio_total_100km") ||
    !unlocked.has("cardio_marathon")
  ) {
    const [first, totalMeters, longest] = await Promise.all([
      db.cardioSession.count({ where: { userId } }),
      db.cardioSession.aggregate({
        where: { userId },
        _sum: { distanceMeters: true },
      }),
      db.cardioSession.findFirst({
        where: { userId },
        orderBy: { distanceMeters: "desc" },
        select: { distanceMeters: true },
      }),
    ]);
    const totalKm = Number(totalMeters._sum.distanceMeters ?? 0) / 1000;
    const longestKm = Number(longest?.distanceMeters ?? 0) / 1000;
    pushIf(toUnlock, unlocked, "first_cardio", first >= 1);
    pushIf(toUnlock, unlocked, "cardio_total_10km", totalKm >= 10);
    pushIf(toUnlock, unlocked, "cardio_total_100km", totalKm >= 100);
    pushIf(toUnlock, unlocked, "cardio_marathon", longestKm >= 42.195);
  }

  // ── Social ─────────────────────────────────────────────
  if (!unlocked.has("first_follow")) {
    const follows = await db.follow.count({ where: { followerId: userId } });
    pushIf(toUnlock, unlocked, "first_follow", follows >= 1);
  }
  if (!unlocked.has("first_reaction")) {
    const reactions = await db.feedReaction.count({ where: { userId } });
    pushIf(toUnlock, unlocked, "first_reaction", reactions >= 1);
  }

  // ── Recovery streaks ───────────────────────────────────
  if (!unlocked.has("nutrition_streak_7")) {
    const nutritionStreak = await computeDailyStreak(
      db,
      userId,
      "meal_logs",
    );
    pushIf(toUnlock, unlocked, "nutrition_streak_7", nutritionStreak >= 7);
  }
  if (!unlocked.has("sleep_streak_7")) {
    const sleepStreak = await computeDailyStreak(db, userId, "sleep_logs");
    pushIf(toUnlock, unlocked, "sleep_streak_7", sleepStreak >= 7);
  }

  // ── Goals ──────────────────────────────────────────────
  if (!unlocked.has("first_goal_complete")) {
    const completed = await db.goal.count({
      where: { userId, completedAt: { not: null } },
    });
    pushIf(toUnlock, unlocked, "first_goal_complete", completed >= 1);
  }

  // ── Persist + notify ───────────────────────────────────
  if (toUnlock.length > 0) {
    await db.achievement.createMany({
      data: toUnlock.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });

    // Fire notifications in parallel — a single unlock run can produce
    // several notifications (e.g. a catch-up recomputation for existing
    // users will emit one per newly-qualified badge).
    await Promise.all(
      toUnlock.map((type) => {
        const badge = ACHIEVEMENT_CATALOG.find(
          (b): b is AchievementBadge => b.type === type,
        );
        if (!badge) return Promise.resolve();
        return notifyAchievement(db, userId, badge);
      }),
    );
  }

  return toUnlock;
}

function pushIf(
  arr: AchievementType[],
  unlocked: Set<string>,
  type: AchievementType,
  condition: boolean,
) {
  if (condition && !unlocked.has(type)) arr.push(type);
}

/** Consecutive calendar days of completed workouts up to today. */
async function computeCurrentStreak(
  db: PrismaClient,
  userId: string,
): Promise<number> {
  const rows = await db.workout.findMany({
    where: { userId, completedAt: { not: null } },
    select: { completedAt: true },
    orderBy: { completedAt: "desc" },
  });
  const daySet = new Set<string>();
  for (const row of rows) {
    if (row.completedAt) {
      daySet.add(row.completedAt.toISOString().slice(0, 10));
    }
  }
  const days = Array.from(daySet).sort().reverse();
  let streak = 0;
  let prev: Date | null = null;
  for (const dayStr of days) {
    const day = new Date(`${dayStr}T00:00:00Z`);
    if (prev === null) {
      streak = 1;
    } else {
      const diff = (prev.getTime() - day.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    prev = day;
  }
  return streak;
}

/**
 * Generic "consecutive day rows" streak for tables keyed on a `date` column.
 * Used by nutrition_streak_7 (meal_logs) and sleep_streak_7 (sleep_logs).
 * Raw query — no Prisma model union to simplify typing.
 */
async function computeDailyStreak(
  db: PrismaClient,
  userId: string,
  table: "meal_logs" | "sleep_logs",
): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ date: Date }[]>(
    `SELECT DISTINCT date::date AS date FROM ${table}
     WHERE user_id = $1::uuid
     ORDER BY date DESC
     LIMIT 365`,
    userId,
  );
  let streak = 0;
  let prev: Date | null = null;
  for (const row of rows) {
    const day = new Date(row.date);
    if (prev === null) {
      streak = 1;
    } else {
      const diff = (prev.getTime() - day.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    prev = day;
  }
  return streak;
}

/** Sum of weight × reps across every completed set the user has logged. */
async function computeTotalVolumeKg(
  db: PrismaClient,
  userId: string,
): Promise<number> {
  const result = await db.$queryRawUnsafe<{ total: number | null }[]>(
    `SELECT COALESCE(SUM(es.weight_kg * es.reps), 0)::float AS total
     FROM exercise_sets es
     JOIN workout_exercises we ON we.id = es.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.user_id = $1::uuid
       AND w.completed_at IS NOT NULL
       AND es.completed = true
       AND es.weight_kg IS NOT NULL
       AND es.reps IS NOT NULL`,
    userId,
  );
  return Number(result[0]?.total ?? 0);
}

export const achievementRouter = createTRPCRouter({
  list: rateLimitedProcedure.query(async ({ ctx }) => {
    const achievements = await ctx.db.achievement.findMany({
      where: { userId: ctx.user.id },
      orderBy: { unlockedAt: "asc" },
      select: { id: true, type: true, unlockedAt: true },
    });
    return { achievements };
  }),

  /**
   * Called from the achievements screen on open. Runs a fresh check so
   * existing users pick up any newly-qualified badges retroactively
   * (e.g. the first time they open the screen after #157 ships), then
   * returns the up-to-date list in a single round trip.
   */
  checkMine: rateLimitedProcedure.mutation(async ({ ctx }) => {
    const newlyUnlocked = await checkAndUnlock(ctx.db, ctx.user.id);
    const achievements = await ctx.db.achievement.findMany({
      where: { userId: ctx.user.id },
      orderBy: { unlockedAt: "asc" },
      select: { id: true, type: true, unlockedAt: true },
    });
    return { achievements, newlyUnlocked };
  }),
});
