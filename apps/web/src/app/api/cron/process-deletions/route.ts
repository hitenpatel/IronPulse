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
 * GDPR pending-deletion processor. Deletes users who requested deletion
 * 7+ days ago and haven't cancelled. Cascades through all related data
 * via the schema's onDelete: Cascade FKs.
 *
 * Run daily. Auth via CRON_SECRET bearer token.
 *
 * This was previously exposed as a tRPC mutation on protectedProcedure,
 * which was a privilege escalation bug — any authenticated user could
 * trigger a mass deletion. Moved here so only the cron runner (with the
 * shared secret) can invoke it.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const usersToDelete = await db.user.findMany({
    where: { deletionRequestedAt: { not: null, lte: cutoff } },
    select: { id: true },
  });

  if (usersToDelete.length === 0) {
    return NextResponse.json({ ok: true, deletedCount: 0 });
  }

  const result = await db.user.deleteMany({
    where: { id: { in: usersToDelete.map((u) => u.id) } },
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}
