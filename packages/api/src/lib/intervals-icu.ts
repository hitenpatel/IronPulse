import crypto from "crypto";
import { decryptToken } from "./encryption";

const INTERVALS_API_BASE = "https://intervals.icu/api/v1";

// ─── Type Mapping ───────────────────────────────────────

const INTERVALS_TYPE_MAP: Record<string, string> = {
  Run: "run",
  VirtualRun: "run",
  Ride: "cycle",
  VirtualRide: "cycle",
  Swim: "swim",
  Walk: "walk",
  Hike: "hike",
  Row: "row",
};

export function mapIntervalsType(intervalsType: string): string {
  return INTERVALS_TYPE_MAP[intervalsType] ?? "other";
}

// ─── Interfaces ─────────────────────────────────────────

export interface IntervalsActivity {
  id: number;
  start_date_local: string;
  type: string;
  moving_time: number;
  distance: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  name?: string;
}

export interface IntervalsWellness {
  id: string;
  day: string; // YYYY-MM-DD
  weight?: number;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  sleepScore?: number;
  fatigue?: number;
  mood?: number;
  readiness?: number;
}

// ─── Activity Mapping ───────────────────────────────────

export function mapIntervalsActivity(
  activity: IntervalsActivity,
  userId: string,
) {
  return {
    userId,
    externalId: `intervals_icu:${activity.id}`,
    type: mapIntervalsType(activity.type),
    source: "intervals_icu" as const,
    startedAt: new Date(activity.start_date_local),
    durationSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    elevationGainM: activity.total_elevation_gain,
    avgHeartRate: activity.average_heartrate,
    maxHeartRate: activity.max_heartrate,
    calories: activity.calories,
    notes: activity.name,
  };
}

// ─── Wellness Mapping ───────────────────────────────────

export function mapIntervalsWellness(
  wellness: IntervalsWellness,
  userId: string,
) {
  const date = new Date(wellness.day + "T00:00:00Z");

  const bodyMetric =
    wellness.weight != null ||
    wellness.hrv != null ||
    wellness.restingHR != null
      ? {
          userId,
          externalId: `intervals_icu:wellness:${wellness.day}`,
          date,
          source: "intervals_icu" as const,
          weightKg: wellness.weight ?? null,
          bodyFatPct: null,
          measurements: {
            ...(wellness.hrv != null ? { hrv: wellness.hrv } : {}),
            ...(wellness.restingHR != null
              ? { restingHR: wellness.restingHR }
              : {}),
            ...(wellness.fatigue != null ? { fatigue: wellness.fatigue } : {}),
            ...(wellness.mood != null ? { mood: wellness.mood } : {}),
            ...(wellness.readiness != null
              ? { readiness: wellness.readiness }
              : {}),
          },
        }
      : null;

  const sleepLog =
    wellness.sleepSecs != null
      ? {
          userId,
          externalId: `intervals_icu:sleep:${wellness.day}`,
          date,
          source: "intervals_icu" as const,
          durationMins: Math.round(wellness.sleepSecs / 60),
          score: wellness.sleepScore ?? null,
          quality: mapSleepScoreToQuality(wellness.sleepScore),
          bedtime: null,
          wakeTime: null,
          stages: null,
          notes: null,
        }
      : null;

  return { bodyMetric, sleepLog };
}

function mapSleepScoreToQuality(
  score: number | undefined,
): string | null {
  if (score == null) return null;
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

// ─── HTTP Client ────────────────────────────────────────

export class IntervalsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "IntervalsApiError";
  }
}

export async function fetchIntervalsApi<T>(
  path: string,
  apiKey: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${INTERVALS_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const credentials = Buffer.from(`API_KEY:${apiKey}`).toString("base64");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    throw new IntervalsApiError(
      401,
      "Intervals.icu API authentication failed — check your API key",
    );
  }

  if (response.status === 429) {
    throw new IntervalsApiError(429, "Intervals.icu API rate limit exceeded");
  }

  if (!response.ok) {
    throw new IntervalsApiError(
      response.status,
      `Intervals.icu API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── API Wrappers ───────────────────────────────────────

export function getActivities(
  apiKey: string,
  athleteId: string,
  oldest: string,
  newest: string,
) {
  return fetchIntervalsApi<IntervalsActivity[]>(
    `/athlete/${athleteId}/activities`,
    apiKey,
    { oldest, newest },
  );
}

export function getWellness(
  apiKey: string,
  athleteId: string,
  oldest: string,
  newest: string,
) {
  return fetchIntervalsApi<IntervalsWellness[]>(
    `/athlete/${athleteId}/wellness`,
    apiKey,
    { oldest, newest },
  );
}

// ─── Import Helpers ─────────────────────────────────────

/**
 * Import a single Intervals.icu activity, deduplicating against both
 * Intervals.icu external IDs and the original source IDs (Strava, Garmin)
 * to avoid importing the same workout twice when a user has multiple
 * integrations feeding the same data.
 */
export async function importIntervalsActivity(
  activity: IntervalsActivity,
  userId: string,
  db: any,
) {
  // Dedup: already imported from Intervals.icu
  const existing = await db.cardioSession.findFirst({
    where: { externalId: `intervals_icu:${activity.id}` },
  });
  if (existing) return null;

  // Dedup: same activity might already exist from Strava or Garmin.
  // Intervals.icu activity IDs often correspond to the original source ID.
  const crossSourceDup = await db.cardioSession.findFirst({
    where: {
      userId,
      OR: [
        { externalId: `strava:${activity.id}` },
        { externalId: `garmin:${activity.id}` },
      ],
    },
  });
  if (crossSourceDup) return null;

  const mapped = mapIntervalsActivity(activity, userId);

  const session = await db.cardioSession.create({
    data: { id: crypto.randomUUID(), ...mapped },
  });

  return session;
}

/**
 * Import a single Intervals.icu wellness record, upserting BodyMetric
 * and SleepLog entries as appropriate.
 */
export async function importIntervalsWellness(
  wellness: IntervalsWellness,
  userId: string,
  db: any,
) {
  const { bodyMetric, sleepLog } = mapIntervalsWellness(wellness, userId);
  const results: { bodyMetric: any; sleepLog: any } = {
    bodyMetric: null,
    sleepLog: null,
  };

  if (bodyMetric) {
    const date = bodyMetric.date;

    // Upsert: update if same day already exists for this user, otherwise create
    const existingMetric = await db.bodyMetric.findFirst({
      where: { externalId: bodyMetric.externalId },
    });

    if (existingMetric) {
      results.bodyMetric = await db.bodyMetric.update({
        where: { id: existingMetric.id },
        data: {
          weightKg: bodyMetric.weightKg,
          measurements: bodyMetric.measurements,
        },
      });
    } else {
      // Check for existing manual entry on the same day to avoid unique constraint
      const existingForDay = await db.bodyMetric.findUnique({
        where: {
          userId_date: { userId, date },
        },
      });

      if (existingForDay) {
        // Update existing entry with intervals data if it has no external source
        results.bodyMetric = await db.bodyMetric.update({
          where: { id: existingForDay.id },
          data: {
            source: bodyMetric.source,
            externalId: bodyMetric.externalId,
            weightKg: bodyMetric.weightKg ?? existingForDay.weightKg,
            measurements: {
              ...(existingForDay.measurements as Record<string, unknown> | null),
              ...bodyMetric.measurements,
            },
          },
        });
      } else {
        results.bodyMetric = await db.bodyMetric.create({
          data: { id: crypto.randomUUID(), ...bodyMetric },
        });
      }
    }
  }

  if (sleepLog) {
    const existingSleep = await db.sleepLog.findFirst({
      where: { externalId: sleepLog.externalId },
    });

    if (existingSleep) {
      results.sleepLog = await db.sleepLog.update({
        where: { id: existingSleep.id },
        data: {
          durationMins: sleepLog.durationMins,
          score: sleepLog.score,
          quality: sleepLog.quality,
        },
      });
    } else {
      results.sleepLog = await db.sleepLog.create({
        data: { id: crypto.randomUUID(), ...sleepLog },
      });
    }
  }

  return results;
}

// ─── Backfill ───────────────────────────────────────────

/**
 * Pull the last 30 days of activities and wellness data from Intervals.icu.
 */
export async function runIntervalsBackfill(connectionId: string, db: any) {
  const connection = await db.deviceConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return;

  const apiKey = decryptToken(connection.accessToken);
  const athleteId = connection.providerAccountId;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newest = formatDate(now);
  const oldest = formatDate(thirtyDaysAgo);

  // Fetch activities and wellness in parallel
  const [activities, wellness] = await Promise.all([
    getActivities(apiKey, athleteId, oldest, newest).catch((err) => {
      console.error("Failed to fetch Intervals.icu activities:", err);
      return [] as IntervalsActivity[];
    }),
    getWellness(apiKey, athleteId, oldest, newest).catch((err) => {
      console.error("Failed to fetch Intervals.icu wellness:", err);
      return [] as IntervalsWellness[];
    }),
  ]);

  // Import activities
  for (const activity of activities) {
    try {
      await importIntervalsActivity(activity, connection.userId, db);
    } catch (err) {
      console.error(
        `Failed to import Intervals.icu activity ${activity.id}:`,
        err,
      );
    }
  }

  // Import wellness data
  for (const entry of wellness) {
    try {
      await importIntervalsWellness(entry, connection.userId, db);
    } catch (err) {
      console.error(
        `Failed to import Intervals.icu wellness ${entry.day}:`,
        err,
      );
    }
  }

  await db.deviceConnection.update({
    where: { id: connectionId },
    data: { lastSyncedAt: new Date() },
  });
}

// ─── Utilities ──────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
