import { NextRequest, NextResponse } from "next/server";
import { Prisma, WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";
import { ouraWebhookSchema, ouraEventKey } from "@zor/api/src/lib/webhook-schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const verifyToken = searchParams.get("verification_token");

  if (verifyToken === process.env.OURA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ verification_token: verifyToken });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = ouraWebhookSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!["sleep", "daily_readiness"].includes(parsed.data_type)) {
    return NextResponse.json({ ok: true });
  }

  const { providerAccountId, externalId } = ouraEventKey(parsed);

  const conn = await db.deviceConnection.findFirst({
    where: { provider: "oura", providerAccountId },
    select: { userId: true },
  });

  try {
    await db.webhookEvent.create({
      data: {
        provider: "oura",
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
