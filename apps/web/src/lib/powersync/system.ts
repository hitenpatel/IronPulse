import { PowerSyncDatabase, WASQLiteOpenFactory } from "@powersync/web";
import { AppSchema } from "@mettlelift/sync";

let dbInstance: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  const factory = new WASQLiteOpenFactory({
    dbFilename: "mettlelift.db",
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
