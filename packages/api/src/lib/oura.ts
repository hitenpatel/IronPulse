import crypto from "crypto";
import { encryptToken, decryptToken } from "./encryption";
import { captureError } from "./capture-error";

const OURA_API_BASE = "https://api.ouraring.com/v2";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";

// ─── Interfaces ────────────────────────────────────────

export interface OuraSleepDocument {
  id: string;
  day: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number;
  time_in_bed: number;
  deep_sleep_duration: number;
  light_sleep_duration: number;
  rem_sleep_duration: number;
  awake_time: number;
  average_heart_rate: number;
  lowest_heart_rate: number;
  readiness_score_delta: number | null;
}

export interface OuraReadiness {
  id: string;
  day: string;
  score: number;
  temperature_deviation: number | null;
  contributors: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number;
    previous_night: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
}

interface OuraListResponse<T> {
  data: T[];
  next_token: string | null;
}

// ─── Data Mapping ──────────────────────────────────────

export function mapOuraSleep(
  doc: OuraSleepDocument,
  userId: string,
  readinessScore?: number,
) {
  return {
    userId,
    date: new Date(doc.day),
    bedtime: new Date(doc.bedtime_start),
    wakeTime: new Date(doc.bedtime_end),
    durationMins: Math.round(doc.total_sleep_duration / 60),
    quality: deriveSleepQuality(doc),
    source: "oura" as const,
    stages: {
      deep: Math.round(doc.deep_sleep_duration / 60),
      light: Math.round(doc.light_sleep_duration / 60),
      rem: Math.round(doc.rem_sleep_duration / 60),
      awake: Math.round(doc.awake_time / 60),
    },
    score: readinessScore ?? null,
    externalId: `oura:${doc.id}`,
    notes: null,
  };
}

function deriveSleepQuality(doc: OuraSleepDocument): string {
  const efficiency =
    doc.time_in_bed > 0
      ? doc.total_sleep_duration / doc.time_in_bed
      : 0;
  if (efficiency >= 0.9) return "excellent";
  if (efficiency >= 0.8) return "good";
  if (efficiency >= 0.65) return "fair";
  return "poor";
}

export function mapOuraReadiness(readiness: OuraReadiness, userId: string) {
  return {
    userId,
    date: new Date(readiness.day),
    measurements: {
      readinessScore: readiness.score,
      hrvBalance: readiness.contributors.hrv_balance,
      restingHr: readiness.contributors.resting_heart_rate,
      temperatureDeviation: readiness.temperature_deviation,
      activityBalance: readiness.contributors.activity_balance,
      bodyTemperature: readiness.contributors.body_temperature,
      recoveryIndex: readiness.contributors.recovery_index,
      sleepBalance: readiness.contributors.sleep_balance,
    },
    source: "oura" as const,
    externalId: `oura:${readiness.id}`,
  };
}

// ─── HTTP Client ───────────────────────────────────────

export class OuraRateLimitError extends Error {
  constructor(
    public resetAt: Date,
    message = "Oura API rate limit exceeded",
  ) {
    super(message);
    this.name = "OuraRateLimitError";
  }
}

export async function fetchOuraApi<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${OURA_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const resetAt = retryAfter
      ? new Date(Date.now() + Number(retryAfter) * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);
    throw new OuraRateLimitError(resetAt);
  }

  if (!response.ok) {
    throw new Error(
      `Oura API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── Token Management ──────────────────────────────────

export async function refreshOuraToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Oura token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function revokeOuraToken(accessToken: string): Promise<void> {
  const response = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
      token: accessToken,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Oura token revocation failed: ${response.status} ${response.statusText}`,
    );
  }
}

export async function ensureOuraFreshToken(connection: any, db: any) {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }
  const refreshed = await refreshOuraToken(
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

// ─── Import Helpers ────────────────────────────────────

export async function importOuraSleep(
  connection: any,
  db: any,
  startDate: string,
  endDate: string,
) {
  const accessToken = await ensureOuraFreshToken(connection, db);

  const sleepResponse = await fetchOuraApi<OuraListResponse<OuraSleepDocument>>(
    "/usercollection/sleep",
    accessToken,
    { start_date: startDate, end_date: endDate },
  );

  // Optionally fetch readiness to attach scores to sleep
  const readinessMap = new Map<string, number>();
  try {
    const readinessResponse = await fetchOuraApi<
      OuraListResponse<OuraReadiness>
    >("/usercollection/daily_readiness", accessToken, {
      start_date: startDate,
      end_date: endDate,
    });
    for (const r of readinessResponse.data) {
      readinessMap.set(r.day, r.score);
    }
  } catch {
    /* readiness fetch is best-effort */
  }

  const results: any[] = [];

  for (const doc of sleepResponse.data) {
    const externalId = `oura:${doc.id}`;

    // Dedup check
    const existing = await db.sleepLog.findFirst({
      where: { externalId },
    });
    if (existing) continue;

    const readinessScore = readinessMap.get(doc.day);
    const mapped = mapOuraSleep(doc, connection.userId, readinessScore);

    const sleepLog = await db.sleepLog.create({
      data: { id: crypto.randomUUID(), ...mapped },
    });

    results.push(sleepLog);
  }

  return results;
}

export async function importOuraReadiness(
  connection: any,
  db: any,
  startDate: string,
  endDate: string,
) {
  const accessToken = await ensureOuraFreshToken(connection, db);

  const response = await fetchOuraApi<OuraListResponse<OuraReadiness>>(
    "/usercollection/daily_readiness",
    accessToken,
    { start_date: startDate, end_date: endDate },
  );

  const results: any[] = [];

  for (const readiness of response.data) {
    const mapped = mapOuraReadiness(readiness, connection.userId);
    const date = new Date(readiness.day);

    const metric = await db.bodyMetric.upsert({
      where: {
        userId_date: {
          userId: connection.userId,
          date,
        },
      },
      create: {
        id: crypto.randomUUID(),
        ...mapped,
      },
      update: {
        measurements: mapped.measurements,
        source: "oura",
        externalId: mapped.externalId,
      },
    });

    results.push(metric);
  }

  return results;
}

// ─── Backfill ──────────────────────────────────────────

export async function runOuraBackfill(connectionId: string, db: any) {
  const connection = await db.deviceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  try {
    await importOuraSleep(connection, db, startDate, endDate);
  } catch (err: any) {
    if (err instanceof OuraRateLimitError) {
      const waitMs = err.resetAt.getTime() - Date.now();
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
      }
      try {
        await importOuraSleep(connection, db, startDate, endDate);
      } catch {
        /* skip on second failure */
      }
    } else {
      console.error("Failed to backfill Oura sleep:", err);
      await captureError(err, { provider: "oura", operation: "sleep-backfill" });
    }
  }

  try {
    await importOuraReadiness(connection, db, startDate, endDate);
  } catch (err: any) {
    if (err instanceof OuraRateLimitError) {
      const waitMs = err.resetAt.getTime() - Date.now();
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
      }
      try {
        await importOuraReadiness(connection, db, startDate, endDate);
      } catch {
        /* skip on second failure */
      }
    } else {
      console.error("Failed to backfill Oura readiness:", err);
      await captureError(err, { provider: "oura", operation: "readiness-backfill" });
    }
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
