const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// ─── Type Mapping ───────────────────────────────────────

const STRAVA_TYPE_MAP: Record<string, string> = {
  Run: "run",
  VirtualRun: "run",
  TrailRun: "run",
  Ride: "cycle",
  VirtualRide: "cycle",
  GravelRide: "cycle",
  MountainBikeRide: "cycle",
  EBikeRide: "cycle",
  Swim: "swim",
  Hike: "hike",
  Walk: "walk",
  Rowing: "row",
  Elliptical: "elliptical",
};

export function mapStravaType(stravaType: string): string {
  return STRAVA_TYPE_MAP[stravaType] ?? "other";
}

// ─── Activity Mapping ───────────────────────────────────

export interface StravaActivity {
  id: number;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  description?: string;
}

export function mapStravaActivity(activity: StravaActivity, userId: string) {
  return {
    userId,
    externalId: `strava:${activity.id}`,
    type: mapStravaType(activity.type),
    source: "strava" as const,
    startedAt: new Date(activity.start_date),
    durationSeconds: activity.elapsed_time,
    distanceMeters: activity.distance,
    elevationGainM: activity.total_elevation_gain,
    avgHeartRate: activity.average_heartrate,
    maxHeartRate: activity.max_heartrate,
    calories: activity.calories,
    notes: activity.description,
  };
}

// ─── Stream Mapping ─────────────────────────────────────

export interface StravaStreams {
  latlng: { data: [number, number][] };
  altitude?: { data: number[] };
  heartrate?: { data: number[] };
  time?: { data: number[] };
}

export function mapStravaStreamsToRoutePoints(
  streams: StravaStreams,
  startDate: string,
  sessionId: string,
) {
  const startMs = new Date(startDate).getTime();

  return streams.latlng.data.map(([lat, lng], i) => ({
    sessionId,
    latitude: lat,
    longitude: lng,
    elevationM: streams.altitude?.data[i] ?? null,
    heartRate: streams.heartrate?.data[i] ?? null,
    timestamp: new Date(startMs + (streams.time?.data[i] ?? 0) * 1000),
  }));
}

// ─── HTTP Client ────────────────────────────────────────

export class StravaRateLimitError extends Error {
  constructor(
    public resetAt: Date,
    message = "Strava API rate limit exceeded",
  ) {
    super(message);
    this.name = "StravaRateLimitError";
  }
}

export async function fetchStravaApi<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${STRAVA_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429) {
    const resetHeader = response.headers.get("X-RateLimit-Reset");
    const resetAt = resetHeader
      ? new Date(Number(resetHeader) * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);
    throw new StravaRateLimitError(resetAt);
  }

  if (!response.ok) {
    throw new Error(
      `Strava API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ─── API Wrappers ───────────────────────────────────────

export function getActivity(accessToken: string, activityId: number) {
  return fetchStravaApi<StravaActivity>(
    `/activities/${activityId}`,
    accessToken,
  );
}

export function getActivityStreams(accessToken: string, activityId: number) {
  return fetchStravaApi<StravaStreams>(
    `/activities/${activityId}/streams`,
    accessToken,
    { keys: "latlng,altitude,heartrate,time", key_type: "stream" },
  );
}

export function getAthleteActivities(
  accessToken: string,
  params: { after?: number; before?: number; page?: number; per_page?: number },
) {
  return fetchStravaApi<StravaActivity[]>(
    "/athlete/activities",
    accessToken,
    params as Record<string, number>,
  );
}

// ─── Token Management ───────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
}> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Strava token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }>;
}

export async function revokeToken(accessToken: string): Promise<void> {
  const response = await fetch(
    `https://www.strava.com/oauth/deauthorize?access_token=${accessToken}`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(
      `Strava token revocation failed: ${response.status} ${response.statusText}`,
    );
  }
}
