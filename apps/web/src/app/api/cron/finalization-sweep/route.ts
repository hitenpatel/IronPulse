/**
 * Finalization sweep cron — Slice D
 *
 * Scheduling owner:  NAS systemd timer / Vercel cron (production + staging)
 * Recommended cadence: every 1 minute
 * Secret source:     CRON_SECRET environment variable (same secret as other cron routes)
 * Alert destination: Uptime Kuma — alert on any non-200 response (including 207 partial failure)
 * Staging invocation example:
 *   curl -X GET https://staging.zor.app/api/cron/finalization-sweep \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * What it does:
 *  1. Drains stalled WorkoutFinalization rows (processPendingWorkoutFinalizations)
 *  2. Delivers pending NotificationOutbox rows (deliverPendingNotifications)
 *  Both are bounded to 25 rows per run. Finalizations run first so any outbox
 *  rows they enqueue can be delivered in the same sweep.
 *  Returns 207 if either processor reports failures.
 *
 * Safe to replay — both workers are idempotent (SKIP LOCKED + lock-token fencing).
 * At-least-once push semantics apply: a retry may re-deliver to tokens that
 * already received the notification. See notification-outbox.ts for details.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@zor/db";
import { processPendingWorkoutFinalizations } from "@zor/api/src/lib/workout-finalization";
import { deliverPendingNotifications } from "@zor/api/src/lib/notification-outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_LIMIT = 25;

let _db: PrismaClient | null = null;
function getDb() {
  if (!_db) _db = new PrismaClient();
  return _db;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Step 1: drain stalled finalizations (they may enqueue outbox rows).
  let finalizationResult: { processed: number; skipped: number; failed: number };
  try {
    finalizationResult = await processPendingWorkoutFinalizations(db, { limit: BATCH_LIMIT });
  } catch (err) {
    finalizationResult = { processed: 0, skipped: 0, failed: 1 };
    // Non-fatal — continue to outbox delivery.
    console.error("[finalization-sweep] finalization worker error:", err);
  }

  // Step 2: deliver pending notifications (includes rows just enqueued above).
  let deliveryResult: { delivered: number; skipped: number; failed: number };
  try {
    deliveryResult = await deliverPendingNotifications(db, { limit: BATCH_LIMIT });
  } catch (err) {
    deliveryResult = { delivered: 0, skipped: 0, failed: 1 };
    console.error("[finalization-sweep] notification delivery error:", err);
  }

  const anyFailures =
    finalizationResult.failed > 0 || deliveryResult.failed > 0;
  // 207 Multi-Status when at least one processor reports failures — surfaces
  // partial success to monitoring without hiding the problem.
  const status = anyFailures ? 207 : 200;

  return NextResponse.json(
    {
      ok: !anyFailures,
      finalized: finalizationResult.processed,
      delivered: deliveryResult.delivered,
      failed: finalizationResult.failed + deliveryResult.failed,
      details: {
        finalization: finalizationResult,
        notification: deliveryResult,
      },
    },
    { status },
  );
}
