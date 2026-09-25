export interface DatabaseMigrationOptions {
  source: "ironpulse.db";
  destination: "zor.db";
  temporary: "zor.db.migrating";
  lock: "zor-database-migration.lock";
}

export interface DatabaseMigrationResult {
  databaseName: "zor.db";
  migrated: boolean;
  integrity: "ok";
  pendingUploadRows: number;
}

export interface DatabaseMigrationProgress {
  phase: "checkpoint" | "copy" | "validate" | "promote";
  bytesCopied: number;
  totalBytes: number;
}

export type ReadyDatabaseName = DatabaseMigrationResult["databaseName"];

export interface DatabaseFilesAdapter {
  ensureReady(
    options: DatabaseMigrationOptions,
    onProgress?: (progress: DatabaseMigrationProgress) => void,
  ): Promise<DatabaseMigrationResult>;
}

export const DATABASE_MIGRATION_OPTIONS: DatabaseMigrationOptions = {
  source: "ironpulse.db",
  destination: "zor.db",
  temporary: "zor.db.migrating",
  lock: "zor-database-migration.lock",
};

function loadNativeAdapter(): DatabaseFilesAdapter {
  // Delayed until startup so unit tests and unsupported Expo Go builds can
  // import the module without eagerly resolving native code.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../modules/zor-database-files").default as DatabaseFilesAdapter;
}

let readinessPromise: Promise<ReadyDatabaseName> | null = null;

export function ensureDatabaseReady(
  adapter: DatabaseFilesAdapter = loadNativeAdapter(),
  onProgress?: (progress: DatabaseMigrationProgress) => void,
): Promise<ReadyDatabaseName> {
  if (readinessPromise) return readinessPromise;

  const nativeResult = onProgress
    ? adapter.ensureReady(DATABASE_MIGRATION_OPTIONS, onProgress)
    : adapter.ensureReady(DATABASE_MIGRATION_OPTIONS);
  const attempt = nativeResult.then((result) => {
    if (result.databaseName !== "zor.db") throw new Error("database migration returned an unexpected filename");
    if (result.integrity !== "ok") throw new Error("database migration integrity validation failed");
    if (!Number.isInteger(result.pendingUploadRows) || result.pendingUploadRows < 0) {
      throw new Error("database migration returned an invalid pending upload count");
    }
    return result.databaseName;
  });

  readinessPromise = attempt.catch((error) => {
    readinessPromise = null;
    throw error;
  });
  return readinessPromise;
}

export function resetDatabaseReadinessForTests(): void {
  readinessPromise = null;
}
