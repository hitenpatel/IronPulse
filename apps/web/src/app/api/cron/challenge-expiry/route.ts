import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import {
  findExpiringChallengeMembers,
  sendChallengeExpiryReminder,
} from "@ironpulse/api";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

let _db: PrismaClient | null = null;
function getDb() {
  if (!_db) _db = new PrismaClient();
  return _db;
}

let _resend: Resend | null = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Challenge-expiry reminder cron. Fires daily; for each active challenge
 * ending in ~3 days, emails and pushes every opted-in participant once
 * (24 h idempotency window via Notification row).
 *
 * Auth: requires CRON_SECRET header.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const resend = getResend();
  const fromAddr = process.env.EMAIL_FROM ?? "IronPulse <noreply@ironpulse.app>";

  const candidates = await findExpiringChallengeMembers(db);

  let delivered = 0;
  let emailsSent = 0;
  const errors: { userId: string; challengeId: string; error: string }[] = [];

  for (const candidate of candidates) {
    try {
      const result = await sendChallengeExpiryReminder(db, candidate, {
        resendSend: resend
          ? async ({ to, subject, text }) => {
              const response = await resend.emails.send({
                from: fromAddr,
                to,
                subject,
                text,
              });
              if (response?.error) {
                throw new Error(
                  `Resend rejected: ${response.error.name ?? "unknown"} — ${response.error.message ?? ""}`,
                );
              }
            }
          : undefined,
      });
      if (result.delivered) delivered++;
      if (result.emailSent) emailsSent++;
    } catch (err) {
      errors.push({
        userId: candidate.userId,
        challengeId: candidate.challengeId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    delivered,
    emailsSent,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
