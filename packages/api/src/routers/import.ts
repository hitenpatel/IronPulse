import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { detectFormat, parseStrongCSV, parseHevyCSV, parseFitNotesCSV, type ImportedSet } from "../lib/import-parser";

export const importRouter = createTRPCRouter({
  importWorkouts: rateLimitedProcedure
    .input(z.object({ csv: z.string().max(5_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const format = detectFormat(input.csv);
      if (format === "unknown") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unrecognized CSV format. Supported formats: Strong, Hevy, FitNotes.",
        });
      }

      const parsers = {
        strong: parseStrongCSV,
        hevy: parseHevyCSV,
        fitnotes: parseFitNotesCSV,
      } as const;

      const sets = parsers[format](input.csv);
      if (sets.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No workout data found in the provided CSV.",
        });
      }

      // Group sets by date (date-only string) + workoutName to identify unique workouts
      const workoutMap = new Map<string, ImportedSet[]>();
      for (const set of sets) {
        const dateKey = set.date.toISOString().split("T")[0]!;
        const key = `${dateKey}::${set.workoutName}`;
        const existing = workoutMap.get(key);
        if (existing) {
          existing.push(set);
        } else {
          workoutMap.set(key, [set]);
        }
      }

      let workoutsImported = 0;
      let setsImported = 0;
      let exercisesCreated = 0;

      // Cache exercise name -> id lookups within this import to avoid redundant queries
      const exerciseCache = new Map<string, string>();

      for (const [, workoutSets] of workoutMap) {
        const first = workoutSets[0]!;
        const startedAt = first.date;

        // Determine completedAt: use the latest set date if multiple dates exist,
        // otherwise assume 1 hour duration as a reasonable default.
        const latestDate = workoutSets.reduce(
          (max, s) => (s.date > max ? s.date : max),
          startedAt
        );
        const completedAt =
          latestDate.getTime() > startedAt.getTime()
            ? latestDate
            : new Date(startedAt.getTime() + 60 * 60 * 1000);

        const durationSeconds = Math.round(
          (completedAt.getTime() - startedAt.getTime()) / 1000
        );

        // Create the workout
        const workout = await ctx.db.workout.create({
          data: {
            userId: ctx.user.id,
            name: first.workoutName,
            startedAt,
            completedAt,
            durationSeconds,
          },
          select: { id: true },
        });

        workoutsImported++;

        // Group sets by exercise name to build workoutExercises
        const exerciseMap = new Map<string, ImportedSet[]>();
        for (const set of workoutSets) {
          const existing = exerciseMap.get(set.exerciseName);
          if (existing) {
            existing.push(set);
          } else {
            exerciseMap.set(set.exerciseName, [set]);
          }
        }

        let exerciseOrder = 0;
        for (const [exerciseName, exerciseSets] of exerciseMap) {
          // Look up or create the exercise
          let exerciseId = exerciseCache.get(exerciseName.toLowerCase());

          if (!exerciseId) {
            const existing = await ctx.db.exercise.findFirst({
              where: { name: { equals: exerciseName, mode: "insensitive" } },
              select: { id: true },
            });

            if (existing) {
              exerciseId = existing.id;
            } else {
              // Create as a custom exercise for this user
              const created = await ctx.db.exercise.create({
                data: {
                  name: exerciseName,
                  category: "Other",
                  primaryMuscles: [],
                  secondaryMuscles: [],
                  isCustom: true,
                  createdById: ctx.user.id,
                },
                select: { id: true },
              });
              exerciseId = created.id;
              exercisesCreated++;
            }

            exerciseCache.set(exerciseName.toLowerCase(), exerciseId);
          }

          // Create the workout exercise entry
          const workoutExercise = await ctx.db.workoutExercise.create({
            data: {
              workoutId: workout.id,
              exerciseId,
              order: exerciseOrder++,
            },
            select: { id: true },
          });

          // Create all sets for this exercise, preserving set numbers
          const sortedSets = [...exerciseSets].sort((a, b) => a.setNumber - b.setNumber);

          for (let i = 0; i < sortedSets.length; i++) {
            const s = sortedSets[i]!;
            await ctx.db.exerciseSet.create({
              data: {
                workoutExerciseId: workoutExercise.id,
                setNumber: i + 1,
                ...(s.weightKg !== null && { weightKg: s.weightKg }),
                ...(s.reps !== null && { reps: s.reps }),
                ...(s.rpe !== null && { rpe: s.rpe }),
                completed: true,
              },
            });
            setsImported++;
          }
        }
      }

      return { workoutsImported, setsImported, exercisesCreated, format };
    }),
});
