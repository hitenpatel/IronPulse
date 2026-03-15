"use client";

import { useStatus } from "@powersync/react";

export function useSyncStatus() {
  const status = useStatus();
  return {
    connected: status.connected,
    lastSyncedAt: status.lastSyncedAt,
    hasSynced: status.hasSynced,
    uploading: status.dataFlowStatus?.uploading ?? false,
    downloading: status.dataFlowStatus?.downloading ?? false,
  };
}
