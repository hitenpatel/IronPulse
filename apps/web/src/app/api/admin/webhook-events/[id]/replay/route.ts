import { NextResponse } from "next/server";
import { db } from "@zor/db";

type ReplayedRow = {
  id: string;
  provider: string;
  externalId: string;
  status: string;
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  receivedAt: Date;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await db.$queryRaw<ReplayedRow[]>`
    UPDATE webhook_events
       SET status = 'pending',
           attempts = 0,
           next_attempt_at = now(),
           last_error = NULL,
           processing_owner = NULL,
           processing_started_at = NULL,
           completed_at = NULL
     WHERE id = ${id} AND status IN ('dlq', 'skipped_no_connection')
     RETURNING
       id,
       provider,
       external_id AS "externalId",
       status,
       attempts,
       next_attempt_at AS "nextAttemptAt",
       last_error AS "lastError",
       received_at AS "receivedAt"
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Not found or not eligible for replay" },
      { status: 404 },
    );
  }

  return NextResponse.json({ item: rows[0] });
}
