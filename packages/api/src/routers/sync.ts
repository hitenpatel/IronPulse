import { TRPCError } from "@trpc/server";
import type { PrismaClient, Prisma } from "@zor/db";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { signPowerSyncToken } from "../lib/powersync-auth";
import {
  syncApplySchema,
  syncUpdateSchema,
  syncDeleteSchema,
} from "@zor/shared/src/schemas/sync";
import {
  registerWorkoutFinalization,
  processWorkoutFinalization,
} from "../lib/workout-finalization";
import { captureError } from "../lib/capture-error";

// Narrow delegate shape used for dynamic model access in this router. Prisma's
// generated delegate types differ per model (the `where`/`data` shapes vary);
// sync's column-mapper already normalises input, so a structural minimum is safe.
type DynamicModelDelegate = {
  findUnique: (args: {
    where: { id: string };
  }) => Promise<Record<string, unknown> | null>;
  upsert: (args: {
    where: { id: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

function model(db: PrismaClient, name: string): DynamicModelDelegate {
  return (db as unknown as Record<string, DynamicModelDelegate>)[name]!;
}

// ─── Table → Prisma model mapping ──────────────────────

const TABLE_TO_MODEL: Record<string, string> = {
  workouts: "workout",
  workout_exercises: "workoutExercise",
  exercise_sets: "exerciseSet",
  cardio_sessions: "cardioSession",
  laps: "lap",
  workout_templates: "workoutTemplate",
  template_exercises: "templateExercise",
  template_sets: "templateSet",
  body_metrics: "bodyMetric",
  personal_records: "personalRecord",
  exercises: "exercise",
};

// Tables that have a direct user_id column
const USER_OWNED_TABLES = new Set([
  "workouts",
  "cardio_sessions",
  "workout_templates",
  "body_metrics",
  "personal_records",
]);

// Child tables → parent FK field (Prisma name) and parent table (postgres name)
const CHILD_TABLE_PARENTS: Record<string, { fk: string; parentTable: string }> = {
  workout_exercises: { fk: "workoutId", parentTable: "workouts" },
  exercise_sets: { fk: "workoutExerciseId", parentTable: "workout_exercises" },
  laps: { fk: "sessionId", parentTable: "cardio_sessions" },
  template_exercises: { fk: "templateId", parentTable: "workout_templates" },
  template_sets: { fk: "templateExerciseId", parentTable: "template_exercises" },
};

// ─── Snake_case → camelCase column mapping ──────────────

const COLUMN_MAP: Record<string, string> = {
  user_id: "userId",
  started_at: "startedAt",
  completed_at: "completedAt",
  duration_seconds: "durationSeconds",
  template_id: "templateId",
  created_at: "createdAt",
  updated_at: "updatedAt",
  workout_id: "workoutId",
  exercise_id: "exerciseId",
  set_number: "setNumber",
  weight_kg: "weightKg",
  rest_seconds: "restSeconds",
  workout_exercise_id: "workoutExerciseId",
  session_id: "sessionId",
  lap_number: "lapNumber",
  distance_meters: "distanceMeters",
  elevation_gain_m: "elevationGainM",
  avg_heart_rate: "avgHeartRate",
  max_heart_rate: "maxHeartRate",
  route_file_url: "routeFileUrl",
  external_id: "externalId",
  target_reps: "targetReps",
  target_weight_kg: "targetWeightKg",
  template_exercise_id: "templateExerciseId",
  body_fat_pct: "bodyFatPct",
  achieved_at: "achievedAt",
  set_id: "setId",
  primary_muscles: "primaryMuscles",
  secondary_muscles: "secondaryMuscles",
  image_urls: "imageUrls",
  video_urls: "videoUrls",
  is_custom: "isCustom",
  created_by_id: "createdById",
  avatar_url: "avatarUrl",
  unit_system: "unitSystem",
  subscription_status: "subscriptionStatus",
  stripe_customer_id: "stripeCustomerId",
  onboarding_complete: "onboardingComplete",
  password_hash: "passwordHash",
  elevation_m: "elevationM",
  heart_rate: "heartRate",
};

// DateTime fields that need string → Date conversion
const DATETIME_FIELDS = new Set([
  "startedAt",
  "completedAt",
  "createdAt",
  "updatedAt",
  "achievedAt",
  "date",
  "timestamp",
]);

function mapColumnsToPrisma(record: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const prismaKey = COLUMN_MAP[key] ?? key;
    if (DATETIME_FIELDS.has(prismaKey) && typeof value === "string") {
      mapped[prismaKey] = new Date(value);
    } else {
      mapped[prismaKey] = value;
    }
  }
  return mapped;
}

// ─── Ownership verification ─────────────────────────────

async function verifyOwnership(
  db: PrismaClient,
  table: string,
  recordId: string,
  userId: string
): Promise<void> {
  const modelName = TABLE_TO_MODEL[table]!;

  if (USER_OWNED_TABLES.has(table)) {
    const row = await model(db, modelName).findUnique({ where: { id: recordId } });
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
    if (row.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not your record" });
    }
    return;
  }

  if (table === "exercises") {
    const exercise = await db.exercise.findUnique({ where: { id: recordId } });
    if (!exercise) throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
    if (exercise.isCustom && exercise.createdById !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not your exercise" });
    }
    return;
  }

  // Child tables: traverse to the user-owned parent
  const chain = resolveOwnershipChain(table);
  let currentId = recordId;
  let currentTable = table;

  for (const step of chain) {
    const currentModel = TABLE_TO_MODEL[currentTable]!;
    const row = await model(db, currentModel).findUnique({ where: { id: currentId } });
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
    currentId = row[step.fk] as string;
    currentTable = step.parentTable;
  }

  // Now currentTable is user-owned, currentId is its id
  const parentModel = TABLE_TO_MODEL[currentTable]!;
  const parentRow = await model(db, parentModel).findUnique({ where: { id: currentId } });
  if (!parentRow) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });
  if (parentRow.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your record" });
  }
}

function resolveOwnershipChain(table: string): Array<{ fk: string; parentTable: string }> {
  const chain: Array<{ fk: string; parentTable: string }> = [];
  let current = table;
  while (CHILD_TABLE_PARENTS[current]) {
    const step = CHILD_TABLE_PARENTS[current]!;
    chain.push(step);
    current = step.parentTable;
  }
  return chain;
}

// ─── Verify user_id in incoming record ──────────────────

function enforceUserIdScope(
  table: string,
  record: Record<string, unknown>,
  userId: string
): void {
  if (USER_OWNED_TABLES.has(table)) {
    if (record.userId && record.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot write data for another user",
      });
    }
    // Force user_id to the authenticated user
    record.userId = userId;
  }

  if (table === "exercises") {
    if (record.isCustom || record.isCustom === undefined) {
      if (record.createdById && record.createdById !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot write exercise for another user",
        });
      }
    }
  }
}

// ─── Workout completion detection ────────────────────────

/**
 * Returns true when a mapped Prisma record transitions a workout to completed.
 * The predicate is: table === "workouts" AND completedAt is a non-null value.
 */
function isWorkoutCompletion(table: string, mapped: Record<string, unknown>): boolean {
  return table === "workouts" && mapped.completedAt != null;
}

/**
 * After verifying ownership, register finalization inside the caller's tx
 * (or directly via db when called outside a transaction for legacy endpoints).
 * Returns the workoutId when registration was triggered, null otherwise.
 */
async function maybeRegisterFinalization(
  tx: Prisma.TransactionClient,
  table: string,
  id: string,
  mapped: Record<string, unknown>,
  userId: string,
): Promise<string | null> {
  if (!isWorkoutCompletion(table, mapped)) return null;

  const completedAt = mapped.completedAt instanceof Date
    ? mapped.completedAt
    : new Date(mapped.completedAt as string);

  // Read startedAt from within the tx so we get the already-written value.
  const existing = await tx.workout.findFirst({
    where: { id, userId },
    select: { startedAt: true },
  });
  if (!existing) return null;

  const durationSeconds = Math.max(
    0,
    Math.floor((completedAt.getTime() - existing.startedAt.getTime()) / 1000),
  );

  await registerWorkoutFinalization(tx, { workoutId: id, userId, completedAt, durationSeconds });
  return id;
}

// ─── Router ─────────────────────────────────────────────

export const syncRouter = createTRPCRouter({
  getToken: rateLimitedProcedure.query(({ ctx }) => {
    const token = signPowerSyncToken(ctx.user.id);
    return {
      token,
      endpoint: process.env.POWERSYNC_URL ?? "http://localhost:8080",
    };
  }),

  applyChange: rateLimitedProcedure
    .input(syncApplySchema)
    .mutation(async ({ ctx, input }) => {
      const { table, record: rawRecord } = input;
      const modelName = TABLE_TO_MODEL[table];
      if (!modelName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      const mapped = mapColumnsToPrisma(rawRecord as Record<string, unknown>);
      enforceUserIdScope(table, mapped, ctx.user.id);

      const { id, ...data } = mapped;

      // For user-owned tables, if the row already exists it must belong to the
      // caller — prevent cross-user ID hijacks.
      if (USER_OWNED_TABLES.has(table)) {
        const existing = await model(ctx.db, modelName).findUnique({ where: { id: id as string } });
        if (existing && existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your record" });
        }
      }

      let registeredWorkoutId: string | null = null;

      await ctx.db.$transaction(async (tx) => {
        await model(tx as unknown as PrismaClient, modelName).upsert({
          where: { id: id as string },
          create: mapped,
          update: data,
        });

        registeredWorkoutId = await maybeRegisterFinalization(
          tx,
          table,
          id as string,
          mapped,
          ctx.user.id,
        );
      });

      // Attempt immediate processing after commit; sweep owns retries on failure.
      if (registeredWorkoutId) {
        processWorkoutFinalization(ctx.db, registeredWorkoutId).catch((err) =>
          captureError(err, { context: "processWorkoutFinalization (applyChange)", workoutId: registeredWorkoutId }),
        );
      }

      return { success: true };
    }),

  update: rateLimitedProcedure
    .input(syncUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { table, id, data: rawData } = input;
      const modelName = TABLE_TO_MODEL[table];
      if (!modelName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      await verifyOwnership(ctx.db, table, id, ctx.user.id);

      const mapped = mapColumnsToPrisma(rawData as Record<string, unknown>);
      // Prevent changing user_id via update
      delete mapped.userId;

      let registeredWorkoutId: string | null = null;

      await ctx.db.$transaction(async (tx) => {
        await model(tx as unknown as PrismaClient, modelName).update({
          where: { id },
          data: mapped,
        });

        registeredWorkoutId = await maybeRegisterFinalization(
          tx,
          table,
          id,
          mapped,
          ctx.user.id,
        );
      });

      // Attempt immediate processing after commit; sweep owns retries on failure.
      if (registeredWorkoutId) {
        processWorkoutFinalization(ctx.db, registeredWorkoutId).catch((err) =>
          captureError(err, { context: "processWorkoutFinalization (update)", workoutId: registeredWorkoutId }),
        );
      }

      return { success: true };
    }),

  delete: rateLimitedProcedure
    .input(syncDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { table, id } = input;
      const modelName = TABLE_TO_MODEL[table];
      if (!modelName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      await verifyOwnership(ctx.db, table, id, ctx.user.id);

      await model(ctx.db, modelName).delete({ where: { id } });

      return { success: true };
    }),
});
