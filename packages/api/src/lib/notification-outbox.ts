/**
 * Notification-outbox delivery worker — Slice D
 *
 * deliverPendingNotifications — batch worker that claims pending outbox rows,
 * upserts the in-app Notification record, fires push tokens via the existing
 * sendPushNotification helper, and marks rows `sent` or `failed`.
 *
 * At-least-once semantics: a retry after a partial push failure can duplicate
 * delivery to tokens that already succeeded in the previous attempt. This is
 * intentional and documented here so monitors are not alarmed by duplicates.
 *
 * A row is marked permanently `failed` (status stays `failed`, availableAt is
 * not advanced, attempts >= MAX_ATTEMPTS) only after MAX_ATTEMPTS exhausted
 * attempts on purely transient errors. `deadToken` outcomes from Expo are
 * pruned and treated as terminal for that token; if all tokens are pruned or
 * delivered the row is marked sent regardless of attempt count.
 *
 * Lock fencing: every DB update checks `lock_token = $claimToken` so a
 * superseded worker cannot overwrite a newer claim's outcome.
 */

import type { PrismaClient } from "@zor/db";
import { sendPushNotification } from "./push";

// ── Constants (shared with workout-finalization) ────────────────────────────
export const LOCK_STALE_MS = 5 * 60_000; // 5 minutes
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 15 * 60_000;
const MAX_ERROR_CHARS = 1_000;
const DEFAULT_BATCH_LIMIT = 25;
/**
 * After this many attempts on purely transient errors the row is left in
 * `failed` status with no further availableAt advancement — effectively
 * permanently dead-lettered. Dead-token outcomes from Expo mark the row sent
 * (or partially sent) before this limit is reached.
 */
export const MAX_ATTEMPTS = 10;

// ── Types ───────────────────────────────────────────────────────────────────

export interface DeliverOptions {
  limit?: number;
  workerId?: string;
}

export interface DeliveryBatchResult {
  delivered: number;
  skipped: number;
  failed: number;
}

interface OutboxClaim {
  id: string;
  lockToken: string;
  attempts: number;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  dedupeKey: string;
}

// ── Claim helper ─────────────────────────────────────────────────────────────

async function claimNextOutbox(
  db: PrismaClient,
  workerId: string,
  now: Date,
): Promise<OutboxClaim | null> {
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS);
  const lockToken = crypto.randomUUID();

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      lock_token: string;
      attempts: number;
      user_id: string;
      type: string;
      title: string;
      body: string | null;
      link_path: string | null;
      dedupe_key: string;
    }>
  >`
    UPDATE notification_outbox
    SET
      status     = 'processing',
      locked_at  = ${now},
      lock_token = ${lockToken}::uuid,
      attempts   = attempts + 1
    WHERE id = (
      SELECT id
      FROM notification_outbox
      WHERE (
          status IN ('pending', 'failed')
          OR (status = 'processing' AND locked_at < ${staleBefore})
        )
        AND available_at <= ${now}
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY available_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, lock_token, attempts, user_id, type, title, body, link_path, dedupe_key
  `;

  if (rows.length === 0) return null;
  const row = rows[0]!;
  // suppress unused
  void workerId;
  return {
    id: row.id,
    lockToken: row.lock_token,
    attempts: Number(row.attempts),
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    dedupeKey: row.dedupe_key,
  };
}

// ── Delivery logic ──────────────────────────────────────────────────────────

/**
 * Returns true if the row was marked sent (terminal success),
 * false if it was released as retryable (transient failure).
 */
async function deliverOutboxRow(db: PrismaClient, claim: OutboxClaim, now: Date): Promise<boolean> {
  // 1. Upsert the in-app Notification by dedupeKey (idempotent).
  //    On retry the row already exists — empty update preserves first writer.
  //    db.notification is typed as `any` in the Prisma client for test-mock
  //    compatibility (same pattern as notifications.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).notification.upsert({
    where: { dedupeKey: claim.dedupeKey },
    create: {
      dedupeKey: claim.dedupeKey,
      userId: claim.userId,
      type: claim.type,
      title: claim.title,
      body: claim.body ?? null,
      linkPath: claim.linkPath ?? null,
    },
    update: {},
  });

  // 2. Load push tokens.
  const tokens = await db.pushToken.findMany({
    where: { userId: claim.userId },
    select: { token: true },
  });

  // No registered devices → mark sent (in-app record already exists).
  if (tokens.length === 0) {
    await markSent(db, claim, now);
    return true;
  }

  // 3. Attempt delivery to each token.
  let anyTransient = false;

  for (const { token } of tokens) {
    const result = await sendPushNotification(
      token,
      claim.title,
      claim.body ?? "",
    );

    if (result.deadToken) {
      // Prune permanently invalid token — terminal for this device.
      await db.pushToken.deleteMany({ where: { token } }).catch(() => undefined);
      continue; // treated as terminal for this token
    }

    if (result.delivered) {
      continue; // success
    }

    // delivered: false, deadToken: false → transient or ambiguous.
    // NOTE: at-least-once caveat — this token may have actually received the
    // push before returning an error. A retry will send again.
    anyTransient = true;
  }

  if (anyTransient) {
    // Keep row retryable.
    await releaseWithError(db, claim, new Error("Transient push failure"), now);
    return false;
  } else {
    // All tokens delivered, dead-pruned, or no tokens remain.
    await markSent(db, claim, now);
    return true;
  }
}

// ── Terminal state writers ──────────────────────────────────────────────────

async function markSent(db: PrismaClient, claim: OutboxClaim, now: Date): Promise<void> {
  await db.$executeRaw`
    UPDATE notification_outbox
    SET
      status     = 'sent',
      sent_at    = ${now},
      locked_at  = NULL,
      lock_token = NULL,
      last_error = NULL
    WHERE id         = ${claim.id}::uuid
      AND status     = 'processing'
      AND lock_token = ${claim.lockToken}::uuid
  `;
  // Zero rows → we lost the lock to another worker. Do not overwrite.
}

async function releaseWithError(
  db: PrismaClient,
  claim: OutboxClaim,
  err: unknown,
  now: Date,
): Promise<void> {
  const errorStr = String(err).slice(0, MAX_ERROR_CHARS);

  if (claim.attempts >= MAX_ATTEMPTS) {
    // Permanently dead-letter: leave as failed, do not advance availableAt.
    await db.$executeRaw`
      UPDATE notification_outbox
      SET
        status     = 'failed',
        locked_at  = NULL,
        lock_token = NULL,
        last_error = ${errorStr}
      WHERE id         = ${claim.id}::uuid
        AND status     = 'processing'
        AND lock_token = ${claim.lockToken}::uuid
    `;
    return;
  }

  const retryDelay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (claim.attempts - 1));
  const availableAt = new Date(now.getTime() + retryDelay);

  await db.$executeRaw`
    UPDATE notification_outbox
    SET
      status       = 'failed',
      locked_at    = NULL,
      lock_token   = NULL,
      last_error   = ${errorStr},
      available_at = ${availableAt}
    WHERE id         = ${claim.id}::uuid
      AND status     = 'processing'
      AND lock_token = ${claim.lockToken}::uuid
  `;
}

// ── Batch worker ─────────────────────────────────────────────────────────────

/**
 * Claim and deliver pending outbox rows up to `limit` at a time.
 * Returns `{ delivered, skipped, failed }` counts.
 */
export async function deliverPendingNotifications(
  db: PrismaClient,
  options: DeliverOptions = {},
): Promise<DeliveryBatchResult> {
  const limit = options.limit ?? DEFAULT_BATCH_LIMIT;
  const workerId = options.workerId ?? crypto.randomUUID();
  const now = new Date();

  let delivered = 0;
  const skipped = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const claim = await claimNextOutbox(db, workerId, now);
    if (!claim) break; // queue drained

    try {
      const sent = await deliverOutboxRow(db, claim, now);
      if (sent) {
        delivered++;
      } else {
        // Transient failure — released as retryable, not an exception
        failed++;
      }
    } catch (err) {
      await releaseWithError(db, claim, err, now);
      failed++;
    }
  }

  return { delivered, skipped, failed };
}
