// Lazy-loaded to avoid parse failures in vitest / Android
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

interface HealthKitWorkoutSample {
  uuid: string;
  activityName: string;
  start: string;
  end: string;
  duration: number; // minutes
  distance?: number; // meters
  calories?: number;
  sourceBundle?: string;
}

interface HealthKitBodyMassSample {
  value: number; // kg
  startDate: string;
  endDate: string;
}

interface SaveWorkoutOpts {
  type: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  distanceMeters?: number;
  calories?: number;
}

// ---------------------------------------------------------------------------
// Pure functions (testable)
// ---------------------------------------------------------------------------

const HK_TO_IP: Record<string, string> = {
  Running: "run",
  Cycling: "cycle",
  Swimming: "swim",
  Hiking: "hike",
  Walking: "walk",
};

const IP_TO_HK: Record<string, string> = {
  run: "Running",
  cycle: "Cycling",
  swim: "Swimming",
  hike: "Hiking",
  walk: "Walking",
};

export function mapHealthKitTypeToIronPulse(hkType: string): string {
  return HK_TO_IP[hkType] ?? "other";
}

export function mapIronPulseTypeToHealthKit(ipType: string): string {
  return IP_TO_HK[ipType] ?? "Other";
}

export function makeExternalId(uuid: string): string {
  return `healthkit:${uuid}`;
}

export function shouldSkipImport(sourceBundle: string | undefined): boolean {
  return sourceBundle === "com.ironpulse.app";
}

// ---------------------------------------------------------------------------
// Lazy HealthKit SDK loader
// ---------------------------------------------------------------------------

let _hk: any = null;

function getHealthKit(): any {
  if (_hk) return _hk;
  _hk = require("react-native-health");
  return _hk;
}

// ---------------------------------------------------------------------------
// State management (SecureStore)
// ---------------------------------------------------------------------------

const STORE_KEY_ENABLED = "healthkit_enabled";
const STORE_KEY_LAST_SYNC = "healthkit_last_sync";

export function isHealthKitAvailable(): boolean {
  return getPlatformOS() === "ios";
}

export async function isHealthKitConnected(): Promise<boolean> {
  const store = getSecureStore();
  const val = await store.getItemAsync(STORE_KEY_ENABLED);
  return val === "true";
}

export async function setHealthKitEnabled(enabled: boolean): Promise<void> {
  const store = getSecureStore();
  await store.setItemAsync(STORE_KEY_ENABLED, String(enabled));
}

export async function getLastSyncTimestamp(): Promise<string | null> {
  const store = getSecureStore();
  return store.getItemAsync(STORE_KEY_LAST_SYNC);
}

export async function setLastSyncTimestamp(iso: string): Promise<void> {
  const store = getSecureStore();
  await store.setItemAsync(STORE_KEY_LAST_SYNC, iso);
}

// ---------------------------------------------------------------------------
// HealthKit SDK interactions
// ---------------------------------------------------------------------------

export function requestPermissions(): Promise<void> {
  if (!isHealthKitAvailable()) return Promise.resolve();

  const HK = getHealthKit();
  const permissions = {
    permissions: {
      read: [
        HK.default.Constants.Permissions.Workout,
        HK.default.Constants.Permissions.BodyMass,
        HK.default.Constants.Permissions.HeartRate,
        HK.default.Constants.Permissions.ActiveEnergyBurned,
      ],
      write: [
        HK.default.Constants.Permissions.Workout,
        HK.default.Constants.Permissions.BodyMass,
      ],
    },
  };

  return new Promise((resolve, reject) => {
    HK.default.initHealthKit(permissions, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function queryWorkouts(since: Date): Promise<HealthKitWorkoutSample[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  const HK = getHealthKit();
  const options = {
    startDate: since.toISOString(),
    endDate: new Date().toISOString(),
    type: "Workout",
  };

  return new Promise((resolve, reject) => {
    HK.default.getSamples(options, (err: any, results: any[]) => {
      if (err) return reject(err);
      resolve(
        (results ?? []).map((r: any) => ({
          uuid: r.id ?? r.uuid ?? "",
          activityName: r.activityName ?? "Other",
          start: r.start ?? r.startDate,
          end: r.end ?? r.endDate,
          duration: r.duration ?? 0,
          distance: r.distance,
          calories: r.calories,
          sourceBundle: r.sourceName ?? r.sourceBundle,
        }))
      );
    });
  });
}

export function queryBodyMass(since: Date): Promise<HealthKitBodyMassSample[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([]);

  const HK = getHealthKit();
  const options = {
    startDate: since.toISOString(),
    endDate: new Date().toISOString(),
    unit: "kilogram",
  };

  return new Promise((resolve, reject) => {
    HK.default.getBodyMassSamples(options, (err: any, results: any[]) => {
      if (err) return reject(err);
      resolve(
        (results ?? []).map((r: any) => ({
          value: r.value,
          startDate: r.startDate,
          endDate: r.endDate,
        }))
      );
    });
  });
}

export function saveWorkout(opts: SaveWorkoutOpts): Promise<void> {
  if (!isHealthKitAvailable()) return Promise.resolve();

  const HK = getHealthKit();
  const sample = {
    type: mapIronPulseTypeToHealthKit(opts.type),
    startDate: opts.startDate.toISOString(),
    endDate: opts.endDate.toISOString(),
    duration: opts.durationMinutes * 60,
    energyBurned: opts.calories,
    distance: opts.distanceMeters,
  };

  return new Promise((resolve, reject) => {
    HK.default.saveWorkout(sample, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function saveWeight(weightKg: number, date: Date): Promise<void> {
  if (!isHealthKitAvailable()) return Promise.resolve();

  const HK = getHealthKit();
  const sample = {
    value: weightKg,
    unit: "kilogram",
    startDate: date.toISOString(),
  };

  return new Promise((resolve, reject) => {
    HK.default.saveBodyMassSample(sample, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// High-level sync functions
// ---------------------------------------------------------------------------

export async function syncFromHealthKit(
  db: any,
  userId: string
): Promise<{ importedWorkouts: number; importedWeights: number }> {
  if (!isHealthKitAvailable()) return { importedWorkouts: 0, importedWeights: 0 };

  const lastSync = await getLastSyncTimestamp();
  const since = lastSync ? new Date(lastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let importedWorkouts = 0;
  let importedWeights = 0;

  // Import workouts
  const workouts = await queryWorkouts(since);
  for (const w of workouts) {
    if (shouldSkipImport(w.sourceBundle)) continue;

    const externalId = makeExternalId(w.uuid);

    // Dedup check
    const existing = await db.execute(
      "SELECT id FROM cardio_sessions WHERE external_id = ?",
      [externalId]
    );
    if (existing.rows?.length > 0) continue;

    const id = crypto.randomUUID();
    const ipType = mapHealthKitTypeToIronPulse(w.activityName);
    const durationSeconds = Math.round(w.duration * 60);

    await db.execute(
      `INSERT INTO cardio_sessions (id, user_id, type, source, started_at, duration_seconds, distance_meters, calories, external_id, created_at)
       VALUES (?, ?, ?, 'healthkit', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        ipType,
        w.start,
        durationSeconds,
        w.distance ?? null,
        w.calories ?? null,
        externalId,
        new Date().toISOString(),
      ]
    );
    importedWorkouts++;
  }

  // Import body mass
  const weights = await queryBodyMass(since);
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

  await setLastSyncTimestamp(new Date().toISOString());

  return { importedWorkouts, importedWeights };
}

export async function writeCardioToHealthKit(session: {
  type: string;
  started_at: string;
  duration_seconds: number;
  distance_meters?: number | null;
  calories?: number | null;
}): Promise<void> {
  if (!isHealthKitAvailable()) return;
  if (!(await isHealthKitConnected())) return;

  try {
    const startDate = new Date(session.started_at);
    const endDate = new Date(startDate.getTime() + session.duration_seconds * 1000);

    await saveWorkout({
      type: session.type,
      startDate,
      endDate,
      durationMinutes: session.duration_seconds / 60,
      distanceMeters: session.distance_meters ?? undefined,
      calories: session.calories ?? undefined,
    });
  } catch (e) {
    console.warn("Failed to write cardio to HealthKit:", e);
  }
}

export async function writeWeightToHealthKit(
  weightKg: number,
  date: Date
): Promise<void> {
  if (!isHealthKitAvailable()) return;
  if (!(await isHealthKitConnected())) return;

  try {
    await saveWeight(weightKg, date);
  } catch (e) {
    console.warn("Failed to write weight to HealthKit:", e);
  }
}
