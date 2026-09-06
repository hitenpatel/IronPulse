import type { PrismaClient } from "@zor/db";
import { dispatchWebhookEvent } from "./webhook-dispatcher";
import { captureError } from "./capture-error";
import { nextAttemptDelayMs, MAX_ATTEMPTS } from "./webhook-backoff";

const DEFAULT_BATCH = 5;
const DEFAULT_STALENESS_MS = 10 * 60_000;

type ClaimedRow = { id: string; provider: string; external_id: string; payload: unknown; attempts: number };

async function writeCompletionWithRetry(
  db: PrismaClient,
  attemptFn: () => Promise<number>,
  ctx: { provider: string; eventId: string; phase: string },
): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try {
      const n = await attemptFn();
      return Number(n) > 0;
    } catch (err) {
      if (i === 2) {
        await captureError(err, { ...ctx });
        return false;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return false;
}

export async function runWebhookWorkerTick(args: {
  db: PrismaClient;
  ownerToken: string;
  batchSize?: number;
  stalenessMs?: number;
}) {
  const { db, ownerToken } = args;
  const batchSize = args.batchSize ?? DEFAULT_BATCH;
  const stalenessMs = args.stalenessMs ?? DEFAULT_STALENESS_MS;

  // Phase A: reclaim stale claims.
  const staleCutoff = new Date(Date.now() - stalenessMs);
  const reclaimed = await db.$executeRaw`
    UPDATE webhook_events
       SET status = 'pending', processing_owner = NULL, processing_started_at = NULL
     WHERE status = 'processing' AND processing_started_at < ${staleCutoff}
  `;

  // Phase B: claim batch (no attempts increment here).
  const claimed = await db.$transaction(async (tx) => {
    return tx.$queryRaw<ClaimedRow[]>`
      WITH c AS (
        SELECT id FROM webhook_events
         WHERE status = 'pending' AND next_attempt_at <= now()
         ORDER BY received_at ASC, id ASC
         LIMIT ${batchSize}
         FOR UPDATE SKIP LOCKED
      )
      UPDATE webhook_events e
         SET status = 'processing',
             last_attempt_at = now(),
             processing_started_at = now(),
             processing_owner = ${ownerToken}
        FROM c
       WHERE e.id = c.id
       RETURNING e.id, e.provider, e.external_id, e.payload, e.attempts;
    `;
  });

  let succeeded = 0, skipped = 0, failed = 0, dlq = 0;
  await Promise.all(claimed.map(async (row) => {
    try {
      const outcome = await dispatchWebhookEvent({ provider: row.provider as any, payload: row.payload, db });
      const status = outcome.kind === "succeeded" ? "succeeded" : "skipped_no_connection";
      const wrote = await writeCompletionWithRetry(
        db,
        () => db.$executeRaw`
          UPDATE webhook_events
             SET status = ${status}::"WebhookEventStatus",
                 completed_at = now(), last_error = NULL,
                 processing_owner = NULL, processing_started_at = NULL
           WHERE id = ${row.id} AND processing_owner = ${ownerToken}
        `,
        { provider: row.provider, eventId: row.id, phase: `state-write:${status}` },
      );
      if (wrote) {
        if (outcome.kind === "succeeded") succeeded++;
        else skipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        const wrote = await writeCompletionWithRetry(
          db,
          () => db.$executeRaw`
            UPDATE webhook_events
               SET status = 'dlq', attempts = ${nextAttempts}, last_error = ${msg},
                   completed_at = now(),
                   processing_owner = NULL, processing_started_at = NULL
             WHERE id = ${row.id} AND processing_owner = ${ownerToken}
          `,
          { provider: row.provider, eventId: row.id, phase: "state-write:dlq" },
        );
        if (wrote) {
          dlq++;
          await captureError(err, {
            provider: row.provider,
            externalId: row.external_id,
            eventId: row.id,
            attempts: nextAttempts,
          });
        }
      } else {
        const delay = nextAttemptDelayMs(nextAttempts);
        // delay is non-null here because nextAttempts < MAX_ATTEMPTS.
        const next = new Date(Date.now() + (delay ?? 0));
        const wrote = await writeCompletionWithRetry(
          db,
          () => db.$executeRaw`
            UPDATE webhook_events
               SET status = 'pending', attempts = ${nextAttempts},
                   next_attempt_at = ${next}, last_error = ${msg},
                   processing_owner = NULL, processing_started_at = NULL
             WHERE id = ${row.id} AND processing_owner = ${ownerToken}
          `,
          { provider: row.provider, eventId: row.id, phase: "state-write:pending" },
        );
        if (wrote) failed++;
      }
    }
  }));

  return { reclaimed: Number(reclaimed), processed: claimed.length, succeeded, skipped, failed, dlq };
}

export async function getWebhookWorkerStatus(db: PrismaClient) {
  const [dueCount, pendingCount, processingCount, dlqCount, dueOldest, procOldest] = await Promise.all([
    db.webhookEvent.count({ where: { status: "pending", nextAttemptAt: { lte: new Date() } } }),
    db.webhookEvent.count({ where: { status: "pending" } }),
    db.webhookEvent.count({ where: { status: "processing" } }),
    db.webhookEvent.count({ where: { status: "dlq" } }),
    db.webhookEvent.findFirst({ where: { status: "pending", nextAttemptAt: { lte: new Date() } }, orderBy: { receivedAt: "asc" }, select: { receivedAt: true } }),
    db.webhookEvent.findFirst({ where: { status: "processing" }, orderBy: { processingStartedAt: "asc" }, select: { processingStartedAt: true } }),
  ]);
  const now = Date.now();
  return {
    dueCount,
    pendingCount,
    processingCount,
    dlqCount,
    oldestDueAgeSec: dueOldest ? Math.floor((now - dueOldest.receivedAt.getTime()) / 1000) : null,
    oldestProcessingAgeSec: procOldest?.processingStartedAt
      ? Math.floor((now - procOldest.processingStartedAt.getTime()) / 1000)
      : null,
  };
}
