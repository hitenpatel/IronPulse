import { PowerSyncDatabase, WASQLiteOpenFactory } from "@powersync/web";
import { AppSchema } from "@ironpulse/sync";

let dbInstance: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  const factory = new WASQLiteOpenFactory({
    dbFilename: "ironpulse.db",
    flags: {
      enableMultiTabs: typeof SharedWorker !== "undefined",
    },
  });

  dbInstance = new PowerSyncDatabase({
    database: factory,
    schema: AppSchema,
    flags: { disableSSRWarning: true },
  });

  return dbInstance;
}
