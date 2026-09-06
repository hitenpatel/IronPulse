import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, WebhookEventStatus } from "@zor/db";
import { db } from "@zor/db";
import { garminWebhookSchema } from "@zor/api/src/lib/webhook-schemas";
import { hashPayload } from "@zor/api/src/lib/webhook-external-id";
import { captureError } from "@zor/api/src/lib/capture-error";

/**
 * Constant-time comparison of hex-encoded signatures. Avoids early-exit
 * timing leaks that let an attacker iteratively guess bytes.
 */
function signaturesMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(request: NextRequest) {
  const secret = process.env.GARMIN_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed — an unconfigured secret means we can't authenticate the
    // caller, so we must not process arbitrary inbound payloads.
    await captureError(new Error("GARMIN_WEBHOOK_SECRET missing"), {
      provider: "garmin",
      webhook: "activity",
    });
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const provided = request.headers.get("x-garmin-signature") ?? "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!signaturesMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = garminWebhookSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!parsed.activityDetails || parsed.activityDetails.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const externalId = hashPayload(parsed);

  // A batch may span multiple users; do not attribute the queue row to any
  // one user. The worker's Garmin branch resolves connection per activity at
  // dispatch time.
  try {
    await db.webhookEvent.create({
      data: {
        provider: "garmin",
        externalId,
        payload: parsed as unknown as Prisma.InputJsonValue,
        userId: null,
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
