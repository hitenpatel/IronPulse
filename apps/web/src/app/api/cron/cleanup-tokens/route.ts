import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let _db: PrismaClient | null = null;
function getDb() {
  if (!_db) _db = new PrismaClient();
  return _db;
}

/**
 * Expired token cleanup cron. Deletes magic links, password reset tokens,
 * email change tokens, and passkey challenges whose `expiresAt` is in the
 * past. Run daily (harmless if run more often).
 *
 * Scheduling lives outside the app — see the deployment runbook on BookStack
 * for the production systemd timer / cloud scheduler definition. The endpoint
 * itself is idempotent: running it twice only costs two no-op queries.
 *
 * Auth via CRON_SECRET bearer token.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  // Each table is deleted independently so a failure on one (e.g. a
  // migration mid-flight) doesn't block cleanup of the others.
  const results = await Promise.allSettled([
    db.magicLinkToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.emailChangeToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passkeyChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  const tableNames = [
    "magicLinkToken",
    "emailChangeToken",
    "passwordResetToken",
    "passkeyChallenge",
  ] as const;

  const deleted: Record<string, number> = {};
  const errors: Record<string, string> = {};
  results.forEach((r, i) => {
    const name = tableNames[i]!;
    if (r.status === "fulfilled") {
      deleted[name] = r.value.count;
    } else {
      deleted[name] = 0;
      errors[name] =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
      captureError(r.reason, {
        context: "cron.cleanup-tokens",
        table: name,
      });
    }
  });

  // 207 Multi-Status when at least one table failed — surfaces partial
  // success to monitoring (Uptime Kuma) without hiding the problem.
  const status = Object.keys(errors).length > 0 ? 207 : 200;
  return NextResponse.json(
    { ok: status === 200, deleted, errors },
    { status },
  );
}
