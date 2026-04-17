import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import { sendWeeklySummaryForUser } from "@ironpulse/api";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

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
 * Weekly summary cron. Called by systemd timer or external cron service
 * (e.g., Uptime Kuma, Vercel Cron). Iterates opted-in users who haven't
 * received a summary in the past 6 days and sends one.
 *
 * Auth: requires CRON_SECRET header to prevent abuse.
 *
 * Schedule: run once per day at 9am UTC. Users will only receive a summary
 * once every ~7 days thanks to the weeklySummaryLastSentAt gate.
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

  // Find users opted in who haven't been sent a summary in 6+ days (or ever)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);

  const candidates = await db.user.findMany({
    where: {
      weeklySummaryEnabled: true,
      deletionRequestedAt: null,
      OR: [
        { weeklySummaryLastSentAt: null },
        { weeklySummaryLastSentAt: { lte: cutoff } },
      ],
    },
    select: { id: true, email: true },
    take: 1000,
  });

  let sent = 0;
  let skipped = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const u of candidates) {
    try {
      const result = await sendWeeklySummaryForUser(db, u.id, {
        sendEmail: !!resend,
        emailAddress: u.email,
        resendSend: resend
          ? async ({ to, subject, text }) => {
              await resend.emails.send({ from: fromAddr, to, subject, text });
            }
          : undefined,
      });
      if (result.sent) sent++;
      else skipped++;
    } catch (err: any) {
      errors.push({ userId: u.id, error: err?.message ?? "unknown" });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    skipped,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
