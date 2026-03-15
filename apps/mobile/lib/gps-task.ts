import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as SQLite from "expo-sqlite";
import { insertBufferPoint, initGpsBuffer } from "./gps-buffer";

export const GPS_TASK_NAME = "ironpulse-gps-tracking";

let bgDb: ReturnType<typeof SQLite.openDatabaseSync> | null = null;
let activeSessionId: string | null = null;

export function setActiveSessionId(id: string | null) { activeSessionId = id; }

/** Wraps expo-sqlite sync DB into the DbExecutor interface used by gps-buffer */
function wrapDb(db: ReturnType<typeof SQLite.openDatabaseSync>) {
  return {
    async execute(sql: string, params?: any[]) {
      // DDL / DML without results
      if (sql.trimStart().toUpperCase().startsWith("SELECT") || sql.trimStart().toUpperCase().startsWith("WITH")) {
        const rows = db.getAllSync(sql, ...(params ?? []));
        return { rows: { _array: rows } };
      }
      if (params && params.length > 0) {
        db.runSync(sql, ...params);
      } else {
        db.execSync(sql);
      }
      return { rows: { _array: [] } };
    },
  };
}

function getBackgroundDb() {
  if (!bgDb) { bgDb = SQLite.openDatabaseSync("ironpulse.db"); }
  return wrapDb(bgDb);
}

TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  if (error || !data || !activeSessionId) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const db = getBackgroundDb();
  await initGpsBuffer(db);
  for (const loc of locations) {
    await insertBufferPoint(db, activeSessionId, {
      latitude: loc.coords.latitude, longitude: loc.coords.longitude, altitude: loc.coords.altitude,
    }, new Date(loc.timestamp).toISOString());
  }
});

export async function startGpsTracking(sessionId: string): Promise<Location.LocationSubscription> {
  setActiveSessionId(sessionId);
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") throw new Error("Foreground location permission denied");
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus === "granted") {
    await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
      accuracy: Location.Accuracy.High, distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: "IronPulse", notificationBody: "Tracking your activity" },
    });
  }
  return await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
    () => {} // Foreground updates handled by tracking screen
  );
}

export async function stopGpsTracking(): Promise<void> {
  setActiveSessionId(null);
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
  if (isRegistered) await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
}
