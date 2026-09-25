import { requireNativeModule } from "expo-modules-core";

import type {
  DatabaseMigrationOptions,
  DatabaseMigrationProgress,
  DatabaseMigrationResult,
} from "./ZorDatabaseFiles.types";

type ProgressSubscription = { remove(): void };

interface NativeDatabaseFilesModule {
  ensureReady(options: DatabaseMigrationOptions): Promise<DatabaseMigrationResult>;
  addListener(
    eventName: "onDatabaseMigrationProgress",
    listener: (event: DatabaseMigrationProgress) => void,
  ): ProgressSubscription;
}

const nativeModule = requireNativeModule<NativeDatabaseFilesModule>("ZorDatabaseFiles");

export default {
  async ensureReady(
    options: DatabaseMigrationOptions,
    onProgress?: (event: DatabaseMigrationProgress) => void,
  ): Promise<DatabaseMigrationResult> {
    const subscription = onProgress
      ? nativeModule.addListener("onDatabaseMigrationProgress", onProgress)
      : null;
    try {
      return await nativeModule.ensureReady(options);
    } finally {
      subscription?.remove();
    }
  },
};
