import { AppSchema, BackendConnector } from "@ironpulse/sync";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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
