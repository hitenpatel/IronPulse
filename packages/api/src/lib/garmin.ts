import crypto from "crypto";
import { encryptToken, decryptToken } from "./encryption";
import { parseGpx } from "./gpx";
import { captureError } from "./capture-error";
import { logger } from "./logger";

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";
const GARMIN_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/token";
const GARMIN_REVOKE_URL = "https://connectapi.garmin.com/oauth-service/oauth/revoke";
const GARMIN_ACTIVITY_FILE_URL = "https://apis.garmin.com/wellness-api/rest/activityFile";

// ─── Type Mapping ───────────────────────────────────────

const GARMIN_TYPE_MAP: Record<string, string> = {
  running: "run",
  trail_running: "run",
  treadmill_running: "run",
  cycling: "cycle",
  mountain_biking: "cycle",
  indoor_cycling: "cycle",
  swimming: "swim",
  open_water_swimming: "swim",
  lap_swimming: "swim",
  hiking: "hike",
  walking: "walk",
};

export function mapGarminType(garminType: string): string {
  return GARMIN_TYPE_MAP[garminType] ?? "other";
}

// ─── Activity Mapping ───────────────────────────────────

export interface GarminActivity {
  activityId: number;
  activityType: string;
  startTimeInSeconds: number;
  durationInSeconds: number;
  distanceInMeters?: number;
  elevationGainInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  activeKilocalories?: number;
}

export function mapGarminActivity(activity: GarminActivity, userId: string) {
  return {
    userId,
    externalId: `garmin:${activity.activityId}`,
    type: mapGarminType(activity.activityType),
    source: "garmin" as const,
    startedAt: new Date(activity.startTimeInSeconds * 1000),
    durationSeconds: activity.durationInSeconds,
    distanceMeters: activity.distanceInMeters,
    elevationGainM: activity.elevationGainInMeters,
    avgHeartRate: activity.averageHeartRateInBeatsPerMinute,
    maxHeartRate: activity.maxHeartRateInBeatsPerMinute,
    calories: activity.activeKilocalories,
  };
}

// ─── HTTP Client ────────────────────────────────────────

export class GarminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GarminApiError";
  }
}

export async function fetchGarminApi<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${GARMIN_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new GarminApiError(
      response.status,
      `Garmin API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── Activity File Download ─────────────────────────────

export async function getActivityFile(
  accessToken: string,
  activityId: number,
  format: "gpx" | "tcx" = "gpx",
): Promise<string> {
  const url = new URL(GARMIN_ACTIVITY_FILE_URL);
  url.searchParams.set("id", String(activityId));
  url.searchParams.set("fileType", format.toUpperCase());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new GarminApiError(
      response.status,
      `Garmin activity file download failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

// ─── Token Management ───────────────────────────────────

export async function refreshGarminToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Garmin token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function revokeGarminToken(accessToken: string): Promise<void> {
  const response = await fetch(GARMIN_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: accessToken }),
  });

  if (!response.ok) {
    throw new Error(
      `Garmin token revocation failed: ${response.status} ${response.statusText}`,
    );
  }
}

// ─── Token + Import Helpers ─────────────────────────────

export async function ensureGarminFreshToken(connection: any, db: any) {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }

  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET must be set");
  }

  const refreshed = await refreshGarminToken(
    clientId,
    clientSecret,
    decryptToken(connection.refreshToken),
  );

  await db.deviceConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      refreshToken: encryptToken(refreshed.refresh_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });

  return refreshed.access_token;
}

export async function importGarminActivity(
  activityId: number,
  connection: any,
  db: any,
) {
  const accessToken = await ensureGarminFreshToken(connection, db);

  // Dedup check
  const existing = await db.cardioSession.findFirst({
    where: { externalId: `garmin:${activityId}` },
  });
  if (existing) return null;

  const activity = await fetchGarminApi<GarminActivity>(
    `/activities/${activityId}`,
    accessToken,
  );
  const mapped = mapGarminActivity(activity, connection.userId);

  const session = await db.cardioSession.create({
    data: { id: crypto.randomUUID(), ...mapped },
  });

  // Fetch GPX for route points (best-effort)
  try {
    const gpxContent = await getActivityFile(accessToken, activityId, "gpx");
    const gpxData = parseGpx(gpxContent);

    if (gpxData.points.length > 0) {
      await db.routePoint.createMany({
        data: gpxData.points.map((p: any) => ({
          id: crypto.randomUUID(),
          sessionId: session.id,
          latitude: p.lat,
          longitude: p.lng,
          elevationM: p.elevation,
          heartRate: null,
          timestamp: p.timestamp,
        })),
      });
    }
  } catch {
    /* GPX not available for all activities */
  }

  return session;
}

export async function runGarminBackfill(connectionId: string, db: any) {
  const connection = await db.deviceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;

  const accessToken = await ensureGarminFreshToken(connection, db);

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  const activities = await fetchGarminApi<GarminActivity[]>(
    "/activities",
    accessToken,
    {
      uploadStartTimeInSeconds: thirtyDaysAgo,
      uploadEndTimeInSeconds: now,
    },
  );

  for (const activity of activities) {
    try {
      await importGarminActivity(activity.activityId, connection, db);
    } catch (err: any) {
      logger.error({ err, provider: "garmin", activityId: activity.activityId }, "Failed to import Garmin activity");
      await captureError(err, { provider: "garmin", activityId: String(activity.activityId) });
    }
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
