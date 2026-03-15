"use client";

import { useSyncStatus } from "@ironpulse/sync";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function SyncStatus() {
  const { connected, uploading, downloading } = useSyncStatus();

  if (uploading || downloading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-500">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500">
      <Wifi className="h-3 w-3" />
      <span>Synced</span>
    </div>
  );
}
