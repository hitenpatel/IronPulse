import { PowerSyncDatabase } from "@powersync/react-native";
import { AppSchema, BackendConnector } from "@ironpulse/sync";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

let dbInstance: PowerSyncDatabase | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  dbInstance = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: "ironpulse.db" },
  });

  return dbInstance;
}

export function createMobileConnector(): BackendConnector {
  return new BackendConnector({
    baseUrl: API_URL,
    getAuthToken: () => SecureStore.getItemAsync("auth-token"),
  });
}
