import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import {
  findInactiveUsers,
  sendRetentionNudge,
  type RetentionUser,
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
 * Day-7 body — warm, low pressure, reminds the user of what they built.
 */
function day7Body(u: RetentionUser): string {
  const name = u.name ? ` ${u.name.split(" ")[0]}` : "";
  const achievements = u.achievementCount
    ? `You've already unlocked ${u.achievementCount} achievement${u.achievementCount === 1 ? "" : "s"} — ${u.achievementCount === 1 ? "it's" : "they're"} still there waiting for you.`
    : "Every session counts — pick up where you left off.";
  return [
    `Hey${name},`,
    "",
    "It's been a week since your last workout.",
    "",
    achievements,
    "",
    "Even a quick 15-minute session can get the momentum back. Open the app when you're ready:",
    "https://ironpulse.app/dashboard",
    "",
    "— IronPulse",
  ].join("\n");
}

/**
 * Day-21 body — more direct. If they're still dormant three weeks in,
 * gentle framing isn't working; reframe around identity + the cost of
 * the subscription continuing to quietly not get used.
 */
function day21Body(u: RetentionUser): string {
  const name = u.name ? ` ${u.name.split(" ")[0]}` : "";
  return [
    `${name.trim() || "Athlete"} — three weeks without a workout.`,
    "",
    "We know life gets in the way. But the hardest rep is always the first one back.",
    "",
    u.currentStreak > 0
      ? `Your previous best streak was ${u.currentStreak} days. Let's rebuild it.`
      : "Pick a day this week. Block 20 minutes. Open the app.",
    "",
    "https://ironpulse.app/dashboard",
    "",
    "— IronPulse",
  ].join("\n");
}

/**
 * Re-engagement cron. Runs daily and nudges users who have been inactive
 * for exactly 7 or 21 days. Notification rows act as the idempotency
 * marker — once you've received a reengagement notification in the last
 * 14 days, you won't get another one in this pass.
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

  const [day7Users, day21Users] = await Promise.all([
    findInactiveUsers(db, 7),
    findInactiveUsers(db, 21),
  ]);

  const results: Array<{ windowDays: number; delivered: number; emailsSent: number }> = [];
  const errors: { userId: string; error: string }[] = [];

  async function ship(user: RetentionUser, windowDays: number) {
    return sendRetentionNudge(db, user, {
      notificationType: "reengagement",
      pushTitle: windowDays === 7 ? "We miss you" : "Your training is waiting",
      pushBody:
        windowDays === 7
          ? "It's been a week — a quick session brings the momentum back."
          : "Three weeks out. Let's get you back on the platform.",
      subject:
        windowDays === 7
          ? "We miss you — your IronPulse progress is still here"
          : "Three weeks. Let's start again.",
      body: windowDays === 7 ? day7Body(user) : day21Body(user),
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
  }

  for (const { users, windowDays } of [
    { users: day7Users, windowDays: 7 },
    { users: day21Users, windowDays: 21 },
  ]) {
    let delivered = 0;
    let emailsSent = 0;
    for (const u of users) {
      try {
        const r = await ship(u, windowDays);
        if (r.delivered) delivered++;
        if (r.emailSent) emailsSent++;
      } catch (err) {
        errors.push({
          userId: u.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    results.push({ windowDays, delivered, emailsSent });
  }

  return NextResponse.json({
    ok: true,
    results,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}
