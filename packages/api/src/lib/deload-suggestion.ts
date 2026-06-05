import {
  detectStagnantVolume,
  type WeeklyExerciseVolume,
} from "@ironpulse/shared";
import { captureError } from "./capture-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const WEEKS_TO_ANALYSE = 8;
const SUPPRESSION_DAYS = 28; // 4 weeks

export function weekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // roll back to Monday
  return d.toISOString().slice(0, 10);
}

export async function buildWeeklyVolumes(
  db: Db,
  userId: string,
  weeksBack = WEEKS_TO_ANALYSE,
): Promise<WeeklyExerciseVolume[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeksBack * 7);
  since.setHours(0, 0, 0, 0);

  const workouts = await db.workout.findMany({
    where: { userId, completedAt: { gte: since, not: null } },
    select: {
      completedAt: true,
      workoutExercises: {
        select: {
          exerciseId: true,
          exercise: { select: { name: true } },
          sets: {
            select: { weightKg: true, reps: true, completed: true },
          },
        },
      },
    },
  });

  const volumes: WeeklyExerciseVolume[] = [];
  for (const workout of workouts) {
    if (!workout.completedAt) continue;
    const week = weekStart(workout.completedAt);
    for (const we of workout.workoutExercises) {
      let vol = 0;
      for (const s of we.sets) {
        if (s.completed && s.weightKg != null && s.reps != null) {
          vol += Number(s.weightKg) * s.reps;
        }
      }
      if (vol > 0) {
        volumes.push({
          weekStart: week,
          exerciseId: we.exerciseId,
          exerciseName: we.exercise.name,
          volumeKg: vol,
        });
      }
    }
  }

  return volumes;
}

export async function checkAndNotifyDeload(
  db: Db,
  userId: string,
): Promise<{ notified: boolean; skipped?: string }> {
  const suppressionCutoff = new Date();
  suppressionCutoff.setDate(suppressionCutoff.getDate() - SUPPRESSION_DAYS);

  const recent = await db.notification.findFirst({
    where: {
      userId,
      type: "deload_suggestion",
      createdAt: { gte: suppressionCutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (recent) {
    return { notified: false, skipped: "suppressed" };
  }

  const weeklyVolumes = await buildWeeklyVolumes(db, userId);
  const result = detectStagnantVolume(weeklyVolumes);

  if (!result.suggested) {
    return { notified: false, skipped: "not-stagnant" };
  }

  try {
    await db.notification.create({
      data: {
        userId,
        type: "deload_suggestion",
        title: "Time for a deload?",
        body: `Your volume on ${result.stagnantLifts.join(", ")} has been flat for 4+ weeks. Consider training at 60% for a week.`,
        linkPath: "/dashboard",
        data: {
          kind: "deload_suggestion",
          stagnantLifts: result.stagnantLifts,
          deloadWeightFactor: result.deloadWeightFactor,
        },
      },
    });
    return { notified: true };
  } catch (err) {
    captureError(err, { context: "checkAndNotifyDeload", userId });
    return { notified: false, skipped: "error" };
  }
}

export async function runDeloadSuggestionJob(
  db: Db,
): Promise<{ processed: number; notified: number }> {
  const since = new Date();
  since.setDate(since.getDate() - WEEKS_TO_ANALYSE * 7);

  const activeUsers = await db.user.findMany({
    where: {
      workouts: {
        some: { completedAt: { gte: since, not: null } },
      },
    },
    select: { id: true },
  });

  let notified = 0;
  for (const user of activeUsers) {
    try {
      const result = await checkAndNotifyDeload(db, user.id);
      if (result.notified) notified++;
    } catch (err) {
      captureError(err, {
        context: "runDeloadSuggestionJob",
        userId: user.id,
      });
    }
  }

  return { processed: activeUsers.length, notified };
}
