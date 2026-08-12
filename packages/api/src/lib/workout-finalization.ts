/**
 * Durable workout finalization — Slice C
 *
 * registerWorkoutFinalization  — idempotent insert inside a caller's transaction
 * processPendingWorkoutFinalizations — batch worker (claims with SKIP LOCKED)
 */

import type { PrismaClient, Prisma } from "@zor/db";
import { TRPCError } from "@trpc/server";
import { detectPRs } from "./pr-detection";
import { createFeedItem } from "./feed";
import { enqueueNotification } from "./notifications";
import { checkAndUnlock } from "../routers/achievement";

// ── Constants (from plan) ──────────────────────────────────────────────────
export const LOCK_STALE_MS = 5 * 60_000; // 5 minutes
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 15 * 60_000;
const MAX_ERROR_CHARS = 1_000;
const DEFAULT_BATCH_LIMIT = 25;

// ── Types ──────────────────────────────────────────────────────────────────

export interface RegisterInput {
  workoutId: string;
  userId: string;
  completedAt: Date;
  durationSeconds: number;
}

export interface ProcessOptions {
  limit?: number;
  workerId?: string;
}

export interface BatchResult {
  processed: number;
  skipped: number;
  failed: number;
}

// ── Registration ───────────────────────────────────────────────────────────

/**
 * Called inside the caller's transaction. Atomically marks the workout
 * completed (if not already) and upserts a pending WorkoutFinalization row.
 *
 * Invariants:
 *  - First writer wins the completedAt timestamp.
 *  - Cross-user calls are rejected with NOT_FOUND.
 *  - If a completed row already has null durationSeconds, we repair it from
 *    the preserved timestamp before inserting the finalization.
 */
export async function registerWorkoutFinalization(
  tx: Prisma.TransactionClient,
  input: RegisterInput,
) {
  const { workoutId, userId, completedAt, durationSeconds } = input;

  // Conditionally mark the workout completed — first writer wins.
  await tx.$executeRaw`
    UPDATE workouts
    SET completed_at    = ${completedAt},
        duration_seconds = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (${completedAt} - started_at))))::int
    WHERE id             = ${workoutId}::uuid
      AND user_id        = ${userId}::uuid
      AND completed_at  IS NULL
  `;

  // Read back the canonical row (scoped to the owner).
  const workout = await tx.workout.findFirst({
    where: { id: workoutId, userId },
    select: { id: true, startedAt: true, completedAt: true, durationSeconds: true },
  });

  if (!workout || !workout.completedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workout not found or does not belong to user",
    });
  }

  // Repair legacy null-duration rows using the preserved timestamp.
  if (workout.durationSeconds == null) {
    const derived = Math.max(
      0,
      Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000),
    );
    await tx.$executeRaw`
      UPDATE workouts
      SET duration_seconds = ${derived}
      WHERE id = ${workoutId}::uuid
        AND duration_seconds IS NULL
    `;
  }

  const canonicalCompletedAt = workout.completedAt;
  const canonicalDuration =
    workout.durationSeconds ??
    Math.max(
      0,
      Math.floor((workout.completedAt.getTime() - workout.startedAt.getTime()) / 1000),
    );

  // Upsert the finalization record — empty update preserves the first winner.
  return tx.workoutFinalization.upsert({
    where: { workoutId },
    create: {
      workoutId,
      userId,
      completedAt: canonicalCompletedAt,
      durationSeconds: canonicalDuration,
      status: "pending",
      availableAt: new Date(),
    },
    update: {},
  });
}

// ── Claim helper ───────────────────────────────────────────────────────────

interface Claim {
  workoutId: string;
  lockToken: string;
  attempts: number;
}

/**
 * Atomically claim the next eligible finalization using
 * UPDATE ... WHERE ... RETURNING with the SKIP LOCKED predicate embedded in a
 * subquery (Prisma $queryRaw, parameterized).
 *
 * Eligible rows: status IN ('pending','failed') OR (status='processing' AND locked_at < staleBefore)
 */
async function claimNextFinalization(
  db: PrismaClient,
  workerId: string,
  now: Date,
): Promise<Claim | null> {
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);
  const lockToken = crypto.randomUUID();

  const rows = await db.$queryRaw<
    Array<{ workout_id: string; lock_token: string; attempts: number }>
  >`
    UPDATE workout_finalizations
    SET
      status     = 'processing',
      locked_at  = ${now},
      lock_token = ${lockToken}::uuid,
      attempts   = attempts + 1
    WHERE workout_id = (
      SELECT workout_id
      FROM workout_finalizations
      WHERE (
          status IN ('pending', 'failed')
          OR (status = 'processing' AND locked_at < ${staleBefore})
        )
        AND available_at <= ${now}
      ORDER BY available_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING workout_id, lock_token, attempts
  `;

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    workoutId: row.workout_id,
    lockToken: row.lock_token,
    attempts: Number(row.attempts),
  };
}

// ── Effects runner ─────────────────────────────────────────────────────────

async function runFinalizationEffects(
  db: PrismaClient,
  claim: Claim,
  now: Date,
): Promise<void> {
  await db.$transaction(async (tx) => {
    // Re-read workout inside the transaction for consistency.
    const workout = await tx.workout.findFirst({
      where: { id: claim.workoutId },
      select: { id: true, userId: true, completedAt: true },
    });

    if (!workout || !workout.completedAt) {
      throw new Error("Workout not found or missing completedAt during effect run");
    }

    const { userId, completedAt } = workout;

    // Idempotent side effects (Slice B helpers).
    const newPRs = await detectPRs(
      tx as unknown as PrismaClient,
      userId,
      claim.workoutId,
      completedAt,
    );

    await createFeedItem(
      tx as unknown as PrismaClient,
      userId,
      "workout_complete",
      claim.workoutId,
    );

    // PR notifications.
    for (const pr of newPRs) {
      await enqueueNotification(tx, {
        dedupeKey: `pr:${userId}:${pr.setId}:${pr.type}`,
        userId,
        type: "pr",
        title: "New Personal Record!",
        body: `You set a new ${pr.type} PR`,
        linkPath: `/workout/${claim.workoutId}`,
      });
    }

    // Achievement check & notifications.
    await checkAndUnlock(tx as unknown as PrismaClient, userId);

    // Fence: only commit if we still own the lock.
    const updated = await tx.$executeRaw`
      UPDATE workout_finalizations
      SET
        status       = 'completed',
        processed_at = ${now},
        locked_at    = NULL,
        lock_token   = NULL,
        last_error   = NULL,
        result       = ${JSON.stringify({ newPRs })}::jsonb
      WHERE workout_id = ${claim.workoutId}::uuid
        AND status     = 'processing'
        AND lock_token = ${claim.lockToken}::uuid
    `;

    if (updated !== 1) {
      throw new Error(
        `Lock fencing failed for workout ${claim.workoutId}: expected 1 row, got ${updated}`,
      );
    }
  });
}

// ── Single-record processor ────────────────────────────────────────────────

export async function processWorkoutFinalization(
  db: PrismaClient,
  workoutId: string,
  now: Date = new Date(),
): Promise<"completed" | "not_found" | "failed"> {
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);
  const lockToken = crypto.randomUUID();

  // Claim a specific workoutId.
  const rows = await db.$queryRaw<
    Array<{ workout_id: string; lock_token: string; attempts: number }>
  >`
    UPDATE workout_finalizations
    SET
      status     = 'processing',
      locked_at  = ${now},
      lock_token = ${lockToken}::uuid,
      attempts   = attempts + 1
    WHERE workout_id = ${workoutId}::uuid
      AND (
        status IN ('pending', 'failed')
        OR (status = 'processing' AND locked_at < ${staleBefore})
      )
      AND available_at <= ${now}
    RETURNING workout_id, lock_token, attempts
  `;

  if (rows.length === 0) return "not_found";

  const claim: Claim = {
    workoutId,
    lockToken,
    attempts: Number(rows[0].attempts),
  };

  try {
    await runFinalizationEffects(db, claim, now);
    return "completed";
  } catch (err) {
    await releaseWithError(db, claim, err, now);
    return "failed";
  }
}

// ── Error release ──────────────────────────────────────────────────────────

async function releaseWithError(
  db: PrismaClient,
  claim: Claim,
  err: unknown,
  now: Date,
) {
  const retryDelay = Math.min(
    RETRY_MAX_MS,
    RETRY_BASE_MS * 2 ** (claim.attempts - 1),
  );
  const availableAt = new Date(now.getTime() + retryDelay);
  const errorStr = String(err).slice(0, MAX_ERROR_CHARS);

  // Only update if we still own the lock — never erase a completed result.
  await db.$executeRaw`
    UPDATE workout_finalizations
    SET
      status      = 'failed',
      locked_at   = NULL,
      lock_token  = NULL,
      last_error  = ${errorStr},
      available_at = ${availableAt}
    WHERE workout_id  = ${claim.workoutId}::uuid
      AND status      = 'processing'
      AND lock_token  = ${claim.lockToken}::uuid
  `;
}

// ── Batch processor ────────────────────────────────────────────────────────

export async function processPendingWorkoutFinalizations(
  db: PrismaClient,
  options: ProcessOptions = {},
): Promise<BatchResult> {
  const limit = options.limit ?? DEFAULT_BATCH_LIMIT;
  const workerId = options.workerId ?? crypto.randomUUID();
  const now = new Date();

  // Select eligible IDs ordered by availableAt.
  const rows = await db.$queryRaw<Array<{ workout_id: string }>>`
    SELECT workout_id
    FROM workout_finalizations
    WHERE (
        status IN ('pending', 'failed')
        OR (status = 'processing' AND locked_at < ${new Date(now.getTime() - LOCK_STALE_MS)})
      )
      AND available_at <= ${now}
    ORDER BY available_at
    LIMIT ${limit}
  `;

  const ids = rows.map((r) => r.workout_id);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const workoutId of ids) {
    const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);
    const lockToken = crypto.randomUUID();

    const claimed = await db.$queryRaw<
      Array<{ workout_id: string; lock_token: string; attempts: number }>
    >`
      UPDATE workout_finalizations
      SET
        status     = 'processing',
        locked_at  = ${now},
        lock_token = ${lockToken}::uuid,
        attempts   = attempts + 1
      WHERE workout_id = ${workoutId}::uuid
        AND (
          status IN ('pending', 'failed')
          OR (status = 'processing' AND locked_at < ${staleBefore})
        )
        AND available_at <= ${now}
      RETURNING workout_id, lock_token, attempts
    `;

    if (claimed.length === 0) {
      skipped++;
      continue;
    }

    const claim: Claim = {
      workoutId,
      lockToken,
      attempts: Number(claimed[0].attempts),
    };

    try {
      await runFinalizationEffects(db, claim, now);
      processed++;
    } catch (err) {
      await releaseWithError(db, claim, err, now);
      failed++;
    }
  }

  // Suppress unused-variable warning for workerId — it will be used in Slice D logging.
  void workerId;

  return { processed, skipped, failed };
}
