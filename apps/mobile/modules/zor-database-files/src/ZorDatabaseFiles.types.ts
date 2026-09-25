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
