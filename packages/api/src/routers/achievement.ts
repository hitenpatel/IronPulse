import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import type { PrismaClient } from "@ironpulse/db";

const ACHIEVEMENT_TYPES = [
  "first_workout",
  "streak_7",
  "streak_30",
  "pr_count_10",
  "workouts_50",
  "workouts_100",
] as const;

type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

/**
 * Internal helper — checks conditions for each achievement type and creates
 * any that have been earned but not yet recorded. Not exposed as a tRPC procedure.
 */
export async function checkAndUnlock(
  db: PrismaClient,
  userId: string
): Promise<AchievementType[]> {
  // Fetch already-unlocked achievements for this user
  const existing = await db.achievement.findMany({
    where: { userId },
    select: { type: true },
  });
  const unlocked = new Set(existing.map((a) => a.type));

  const toUnlock: AchievementType[] = [];

  // ── first_workout ──────────────────────────────────────
  if (!unlocked.has("first_workout")) {
    const count = await db.workout.count({
      where: { userId, completedAt: { not: null } },
    });
    if (count >= 1) toUnlock.push("first_workout");
  }

  // ── workouts_50 ───────────────────────────────────────
  if (!unlocked.has("workouts_50")) {
    const count = await db.workout.count({
      where: { userId, completedAt: { not: null } },
    });
    if (count >= 50) toUnlock.push("workouts_50");
  }

  // ── workouts_100 ──────────────────────────────────────
  if (!unlocked.has("workouts_100")) {
    const count = await db.workout.count({
      where: { userId, completedAt: { not: null } },
    });
    if (count >= 100) toUnlock.push("workouts_100");
  }

  // ── pr_count_10 ───────────────────────────────────────
  if (!unlocked.has("pr_count_10")) {
    const count = await db.personalRecord.count({ where: { userId } });
    if (count >= 10) toUnlock.push("pr_count_10");
  }

  // ── streak_7 / streak_30 ──────────────────────────────
  const needsStreak7 = !unlocked.has("streak_7");
  const needsStreak30 = !unlocked.has("streak_30");

  if (needsStreak7 || needsStreak30) {
    // Get completed workout dates (distinct calendar days), most recent first
    const rows = await db.workout.findMany({
      where: { userId, completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    });

    // Build an ordered list of unique calendar day strings (YYYY-MM-DD)
    const daySet = new Set<string>();
    for (const row of rows) {
      if (row.completedAt) {
        daySet.add(row.completedAt.toISOString().slice(0, 10));
      }
    }
    const days = Array.from(daySet).sort().reverse(); // most recent first

    // Walk backwards counting consecutive days
    let streak = 0;
    let prev: Date | null = null;
    for (const dayStr of days) {
      const day = new Date(dayStr + "T00:00:00Z");
      if (prev === null) {
        streak = 1;
      } else {
        const diff =
          (prev.getTime() - day.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      prev = day;
    }

    if (needsStreak7 && streak >= 7) toUnlock.push("streak_7");
    if (needsStreak30 && streak >= 30) toUnlock.push("streak_30");
  }

  // ── Persist newly earned achievements ─────────────────
  if (toUnlock.length > 0) {
    await db.achievement.createMany({
      data: toUnlock.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });
  }

  return toUnlock;
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
});
