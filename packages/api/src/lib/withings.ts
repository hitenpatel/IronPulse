import crypto from "crypto";
import { encryptToken, decryptToken } from "./encryption";
import { requireIntegrationCredentials } from "./env";

const WITHINGS_API_BASE = "https://wbsapi.withings.net";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";

// ─── Measure Type Constants ────────────────────────────

export const WithingsMeasureType = {
  WEIGHT_KG: 1,
  FAT_MASS_KG: 6,
  FAT_PCT: 8,
  DIASTOLIC_BP: 9,
  SYSTOLIC_BP: 10,
  MUSCLE_MASS_KG: 76,
  HYDRATION_PCT: 77,
  BONE_MASS_KG: 88,
} as const;

// ─── Interfaces ────────────────────────────────────────

export interface WithingsMeasure {
  value: number;
  type: number;
  unit: number;
}

export interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  measures: WithingsMeasure[];
  category: number; // 1 = real, 2 = user objective
}

interface WithingsMeasureResponse {
  status: number;
  body: {
    updatetime: number;
    more: number;
    offset: number;
    measuregrps: WithingsMeasureGroup[];
  };
}

interface WithingsSleepSummary {
  date: string;
  data: {
    breathing_disturbances_intensity?: number;
    deepsleepduration?: number;
    lightsleepduration?: number;
    remsleepduration?: number;
    sleep_score?: number;
    durationtosleep?: number;
    wakeupduration?: number;
    hr_average?: number;
    hr_min?: number;
    hr_max?: number;
  };
}

interface WithingsSleepResponse {
  status: number;
  body: {
    series: WithingsSleepSummary[];
    more: boolean;
    offset: number;
  };
}

interface WithingsTokenResponse {
  status: number;
  body: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    userid: number;
  };
}

// ─── Measure Mapping ───────────────────────────────────

/**
 * Convert a Withings measure value using its unit exponent.
 * Withings stores values as `value * 10^unit`, e.g. 7230 with unit -2 = 72.30
 */
function realValue(measure: WithingsMeasure): number {
  return measure.value * Math.pow(10, measure.unit);
}

export function mapWithingsMeasures(group: WithingsMeasureGroup): {
  weightKg: number | null;
  bodyFatPct: number | null;
  measurements: Record<string, number>;
} {
  let weightKg: number | null = null;
  let bodyFatPct: number | null = null;
  const measurements: Record<string, number> = {};

  for (const m of group.measures) {
    const val = realValue(m);
    switch (m.type) {
      case WithingsMeasureType.WEIGHT_KG:
        weightKg = Math.round(val * 100) / 100;
        break;
      case WithingsMeasureType.FAT_PCT:
        bodyFatPct = Math.round(val * 10) / 10;
        break;
      case WithingsMeasureType.FAT_MASS_KG:
        measurements.fatMassKg = Math.round(val * 100) / 100;
        break;
      case WithingsMeasureType.MUSCLE_MASS_KG:
        measurements.muscleMassKg = Math.round(val * 100) / 100;
        break;
      case WithingsMeasureType.BONE_MASS_KG:
        measurements.boneMassKg = Math.round(val * 100) / 100;
        break;
      case WithingsMeasureType.HYDRATION_PCT:
        measurements.hydrationPct = Math.round(val * 10) / 10;
        break;
      case WithingsMeasureType.SYSTOLIC_BP:
        measurements.systolicBp = Math.round(val);
        break;
      case WithingsMeasureType.DIASTOLIC_BP:
        measurements.diastolicBp = Math.round(val);
        break;
    }
  }

  return { weightKg, bodyFatPct, measurements };
}

// ─── HTTP Client ───────────────────────────────────────

export class WithingsApiError extends Error {
  constructor(
    public statusCode: number,
    message = "Withings API error",
  ) {
    super(message);
    this.name = "WithingsApiError";
  }
}

export async function fetchWithingsApi<T>(
  path: string,
  accessToken: string,
  params: Record<string, string | number>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, String(value));
  }

  const response = await fetch(`${WITHINGS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new WithingsApiError(
      response.status,
      `Withings API error: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as { status: number; body: unknown };

  // Withings returns HTTP 200 but uses a status field for errors
  if (json.status !== 0) {
    throw new WithingsApiError(
      json.status,
      `Withings API returned status ${json.status}`,
    );
  }

  return json as T;
}

// ─── Token Management ──────────────────────────────────

export async function refreshWithingsToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  userid: number;
}> {
  const withings = requireIntegrationCredentials("WITHINGS");
  const body = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: withings.clientId,
    client_secret: withings.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Withings token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as WithingsTokenResponse;
  if (json.status !== 0) {
    throw new Error(`Withings token refresh returned status ${json.status}`);
  }

  return json.body;
}

export async function revokeWithingsToken(accessToken: string): Promise<void> {
  const body = new URLSearchParams({
    action: "notify_revoke",
  });

  // Withings doesn't have a dedicated revoke endpoint — best-effort
  // notify_revoke removes webhook subscriptions; the token itself
  // expires naturally. We call the user endpoint to signal disconnect.
  await fetch(`${WITHINGS_API_BASE}/notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body.toString(),
  });
}

export async function ensureWithingsFreshToken(
  connection: any,
  db: any,
): Promise<string> {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }

  const refreshed = await refreshWithingsToken(
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

export async function importWithingsMeasures(
  groups: WithingsMeasureGroup[],
  userId: string,
  db: any,
): Promise<number> {
  let imported = 0;

  for (const group of groups) {
    // Skip user-objective entries (category 2)
    if (group.category !== 1) continue;

    const mapped = mapWithingsMeasures(group);

    // Skip groups with no useful data
    if (mapped.weightKg === null && mapped.bodyFatPct === null) continue;

    const date = new Date(group.date * 1000);
    // Normalize to date-only (midnight UTC)
    const dateOnly = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    const externalId = `withings:${group.grpid}`;

    // Dedup + upsert run together inside a single transaction so two
    // concurrent webhook deliveries of the same grpid can't both see
    // "not exists" and race into a duplicate write. The existence check
    // *and* the upsert are bound to one DB session.
    const wasImported = await db.$transaction(async (tx: typeof db) => {
      const existing = await tx.bodyMetric.findFirst({
        where: { externalId },
        select: { id: true },
      });
      if (existing) return false;

      await tx.bodyMetric.upsert({
        where: {
          userId_date: {
            userId,
            date: dateOnly,
          },
        },
        create: {
          id: crypto.randomUUID(),
          userId,
          date: dateOnly,
          weightKg: mapped.weightKg,
          bodyFatPct: mapped.bodyFatPct,
          measurements:
            Object.keys(mapped.measurements).length > 0
              ? mapped.measurements
              : undefined,
          source: "withings",
          externalId,
        },
        update: {
          weightKg: mapped.weightKg ?? undefined,
          bodyFatPct: mapped.bodyFatPct ?? undefined,
          measurements:
            Object.keys(mapped.measurements).length > 0
              ? mapped.measurements
              : undefined,
          source: "withings",
          externalId,
        },
      });
      return true;
    });

    if (wasImported) imported++;
  }

  return imported;
}

export async function runWithingsBackfill(
  connectionId: string,
  db: any,
): Promise<void> {
  const connection = await db.deviceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;

  const accessToken = await ensureWithingsFreshToken(connection, db);

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  const response = await fetchWithingsApi<WithingsMeasureResponse>(
    "/measure",
    accessToken,
    {
      action: "getmeas",
      meastype: "1,6,8,76,88,77,10,9",
      startdate: thirtyDaysAgo,
      enddate: now,
    },
  );

  await importWithingsMeasures(
    response.body.measuregrps,
    connection.userId,
    db,
  );

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
