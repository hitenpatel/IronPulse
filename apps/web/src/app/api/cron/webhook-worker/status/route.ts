import { NextResponse } from "next/server";
import { db } from "@zor/db";
import { getWebhookWorkerStatus } from "@zor/api/src/lib/webhook-worker";
import { timingSafeStringEq } from "@/lib/timing-safe-string-eq";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !timingSafeStringEq(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getWebhookWorkerStatus(db));
}
