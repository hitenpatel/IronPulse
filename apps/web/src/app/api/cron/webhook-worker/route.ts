import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@zor/db";
import { runWebhookWorkerTick } from "@zor/api/src/lib/webhook-worker";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ownerToken = `${process.pid}-${randomUUID()}`;
  const counts = await runWebhookWorkerTick({ db, ownerToken });
  return NextResponse.json(counts);
}
