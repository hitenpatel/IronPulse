"use client";

import { useContext } from "react";
import { PowerSyncContext } from "@powersync/react";

/**
 * Safe version of usePowerSync that returns null when PowerSync
 * is unavailable (insecure context, not initialized, etc.)
 * instead of throwing an error.
 */
export function usePowerSyncSafe() {
  return useContext(PowerSyncContext) ?? null;
}
