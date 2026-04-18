import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";

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

  const [magic, emailChange, passwordReset, passkey] = await Promise.all([
    db.magicLinkToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.emailChangeToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passkeyChallenge.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      magicLinkToken: magic.count,
      emailChangeToken: emailChange.count,
      passwordResetToken: passwordReset.count,
      passkeyChallenge: passkey.count,
    },
  });
}
