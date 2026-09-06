import { NextRequest, NextResponse } from "next/server";
import { Prisma, WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";
import { stravaWebhookSchema, stravaEventKey } from "@zor/api/src/lib/webhook-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  if (
    mode === "subscribe" &&
    verifyToken === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = stravaWebhookSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (parsed.object_type !== "activity" || parsed.aspect_type !== "create") {
    return NextResponse.json({ ok: true });
  }

  const { providerAccountId, externalId } = stravaEventKey(parsed);

  const conn = await db.deviceConnection.findFirst({
    where: { provider: "strava", providerAccountId },
    select: { userId: true },
  });

  try {
    await db.webhookEvent.create({
      data: {
        provider: "strava",
        externalId,
        payload: parsed as unknown as Prisma.InputJsonValue,
        userId: conn?.userId ?? null,
        status: WebhookEventStatus.pending,
        nextAttemptAt: new Date(),
      },
    });
  } catch (err) {
    const p = err as Prisma.PrismaClientKnownRequestError;
    if (
      p?.code === "P2002" &&
      Array.isArray(p.meta?.target) &&
      (p.meta.target as string[]).includes("provider_external_id_unique")
    ) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
