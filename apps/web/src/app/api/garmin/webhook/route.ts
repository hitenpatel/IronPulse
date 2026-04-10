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

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GarminWebhookPayload;

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
