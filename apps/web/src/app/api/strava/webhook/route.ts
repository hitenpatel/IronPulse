import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { importStravaActivity } from "@ironpulse/api/src/lib/strava";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

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

interface StravaWebhookEvent {
  object_type: string;
  aspect_type: string;
  object_id: number;
  owner_id: number;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as StravaWebhookEvent;

  if (body.object_type !== "activity" || body.aspect_type !== "create") {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget background processing
  (async () => {
    try {
      const connection = await db.deviceConnection.findFirst({
        where: {
          provider: "strava",
          providerAccountId: String(body.owner_id),
        },
      });

      if (!connection || !connection.syncEnabled) return;

      await importStravaActivity(body.object_id, connection, db);

      await db.deviceConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(
        `Webhook: failed to import Strava activity ${body.object_id}:`,
        err,
      );
      await captureError(err, { provider: "strava", webhook: "activity", activityId: String(body.object_id) });
    }
  })();

  return NextResponse.json({ ok: true });
}
