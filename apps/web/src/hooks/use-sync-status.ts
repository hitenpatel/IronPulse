"use client";

import { useContext } from "react";
import { PowerSyncContext, useStatus } from "@powersync/react";

export function useSyncStatus() {
  const db = useContext(PowerSyncContext);

  // Return safe defaults when PowerSync is not yet initialized
  if (!db) {
    return {
      connected: false,
      lastSyncedAt: undefined,
      hasSynced: false,
      uploading: false,
      downloading: false,
    };
  }

  const status = useStatus();
  return {
    connected: status.connected,
    lastSyncedAt: status.lastSyncedAt,
    hasSynced: status.hasSynced,
    uploading: status.dataFlowStatus?.uploading ?? false,
    downloading: status.dataFlowStatus?.downloading ?? false,
  };
}
