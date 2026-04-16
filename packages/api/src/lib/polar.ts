import crypto from "crypto";
import { encryptToken, decryptToken } from "./encryption";
import { captureError } from "./capture-error";
import { logger } from "./logger";

const POLAR_API_BASE = "https://www.polaraccesslink.com/v3";
const POLAR_TOKEN_URL = "https://polarremote.com/v2/oauth2/token";

// ─── Type Mapping ───────────────────────────────────────

const POLAR_TYPE_MAP: Record<string, string> = {
  RUNNING: "run",
  CYCLING: "cycle",
  SWIMMING: "swim",
  HIKING: "hike",
  WALKING: "walk",
  ROWING: "row",
};

export function mapPolarType(polarType: string): string {
  return POLAR_TYPE_MAP[polarType] ?? "other";
}

// ─── Activity Mapping ───────────────────────────────────

export interface PolarExercise {
  id: string;
  sport: string;
  start_time: string;
  duration: string; // ISO 8601 duration e.g. "PT1H30M"
  distance: number;
  ascent?: number;
  heart_rate?: {
    average?: number;
    maximum?: number;
  };
  calories?: number;
}

function parseDurationToSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseFloat(match[3] || "0");
  return hours * 3600 + minutes * 60 + Math.round(seconds);
}

export function mapPolarActivity(exercise: PolarExercise, userId: string) {
  return {
    userId,
    externalId: `polar:${exercise.id}`,
    type: mapPolarType(exercise.sport),
    source: "polar" as const,
    startedAt: new Date(exercise.start_time),
    durationSeconds: parseDurationToSeconds(exercise.duration),
    distanceMeters: exercise.distance,
    elevationGainM: exercise.ascent,
    avgHeartRate: exercise.heart_rate?.average,
    maxHeartRate: exercise.heart_rate?.maximum,
    calories: exercise.calories,
    notes: undefined,
  };
}

// ─── HTTP Client ────────────────────────────────────────

export class PolarRateLimitError extends Error {
  constructor(
    public resetAt: Date,
    message = "Polar API rate limit exceeded",
  ) {
    super(message);
    this.name = "PolarRateLimitError";
  }
}

export async function fetchPolarApi<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${POLAR_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const resetAt = retryAfter
      ? new Date(Date.now() + Number(retryAfter) * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);
    throw new PolarRateLimitError(resetAt);
  }

  if (!response.ok) {
    throw new Error(
      `Polar API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── API Wrappers ───────────────────────────────────────

interface PolarTransactionResponse {
  "transaction-id": number;
  "resource-uri": string;
}

interface PolarExerciseListResponse {
  exercises: string[];
}

export function createExerciseTransaction(
  accessToken: string,
  polarUserId: string,
) {
  return fetchPolarApi<PolarTransactionResponse>(
    `/users/${polarUserId}/exercise-transactions`,
    accessToken,
  );
}

export function listTransactionExercises(
  accessToken: string,
  polarUserId: string,
  transactionId: number,
) {
  return fetchPolarApi<PolarExerciseListResponse>(
    `/users/${polarUserId}/exercise-transactions/${transactionId}`,
    accessToken,
  );
}

export function getExercise(accessToken: string, exerciseId: string) {
  return fetchPolarApi<PolarExercise>(`/exercises/${exerciseId}`, accessToken);
}

// ─── Token Management ───────────────────────────────────

function basicAuthHeader(): string {
  const credentials = `${process.env.POLAR_CLIENT_ID}:${process.env.POLAR_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function refreshPolarToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(POLAR_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Polar token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function revokePolarToken(
  accessToken: string,
  polarUserId: string,
): Promise<void> {
  const response = await fetch(
    `${POLAR_API_BASE}/users/${polarUserId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Polar token revocation failed: ${response.status} ${response.statusText}`,
    );
  }
}

// ─── Token + Import Helpers ────────────────────────────

export async function ensurePolarFreshToken(connection: any, db: any) {
  if (new Date(connection.tokenExpiresAt) > new Date()) {
    return decryptToken(connection.accessToken);
  }
  const refreshed = await refreshPolarToken(
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

export async function importPolarActivity(
  exerciseId: string,
  connection: any,
  db: any,
) {
  const accessToken = await ensurePolarFreshToken(connection, db);

  // Dedup check
  const existing = await db.cardioSession.findFirst({
    where: { externalId: `polar:${exerciseId}` },
  });
  if (existing) return null;

  const exercise = await getExercise(accessToken, exerciseId);
  const mapped = mapPolarActivity(exercise, connection.userId);

  const session = await db.cardioSession.create({
    data: { id: crypto.randomUUID(), ...mapped },
  });

  return session;
}

export async function runPolarBackfill(connectionId: string, db: any) {
  const connection = await db.deviceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;

  const accessToken = await ensurePolarFreshToken(connection, db);

  // Create a transaction to pull exercises
  let transaction: PolarTransactionResponse;
  try {
    transaction = await createExerciseTransaction(
      accessToken,
      connection.providerAccountId,
    );
  } catch (err: any) {
    // 204 means no new data available
    if (err.message?.includes("204")) return;
    throw err;
  }

  const exerciseList = await listTransactionExercises(
    accessToken,
    connection.providerAccountId,
    transaction["transaction-id"],
  );

  for (const exerciseUrl of exerciseList.exercises) {
    // Extract exercise ID from URL
    const exerciseId = exerciseUrl.split("/").pop();
    if (!exerciseId) continue;

    try {
      await importPolarActivity(exerciseId, connection, db);
    } catch (err: any) {
      if (err instanceof PolarRateLimitError) {
        const waitMs = err.resetAt.getTime() - Date.now();
        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
        }
        try {
          await importPolarActivity(exerciseId, connection, db);
        } catch {
          /* skip on second failure */
        }
      } else {
        logger.error({ err, provider: "polar", exerciseId }, "Failed to import Polar exercise");
        await captureError(err, { provider: "polar", exerciseId });
      }
    }
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}
