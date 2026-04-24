import type { PrismaClient, Prisma } from "@ironpulse/db";

interface CompletedSet {
  id: string;
  weightKg: Prisma.Decimal | null;
  reps: number | null;
  workoutExercise: {
    exerciseId: string;
  };
}

interface NewPR {
  exerciseId: string;
  type: "1rm" | "volume";
  value: number;
  setId: string;
}

function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export async function detectPRs(
  db: PrismaClient,
  userId: string,
  workoutId: string,
  achievedAt: Date
): Promise<NewPR[]> {
  // Fetch completed sets with weight > 0. Warm-ups, drop sets, and
  // "to-failure" sets are excluded from PR detection — they'd inflate
  // volume PRs and make ramp work look like strength progress. Legacy
  // rows written before the `type` column existed default to "working".
  const sets = await db.exerciseSet.findMany({
    where: {
      workoutExercise: { workoutId },
      completed: true,
      reps: { gt: 0 },
      weightKg: { gt: 0 },
      type: { notIn: ["warmup", "dropset", "failure"] },
    },
    select: {
      id: true,
      weightKg: true,
      reps: true,
      workoutExercise: { select: { exerciseId: true } },
    },
  });

  // Group by exerciseId
  const byExercise = new Map<string, typeof sets>();
  for (const set of sets) {
    const exId = set.workoutExercise.exerciseId;
    if (!byExercise.has(exId)) byExercise.set(exId, []);
    byExercise.get(exId)!.push(set);
  }

  const newPRs: NewPR[] = [];

  for (const [exerciseId, exerciseSets] of byExercise) {
    // Calculate best 1RM (only sets with reps <= 10)
    let best1RM = { value: 0, setId: "" };
    let bestVolume = { value: 0, setId: "" };

    for (const set of exerciseSets) {
      const weight = Number(set.weightKg);
      const reps = set.reps!;

      // 1RM: only for reps <= 10
      if (reps <= 10) {
        const estimated = epley1RM(weight, reps);
        if (estimated > best1RM.value) {
          best1RM = { value: estimated, setId: set.id };
        }
      }

      // Volume: weight × reps
      const volume = weight * reps;
      if (volume > bestVolume.value) {
        bestVolume = { value: volume, setId: set.id };
      }
    }

    // Compare against existing best for 1RM
    if (best1RM.value > 0) {
      const existing1RM = await db.personalRecord.findFirst({
        where: { userId, exerciseId, type: "1rm" },
        orderBy: { value: "desc" },
      });

      if (!existing1RM || best1RM.value > Number(existing1RM.value)) {
        await db.personalRecord.create({
          data: {
            userId,
            exerciseId,
            type: "1rm",
            value: best1RM.value,
            achievedAt,
            setId: best1RM.setId,
          },
        });
        newPRs.push({
          exerciseId,
          type: "1rm",
          value: best1RM.value,
          setId: best1RM.setId,
        });
      }
    }

    // Compare against existing best for volume
    if (bestVolume.value > 0) {
      const existingVolume = await db.personalRecord.findFirst({
        where: { userId, exerciseId, type: "volume" },
        orderBy: { value: "desc" },
      });

      if (!existingVolume || bestVolume.value > Number(existingVolume.value)) {
        await db.personalRecord.create({
          data: {
            userId,
            exerciseId,
            type: "volume",
            value: bestVolume.value,
            achievedAt,
            setId: bestVolume.setId,
          },
        });
        newPRs.push({
          exerciseId,
          type: "volume",
          value: bestVolume.value,
          setId: bestVolume.setId,
        });
      }
    }
  }

  return newPRs;
}
