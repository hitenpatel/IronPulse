import { NextRequest, NextResponse } from "next/server";
import { Prisma, WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";
import { withingsWebhookSchema, withingsEventKey } from "@zor/api/src/lib/webhook-schemas";
import { hashPayload } from "@zor/api/src/lib/webhook-external-id";

// HEAD is used by Withings to verify webhook URL availability
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// GET is used by Withings for webhook subscription verification
export async function GET() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = String(value);
  }

  let parsed;
  try {
    parsed = withingsWebhookSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Only process body measurement notifications (appli 1) and blood
  // pressure (appli 4). Other types (e.g. 44 = sleep) are out of scope today.
  if (parsed.appli !== 1 && parsed.appli !== 4) {
    return NextResponse.json({ ok: true });
  }

  const { providerAccountId } = withingsEventKey(parsed);
  const externalId = hashPayload(parsed);

  const conn = await db.deviceConnection.findFirst({
    where: { provider: "withings", providerAccountId },
    select: { userId: true },
  });

  try {
    await db.webhookEvent.create({
      data: {
        provider: "withings",
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
