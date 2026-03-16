// Lazy-loaded to avoid parse failures in vitest / iOS
function getPlatformOS(): string {
  try {
    const { Platform } = require("react-native");
    return Platform.OS;
  } catch {
    return "test";
  }
}

function getSecureStore(): typeof import("expo-secure-store") {
  return require("expo-secure-store");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleFitWorkoutSession {
  id: string;
  activityType: number;
  startDate: string;
  endDate: string;
  calories?: number;
  distance?: number; // meters
  appPackageName?: string;
}

interface GoogleFitWeightSample {
  value: number; // kg
  startDate: string;
  endDate: string;
}

// ---------------------------------------------------------------------------
// Pure functions (testable)
// ---------------------------------------------------------------------------

// react-native-google-fit uses numeric activity types matching Google Fit API
// https://developers.google.com/fit/rest/v1/reference/activity-list
const GF_ACTIVITY_RUNNING = 8; // Running
const GF_ACTIVITY_BIKING = 1; // Biking
const GF_ACTIVITY_SWIMMING = 82; // Swimming
const GF_ACTIVITY_HIKING = 35; // Hiking
const GF_ACTIVITY_WALKING = 7; // Walking

const GF_TO_IP: Record<number, string> = {
  [GF_ACTIVITY_RUNNING]: "run",
  [GF_ACTIVITY_BIKING]: "cycle",
  [GF_ACTIVITY_SWIMMING]: "swim",
  [GF_ACTIVITY_HIKING]: "hike",
  [GF_ACTIVITY_WALKING]: "walk",
};

const IP_TO_GF: Record<string, number> = {
  run: GF_ACTIVITY_RUNNING,
  cycle: GF_ACTIVITY_BIKING,
  swim: GF_ACTIVITY_SWIMMING,
  hike: GF_ACTIVITY_HIKING,
  walk: GF_ACTIVITY_WALKING,
};

export function mapGoogleFitTypeToIronPulse(type: number): string {
  return GF_TO_IP[type] ?? "other";
}

export function mapIronPulseTypeToGoogleFit(type: string): number {
  return IP_TO_GF[type] ?? 4; // 4 = "Unknown activity"
}

export function makeGoogleFitExternalId(dataSourceId: string): string {
  return `googlefit:${dataSourceId}`;
}

export function shouldSkipGoogleFitImport(
  appPackage: string | undefined
): boolean {
  return appPackage === "com.ironpulse.app";
}

// ---------------------------------------------------------------------------
// Lazy Google Fit SDK loader
// ---------------------------------------------------------------------------

let _gf: any = null;

function getGoogleFit(): any {
  if (_gf) return _gf;
  _gf = require("react-native-google-fit").default;
  return _gf;
}

// ---------------------------------------------------------------------------
// State management (SecureStore)
// ---------------------------------------------------------------------------

const STORE_KEY_ENABLED = "googlefit_enabled";
const STORE_KEY_LAST_SYNC = "googlefit_last_sync";

export function isGoogleFitAvailable(): boolean {
  return getPlatformOS() === "android";
}

export async function isGoogleFitConnected(): Promise<boolean> {
  const store = getSecureStore();
  const val = await store.getItemAsync(STORE_KEY_ENABLED);
  return val === "true";
}

export async function setGoogleFitEnabled(enabled: boolean): Promise<void> {
  const store = getSecureStore();
  await store.setItemAsync(STORE_KEY_ENABLED, String(enabled));
}

export async function getGoogleFitLastSync(): Promise<string | null> {
  const store = getSecureStore();
  return store.getItemAsync(STORE_KEY_LAST_SYNC);
}

export async function setGoogleFitLastSync(iso: string): Promise<void> {
  const store = getSecureStore();
  await store.setItemAsync(STORE_KEY_LAST_SYNC, iso);
}

// ---------------------------------------------------------------------------
// Google Fit SDK interactions
// ---------------------------------------------------------------------------

export async function authorizeGoogleFit(): Promise<boolean> {
  if (!isGoogleFitAvailable()) return false;

  const GoogleFit = getGoogleFit();

  const options = {
    scopes: [
      GoogleFit.Scopes.FITNESS_ACTIVITY_READ,
      GoogleFit.Scopes.FITNESS_ACTIVITY_WRITE,
      GoogleFit.Scopes.FITNESS_BODY_READ,
      GoogleFit.Scopes.FITNESS_BODY_WRITE,
    ],
  };

  const authResult = await GoogleFit.authorize(options);
  return authResult.success === true;
}

export async function queryGoogleFitWorkouts(
  since: Date
): Promise<GoogleFitWorkoutSession[]> {
  if (!isGoogleFitAvailable()) return [];

  const GoogleFit = getGoogleFit();

  const options = {
    startDate: since.toISOString(),
    endDate: new Date().toISOString(),
  };

  const activities = await GoogleFit.getActivitySamples(options);

  return (activities ?? []).map((a: any) => ({
    id: a.sourceName
      ? `${a.sourceName}-${a.start}`
      : `gf-${a.start}`,
    activityType: a.activityType ?? 4,
    startDate: a.startDate ?? a.start,
    endDate: a.endDate ?? a.end,
    calories: a.calories,
    distance: a.distance,
    appPackageName: a.sourceName,
  }));
}

export async function queryGoogleFitWeight(
  since: Date
): Promise<GoogleFitWeightSample[]> {
  if (!isGoogleFitAvailable()) return [];

  const GoogleFit = getGoogleFit();

  const options = {
    startDate: since.toISOString(),
    endDate: new Date().toISOString(),
    unit: "kg",
  };

  const samples = await GoogleFit.getWeightSamples(options);

  return (samples ?? []).map((s: any) => ({
    value: s.value,
    startDate: s.startDate,
    endDate: s.endDate,
  }));
}

export async function saveWorkoutToGoogleFit(session: {
  type: string;
  startDate: Date;
  endDate: Date;
  calories?: number;
  distanceMeters?: number;
}): Promise<void> {
  if (!isGoogleFitAvailable()) return;

  const GoogleFit = getGoogleFit();

  const activityType = mapIronPulseTypeToGoogleFit(session.type);

  await GoogleFit.startRecording(
    (callback: any) => {},
    ["activity"]
  ).catch(() => {});

  const options: any = {
    activityType,
    startDate: session.startDate.toISOString(),
    endDate: session.endDate.toISOString(),
  };

  if (session.calories != null) {
    options.calories = session.calories;
  }
  if (session.distanceMeters != null) {
    options.distance = session.distanceMeters;
  }

  await GoogleFit.saveActivity(options);
}

export async function saveWeightToGoogleFit(
  weightKg: number,
  date: Date
): Promise<void> {
  if (!isGoogleFitAvailable()) return;

  const GoogleFit = getGoogleFit();

  await GoogleFit.saveWeight(
    { value: weightKg, date: date.toISOString(), unit: "kg" },
    (res: any) => {}
  );
}

// ---------------------------------------------------------------------------
// High-level sync functions
// ---------------------------------------------------------------------------

export async function syncFromGoogleFit(
  db: any,
  userId: string
): Promise<{ importedWorkouts: number; importedWeights: number }> {
  if (!isGoogleFitAvailable())
    return { importedWorkouts: 0, importedWeights: 0 };

  const lastSync = await getGoogleFitLastSync();
  const since = lastSync
    ? new Date(lastSync)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let importedWorkouts = 0;
  let importedWeights = 0;

  // Import workouts
  const workouts = await queryGoogleFitWorkouts(since);
  for (const w of workouts) {
    if (shouldSkipGoogleFitImport(w.appPackageName)) continue;

    const externalId = makeGoogleFitExternalId(w.id);

    // Dedup check
    const existing = await db.execute(
      "SELECT id FROM cardio_sessions WHERE external_id = ?",
      [externalId]
    );
    if (existing.rows?.length > 0) continue;

    const id = crypto.randomUUID();
    const ipType = mapGoogleFitTypeToIronPulse(w.activityType);
    const startMs = new Date(w.startDate).getTime();
    const endMs = new Date(w.endDate).getTime();
    const durationSeconds = Math.round((endMs - startMs) / 1000);

    await db.execute(
      `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, calories, external_id, created_at)
       VALUES (?, ?, ?, 'googlefit', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        ipType,
        w.startDate,
        durationSeconds,
        w.distance ?? null,
        w.calories ?? null,
        externalId,
        new Date().toISOString(),
      ]
    );
    importedWorkouts++;
  }

  // Import body weight
  const weights = await queryGoogleFitWeight(since);
  for (const w of weights) {
    const dateStr = w.startDate.split("T")[0];

    // Dedup: one weight per day
    const existing = await db.execute(
      "SELECT id FROM body_metrics WHERE user_id = ? AND date = ?",
      [userId, dateStr]
    );
    if (existing.rows?.length > 0) continue;

    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, dateStr, w.value, new Date().toISOString()]
    );
    importedWeights++;
  }

  await setGoogleFitLastSync(new Date().toISOString());

  return { importedWorkouts, importedWeights };
}

export async function writeCardioToGoogleFit(session: {
  type: string;
  started_at: string;
  duration_seconds: number;
  distance_meters?: number | null;
  calories?: number | null;
}): Promise<void> {
  if (!isGoogleFitAvailable()) return;
  if (!(await isGoogleFitConnected())) return;

  try {
    const startDate = new Date(session.started_at);
    const endDate = new Date(
      startDate.getTime() + session.duration_seconds * 1000
    );

    await saveWorkoutToGoogleFit({
      type: session.type,
      startDate,
      endDate,
      distanceMeters: session.distance_meters ?? undefined,
      calories: session.calories ?? undefined,
    });
  } catch (e) {
    console.warn("Failed to write cardio to Google Fit:", e);
  }
}

export async function writeWeightToGoogleFit(
  weightKg: number,
  date: Date
): Promise<void> {
  if (!isGoogleFitAvailable()) return;
  if (!(await isGoogleFitConnected())) return;

  try {
    await saveWeightToGoogleFit(weightKg, date);
  } catch (e) {
    console.warn("Failed to write weight to Google Fit:", e);
  }
}
