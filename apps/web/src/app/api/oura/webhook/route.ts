import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { importOuraSleep, importOuraReadiness } from "@ironpulse/api/src/lib/oura";
import { captureError } from "@ironpulse/api/src/lib/capture-error";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const verifyToken = searchParams.get("verification_token");

  if (verifyToken === process.env.OURA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ verification_token: verifyToken });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

interface OuraWebhookEvent {
  event_type: string;
  data_type: string;
  user_id: string;
  event_date: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as OuraWebhookEvent;

  if (!["sleep", "daily_readiness"].includes(body.data_type)) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget background processing
  (async () => {
    try {
      const connection = await db.deviceConnection.findFirst({
        where: {
          provider: "oura",
          providerAccountId: body.user_id,
        },
      });

      if (!connection || !connection.syncEnabled) return;

      const eventDate = body.event_date;
      // Fetch a window around the event date to catch any late-arriving data
      const startDate = eventDate;
      const endDate = eventDate;

      if (body.data_type === "sleep") {
        await importOuraSleep(connection, db, startDate, endDate);
      } else if (body.data_type === "daily_readiness") {
        await importOuraReadiness(connection, db, startDate, endDate);
      }

      await db.deviceConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(
        `Webhook: failed to import Oura ${body.data_type} for ${body.event_date}:`,
        err,
      );
      await captureError(err, { provider: "oura", webhook: body.data_type, eventDate: body.event_date });
    }
  })();

  return NextResponse.json({ ok: true });
}
