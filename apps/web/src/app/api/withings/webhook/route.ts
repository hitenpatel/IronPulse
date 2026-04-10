import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import {
  ensureWithingsFreshToken,
  fetchWithingsApi,
  importWithingsMeasures,
} from "@ironpulse/api/src/lib/withings";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

/**
 * Withings webhook notification payload.
 * Withings sends POST with application/x-www-form-urlencoded body.
 *
 * - appli 1  = Weight / Body measurements
 * - appli 44 = Sleep
 * - appli 4  = Blood pressure
 */
interface WithingsNotification {
  userid: string;
  appli: number;
  startdate: number;
  enddate: number;
}

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

  const notification: WithingsNotification = {
    userid: formData.get("userid") as string,
    appli: Number(formData.get("appli")),
    startdate: Number(formData.get("startdate")),
    enddate: Number(formData.get("enddate")),
  };

  // Only process body measurement notifications (appli 1 and 4)
  if (notification.appli !== 1 && notification.appli !== 4) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget background processing
  (async () => {
    try {
      const connection = await db.deviceConnection.findFirst({
        where: {
          provider: "withings",
          providerAccountId: notification.userid,
        },
      });

      if (!connection || !connection.syncEnabled) return;

      const accessToken = await ensureWithingsFreshToken(connection, db);

      const response = await fetchWithingsApi<{
        status: number;
        body: {
          measuregrps: Array<{
            grpid: number;
            date: number;
            measures: Array<{ value: number; type: number; unit: number }>;
            category: number;
          }>;
        };
      }>("/measure", accessToken, {
        action: "getmeas",
        meastype: "1,6,8,76,88,77,10,9",
        startdate: notification.startdate,
        enddate: notification.enddate,
      });

      await importWithingsMeasures(
        response.body.measuregrps,
        connection.userId,
        db,
      );

      await db.deviceConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(
        `Webhook: failed to import Withings measures for user ${notification.userid}:`,
        err,
      );
      await captureError(err, { provider: "withings", webhook: "measures", userId: notification.userid });
    }
  })();

  return NextResponse.json({ ok: true });
}
