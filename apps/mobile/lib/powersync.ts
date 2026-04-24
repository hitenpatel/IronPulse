import { AppSchema, BackendConnector } from "@ironpulse/sync";
import * as SecureStore from "@/lib/secure-store";

import { Config } from "./config";
import { captureError } from "./telemetry";

const API_URL = Config.API_URL;

interface PowerSyncHandle {
  // Loose because PowerSync's typed handle differs between versions and
  // between real-device + Expo Go. Consumers only use the subset we expose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  /** True when initialisation failed and we're running against the mock stub. */
  isFallback: boolean;
}

let handle: PowerSyncHandle | null = null;
const fallbackListeners = new Set<(inFallback: boolean) => void>();

/**
 * Lazy-initialised PowerSync database handle.
 *
 * If the native module isn't available (Expo Go dev, Maestro E2E builds,
 * or a genuinely broken install) we fall back to an in-memory no-op stub.
 * The fallback keeps the UI mounted so users can still see cached screens,
 * but screens that rely on PowerSync data will render empty. Consumers can
 * detect the fallback state via `isPowerSyncFallback()` and surface a
 * "Sync paused" banner.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPowerSyncDatabase(): any {
  if (handle) return handle.db;

  try {
    const { PowerSyncDatabase } = require("@powersync/react-native");
    const db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: "ironpulse.db" },
    });
    // Route ongoing sync errors to Sentry. Different PowerSync versions
    // expose different hooks, so defensively feature-detect rather than
    // assuming a specific API surface.
    const maybeOn = (db as { on?: (event: string, cb: (e: unknown) => void) => void }).on;
    if (typeof maybeOn === "function") {
      maybeOn.call(db, "error", (syncErr: unknown) => {
        captureError(syncErr, { source: "powersync.sync" });
      });
    }
    handle = { db, isFallback: false };
  } catch (err) {
    captureError(err, { source: "powersync.init" });
    handle = {
      db: {
        connect: async () => {},
        disconnect: async () => {},
        execute: async () => ({ rows: { _array: [] } }),
      },
      isFallback: true,
    };
    for (const listener of fallbackListeners) listener(true);
  }

  return handle.db;
}

/**
 * True when PowerSync failed to initialise and the app is running against
 * the in-memory stub. Dashboards + sync-indicator components use this to
 * tell the user their data isn't syncing, rather than silently showing
 * empty state.
 */
export function isPowerSyncFallback(): boolean {
  return handle?.isFallback ?? false;
}

/**
 * Subscribe to transitions into PowerSync-fallback mode. The listener is
 * called once with `true` at most (init only runs once per app boot), so
 * consumers typically combine this with `isPowerSyncFallback()` to handle
 * the case where the failure happened before the subscription.
 */
export function onPowerSyncFallback(
  listener: (inFallback: boolean) => void,
): () => void {
  fallbackListeners.add(listener);
  return () => {
    fallbackListeners.delete(listener);
  };
}

export function createMobileConnector(): BackendConnector {
  return new BackendConnector({
    baseUrl: API_URL,
    getAuthToken: () => SecureStore.getItemAsync("auth-token"),
  });
}
