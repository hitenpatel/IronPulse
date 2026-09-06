import type { PrismaClient } from "@zor/db";
import { importStravaActivity } from "./strava";
import { importGarminActivity } from "./garmin";
import { importOuraSleep, importOuraReadiness } from "./oura";
import { ensureWithingsFreshToken, fetchWithingsApi, importWithingsMeasures } from "./withings";
import { importPolarActivity } from "./polar";
import {
  stravaWebhookSchema,
  garminWebhookSchema,
  ouraWebhookSchema,
  withingsWebhookSchema,
  polarWebhookSchema,
} from "./webhook-schemas";

export type DispatchOutcome = { kind: "succeeded" } | { kind: "skipped_no_connection" };

async function findConn(db: PrismaClient, provider: string, providerAccountId: string) {
  return (db as any).deviceConnection.findFirst({ where: { provider, providerAccountId } });
}

async function markSynced(db: PrismaClient, connId: string) {
  await (db as any).deviceConnection.update({
    where: { id: connId },
    data: { lastSyncedAt: new Date() },
  });
}

export async function dispatchWebhookEvent(args: {
  provider: "strava" | "garmin" | "oura" | "withings" | "polar";
  payload: unknown;
  db: PrismaClient;
}): Promise<DispatchOutcome> {
  const { provider, payload, db } = args;
  switch (provider) {
    case "strava": {
      const p = stravaWebhookSchema.parse(payload);
      const conn = await findConn(db, "strava", String(p.owner_id));
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      await importStravaActivity(p.object_id, conn, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "garmin": {
      const p = garminWebhookSchema.parse(payload);
      const activities = p.activityDetails ?? [];
      if (activities.length === 0) return { kind: "skipped_no_connection" };
      const connCache = new Map<string, any>();
      let dispatched = 0;
      const syncedIds = new Set<string>();
      for (const a of activities) {
        let conn = connCache.get(a.userId);
        if (conn === undefined) {
          conn = await findConn(db, "garmin", a.userId);
          connCache.set(a.userId, conn);
        }
        if (!conn || !conn.syncEnabled) continue;
        await importGarminActivity(a.activityId, conn, db);
        dispatched++;
        syncedIds.add(conn.id);
      }
      if (dispatched === 0) return { kind: "skipped_no_connection" };
      for (const id of syncedIds) await markSynced(db, id);
      return { kind: "succeeded" };
    }
    case "oura": {
      const p = ouraWebhookSchema.parse(payload);
      const conn = await findConn(db, "oura", p.user_id);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      if (p.data_type === "sleep") {
        await importOuraSleep(conn, db, p.event_date, p.event_date);
      } else if (p.data_type === "daily_readiness") {
        await importOuraReadiness(conn, db, p.event_date, p.event_date);
      } else {
        return { kind: "skipped_no_connection" };
      }
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "withings": {
      const p = withingsWebhookSchema.parse(payload);
      const conn = await findConn(db, "withings", p.userid);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      const accessToken = await ensureWithingsFreshToken(conn, db);
      const response = await fetchWithingsApi<{
        status: number;
        body: { measuregrps: Array<any> };
      }>("/measure", accessToken, {
        action: "getmeas",
        meastype: "1,6,8,76,88,77,10,9",
        startdate: p.startdate,
        enddate: p.enddate,
      });
      await importWithingsMeasures(response.body.measuregrps, conn.userId, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
    case "polar": {
      const p = polarWebhookSchema.parse(payload);
      const conn = await findConn(db, "polar", p.user_id);
      if (!conn || !conn.syncEnabled) return { kind: "skipped_no_connection" };
      await importPolarActivity(p.entity_id, conn, db);
      await markSynced(db, conn.id);
      return { kind: "succeeded" };
    }
  }
}
