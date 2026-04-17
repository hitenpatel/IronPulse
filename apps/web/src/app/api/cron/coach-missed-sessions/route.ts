import { NextResponse } from "next/server";
import { PrismaClient } from "@ironpulse/db";
import { notifyCoachActivity } from "@ironpulse/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let _db: PrismaClient | null = null;
function getDb() {
  if (!_db) _db = new PrismaClient();
  return _db;
}

/**
 * Coach "missed sessions" notifier. For each athlete with an active program
 * assignment, checks if the athlete has missed 2+ consecutive scheduled
 * workout days (based on program.schedule). If so, sends a notification to
 * the coach with a link to the client detail page.
 *
 * Run daily. Auth via CRON_SECRET bearer token.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const assignments = await db.programAssignment.findMany({
    where: { status: "active" },
    select: {
      coachId: true,
      athleteId: true,
      startedAt: true,
      athlete: { select: { name: true } },
      program: { select: { schedule: true, durationWeeks: true } },
    },
  });

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  function getDayOfWeek(d: Date): string {
    const jsDay = d.getDay();
    return DAYS[jsDay === 0 ? 6 : jsDay - 1]!;
  }

  let notified = 0;

  for (const a of assignments) {
    if (!a.startedAt || !a.program) continue;
    const schedule = a.program.schedule as Record<
      string,
      Record<string, { templateId?: string; isRestDay?: boolean } | undefined>
    >;
    const startMs = new Date(a.startedAt).getTime();
    const daysSinceStart = Math.floor((Date.now() - startMs) / (24 * 60 * 60 * 1000));

    // Check the last 2 scheduled training days
    const missedDays: string[] = [];
    for (let offset = 1; offset <= 10; offset++) {
      const checkMs = Date.now() - offset * 24 * 60 * 60 * 1000;
      const checkDate = new Date(checkMs);
      if (checkMs < startMs) break;
      const dayOffset = Math.floor((checkMs - startMs) / (24 * 60 * 60 * 1000));
      const weekNum = Math.floor(dayOffset / 7) + 1;
      if (!a.program || weekNum > a.program.durationWeeks) continue;
      const cell = schedule[String(weekNum)]?.[getDayOfWeek(checkDate)];
      if (!cell || cell.isRestDay || !cell.templateId) continue;

      // Check if the athlete has a completed workout on this day
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const completed = await db.workout.findFirst({
        where: {
          userId: a.athleteId,
          completedAt: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true },
      });
      if (!completed) {
        missedDays.push(checkDate.toISOString().slice(0, 10));
        if (missedDays.length >= 2) break;
      } else {
        // Hit a completed day — reset streak
        break;
      }
      if (daysSinceStart < 2) break;
    }

    if (missedDays.length >= 2) {
      // Check if we've already notified in the last 48h to avoid spam
      const recentlyNotified = await db.notification.findFirst({
        where: {
          userId: a.coachId,
          type: "coach_activity",
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          data: { path: ["kind"], equals: "missed_sessions" },
        },
        select: { id: true },
      });
      if (recentlyNotified) continue;

      await notifyCoachActivity(
        db,
        a.coachId,
        a.athlete.name,
        `missed ${missedDays.length} scheduled session${missedDays.length === 1 ? "" : "s"}`,
        a.athleteId,
      );
      notified++;
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAssignments: assignments.length,
    notified,
  });
}
