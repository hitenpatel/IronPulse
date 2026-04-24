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
 * assignment, checks whether the athlete has missed 2+ consecutive scheduled
 * workout days (based on program.schedule). If so, sends a notification to
 * the coach with a link to the client detail page.
 *
 * Performance: the previous implementation called `workout.findFirst` once
 * per day per assignment (N × 10). This pass fetches every completed workout
 * in the last 10 days for every assignee in a single query and indexes them
 * in memory, so the whole cron scales with the number of assignments rather
 * than the product.
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

  // One round-trip: every completed workout in the last 10 days across
  // every unique athlete in the assignment set.
  const athleteIds = Array.from(
    new Set(assignments.map((a) => a.athleteId)),
  );
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  tenDaysAgo.setHours(0, 0, 0, 0);

  const completedRows = athleteIds.length
    ? await db.workout.findMany({
        where: {
          userId: { in: athleteIds },
          completedAt: { gte: tenDaysAgo, not: null },
        },
        select: { userId: true, completedAt: true },
      })
    : [];

  // Index as `${athleteId}:YYYY-MM-DD` → boolean for O(1) lookups below.
  const completedKey = (userId: string, day: Date) =>
    `${userId}:${day.toISOString().slice(0, 10)}`;
  const completedSet = new Set<string>();
  for (const row of completedRows) {
    if (row.completedAt) completedSet.add(completedKey(row.userId, row.completedAt));
  }

  // Same 48-hour de-duplication check for coach notifications, batched.
  const coachIds = Array.from(new Set(assignments.map((a) => a.coachId)));
  const dedupWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentMissedNotifs = coachIds.length
    ? await db.notification.findMany({
        where: {
          userId: { in: coachIds },
          type: "coach_activity",
          createdAt: { gte: dedupWindow },
          data: { path: ["kind"], equals: "missed_sessions" },
        },
        select: { userId: true },
      })
    : [];
  const recentlyNotifiedCoaches = new Set(
    recentMissedNotifs.map((n) => n.userId),
  );

  let notified = 0;

  for (const a of assignments) {
    if (!a.startedAt || !a.program) continue;
    if (recentlyNotifiedCoaches.has(a.coachId)) continue;

    const schedule = a.program.schedule as Record<
      string,
      Record<string, { templateId?: string; isRestDay?: boolean } | undefined>
    >;
    const startMs = new Date(a.startedAt).getTime();
    const daysSinceStart = Math.floor((Date.now() - startMs) / (24 * 60 * 60 * 1000));

    const missedDays: string[] = [];
    for (let offset = 1; offset <= 10; offset++) {
      const checkMs = Date.now() - offset * 24 * 60 * 60 * 1000;
      const checkDate = new Date(checkMs);
      if (checkMs < startMs) break;
      const dayOffset = Math.floor((checkMs - startMs) / (24 * 60 * 60 * 1000));
      const weekNum = Math.floor(dayOffset / 7) + 1;
      if (weekNum > a.program.durationWeeks) continue;
      const cell = schedule[String(weekNum)]?.[getDayOfWeek(checkDate)];
      if (!cell || cell.isRestDay || !cell.templateId) continue;

      const didComplete = completedSet.has(completedKey(a.athleteId, checkDate));
      if (!didComplete) {
        missedDays.push(checkDate.toISOString().slice(0, 10));
        if (missedDays.length >= 2) break;
      } else {
        break;
      }
      if (daysSinceStart < 2) break;
    }

    if (missedDays.length >= 2) {
      await notifyCoachActivity(
        db,
        a.coachId,
        a.athlete.name,
        `missed ${missedDays.length} scheduled session${missedDays.length === 1 ? "" : "s"}`,
        a.athleteId,
      );
      // Treat this coach as notified for the rest of this cron pass so we
      // don't double-notify for two athletes in the same batch.
      recentlyNotifiedCoaches.add(a.coachId);
      notified++;
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAssignments: assignments.length,
    notified,
    cacheHits: completedSet.size,
  });
}
