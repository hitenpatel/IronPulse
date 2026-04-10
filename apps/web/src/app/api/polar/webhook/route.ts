import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { importPolarActivity } from "@ironpulse/api/src/lib/polar";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

interface PolarWebhookEvent {
  event: string;
  user_id: string;
  entity_id: string;
  timestamp: string;
  url: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PolarWebhookEvent;

  if (body.event !== "EXERCISE") {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget background processing
  (async () => {
    try {
      const connection = await db.deviceConnection.findFirst({
        where: {
          provider: "polar",
          providerAccountId: String(body.user_id),
        },
      });

      if (!connection || !connection.syncEnabled) return;

      await importPolarActivity(body.entity_id, connection, db);

      await db.deviceConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(
        `Webhook: failed to import Polar exercise ${body.entity_id}:`,
        err,
      );
      await captureError(err, { provider: "polar", webhook: "exercise", exerciseId: body.entity_id });
    }
  })();

  return NextResponse.json({ ok: true });
}
