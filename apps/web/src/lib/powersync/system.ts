import { PowerSyncDatabase, WASQLiteOpenFactory } from "@powersync/web";
import { AppSchema } from "@ironpulse/sync";

let dbInstance: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  const factory = new WASQLiteOpenFactory({
    dbFilename: "ironpulse.db",
    worker: "/@powersync/worker/WASQLiteDB.umd.js",
    flags: {
      enableMultiTabs: typeof SharedWorker !== "undefined",
    },
  });

  dbInstance = new PowerSyncDatabase({
    database: factory,
    schema: AppSchema,
    flags: { disableSSRWarning: true },
    sync: {
      worker: "/@powersync/worker/SharedSyncImplementation.umd.js",
    },
  });

  return dbInstance;
}
