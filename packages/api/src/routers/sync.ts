import { TRPCError } from "@trpc/server";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { signPowerSyncToken } from "../lib/powersync-auth";
import {
  syncApplySchema,
  syncUpdateSchema,
  syncDeleteSchema,
} from "@ironpulse/shared/src/schemas/sync";

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
  db: any,
  table: string,
  recordId: string,
  userId: string
): Promise<void> {
  const model = TABLE_TO_MODEL[table]!;

  if (USER_OWNED_TABLES.has(table)) {
    const row = await (db[model] as any).findUnique({ where: { id: recordId } });
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
    const row = await (db[currentModel] as any).findUnique({ where: { id: currentId } });
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
    currentId = row[step.fk];
    currentTable = step.parentTable;
  }

  // Now currentTable is user-owned, currentId is its id
  const parentModel = TABLE_TO_MODEL[currentTable]!;
  const parentRow = await (db[parentModel] as any).findUnique({ where: { id: currentId } });
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
      const model = TABLE_TO_MODEL[table];
      if (!model) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      const mapped = mapColumnsToPrisma(rawRecord as Record<string, unknown>);
      enforceUserIdScope(table, mapped, ctx.user.id);

      const { id, ...data } = mapped;

      await (ctx.db as any)[model].upsert({
        where: { id: id as string },
        create: mapped,
        update: data,
      });

      return { success: true };
    }),

  update: rateLimitedProcedure
    .input(syncUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { table, id, data: rawData } = input;
      const model = TABLE_TO_MODEL[table];
      if (!model) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      await verifyOwnership(ctx.db, table, id, ctx.user.id);

      const mapped = mapColumnsToPrisma(rawData as Record<string, unknown>);
      // Prevent changing user_id via update
      delete mapped.userId;

      await (ctx.db as any)[model].update({
        where: { id },
        data: mapped,
      });

      return { success: true };
    }),

  delete: rateLimitedProcedure
    .input(syncDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { table, id } = input;
      const model = TABLE_TO_MODEL[table];
      if (!model) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown table: ${table}` });
      }

      await verifyOwnership(ctx.db, table, id, ctx.user.id);

      await (ctx.db as any)[model].delete({ where: { id } });

      return { success: true };
    }),
});
