import { NextResponse } from "next/server";
import { WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";

const ELIGIBLE_STATUSES = new Set<string>(Object.values(WebhookEventStatus));
const CURSOR_RE = /^[A-Za-z0-9_-]{20,}$/;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);

  const rawStatus = url.searchParams.get("status") ?? "dlq";
  if (!ELIGIBLE_STATUSES.has(rawStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const rawLimit = url.searchParams.get("limit") ?? "50";
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  const cursor = url.searchParams.get("cursor");
  if (cursor && !CURSOR_RE.test(cursor)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const items = await db.webhookEvent.findMany({
    where: { status: rawStatus as WebhookEventStatus },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return NextResponse.json({
    items: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
