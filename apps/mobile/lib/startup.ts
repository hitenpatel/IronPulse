import { hydrateServerUrl } from "./server";
import {
  ensureDatabaseReady,
  type DatabaseMigrationProgress,
} from "./database-readiness";

/** Completes fail-closed origin preparation before app consumers mount. */
export async function prepareOriginStartup(): Promise<void> {
  await hydrateServerUrl();
}

/** Prepares all local identity-sensitive state in strict dependency order. */
export async function prepareAppStartup(
  onProgress?: (progress: DatabaseMigrationProgress) => void,
) {
  await prepareOriginStartup();
  const databaseName = await ensureDatabaseReady(undefined, onProgress);
  return { databaseName };
}
