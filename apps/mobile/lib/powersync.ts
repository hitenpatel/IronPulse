import { AppSchema, BackendConnector } from "@ironpulse/sync";
import * as SecureStore from "@/lib/secure-store";

import { Config } from "./config";

const API_URL = Config.API_URL;

let dbInstance: any = null;

export function getPowerSyncDatabase(): any {
  if (dbInstance) return dbInstance;

  try {
    const { PowerSyncDatabase } = require("@powersync/react-native");
    dbInstance = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: "ironpulse.db" },
    });
  } catch (err) {
    console.warn("PowerSync not available:", err);
    // Return a mock that doesn't crash
    dbInstance = {
      connect: async () => {},
      disconnect: async () => {},
      execute: async () => ({ rows: { _array: [] } }),
    };
  }

  return dbInstance;
}

export function createMobileConnector(): BackendConnector {
  return new BackendConnector({
    baseUrl: API_URL,
    getAuthToken: () => SecureStore.getItemAsync("auth-token"),
  });
}
