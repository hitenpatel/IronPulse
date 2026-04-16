/**
 * Drop-in replacement for expo-sqlite.
 *
 * Provides the openDatabaseSync API surface used in gps-task.ts.
 * This is a stub — queries will return empty results.
 * Replace with react-native-quick-sqlite or op-sqlite when linked.
 */

export interface SQLiteDatabase {
  getAllSync(sql: string, ...params: any[]): any[];
  runSync(sql: string, ...params: any[]): void;
  execSync(sql: string): void;
}

export function openDatabaseSync(_name: string): SQLiteDatabase {
  console.warn(
    "[sqlite stub] openDatabaseSync is a stub — install op-sqlite or react-native-quick-sqlite",
  );
  return {
    getAllSync(_sql: string, ..._params: any[]): any[] {
      return [];
    },
    runSync(_sql: string, ..._params: any[]): void {
      // No-op
    },
    execSync(_sql: string): void {
      // No-op
    },
  };
}
