import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import {
  findStreakAtRiskUsers,
  sendRetentionNudge,
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
 * Streak-loss recovery cron. Nudges users whose ≥7-day streak is about to
 * break (no workout in 20+ hours but still inside the 3-day catch-up
 * window). Sends one email + push per user per 24h; idempotency is served
 * by the Notification row itself, so a re-run within the window is a
 * no-op.
 *
 * Schedule daily. Auth via CRON_SECRET.
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

  const users = await findStreakAtRiskUsers(db);

  let delivered = 0;
  let emailsSent = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const u of users) {
    try {
      const result = await sendRetentionNudge(db, u, {
        notificationType: "streak_recovery",
        pushTitle: "Keep your streak alive 🔥",
        pushBody: `${u.currentStreak}-day streak — get today's workout in before midnight.`,
        subject: `Don't lose your ${u.currentStreak}-day streak`,
        body: [
          `Hey${u.name ? ` ${u.name.split(" ")[0]}` : ""},`,
          "",
          `You're ${u.currentStreak} days deep on your training streak — but you haven't checked in yet today.`,
          "",
          "A 10-minute session is enough to keep the flame going. Your future self will thank you.",
          "",
          "Open IronPulse and start your workout: https://ironpulse.app/dashboard",
          "",
          "— IronPulse",
        ].join("\n"),
        linkPath: "/dashboard",
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
        userId: u.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: users.length,
    delivered,
    emailsSent,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
