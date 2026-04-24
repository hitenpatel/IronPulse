import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { importGarminActivity } from "@ironpulse/api/src/lib/garmin";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

interface GarminWebhookPayload {
  activityDetails?: Array<{
    userId: string;
    activityId: number;
  }>;
}

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

  let body: GarminWebhookPayload;
  try {
    body = JSON.parse(rawBody) as GarminWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const activities = body.activityDetails ?? [];

  for (const activity of activities) {
    // Fire-and-forget background processing
    (async () => {
      try {
        const connection = await db.deviceConnection.findFirst({
          where: {
            provider: "garmin",
            providerAccountId: String(activity.userId),
          },
        });

        if (!connection || !connection.syncEnabled) return;

        await importGarminActivity(activity.activityId, connection, db);

        await db.deviceConnection.update({
          where: { id: connection.id },
          data: { lastSyncedAt: new Date() },
        });
      } catch (err) {
        console.error(
          `Webhook: failed to import Garmin activity ${activity.activityId}:`,
          err,
        );
        await captureError(err, { provider: "garmin", webhook: "activity", activityId: String(activity.activityId) });
      }
    })();
  }

  return NextResponse.json({ ok: true });
}
