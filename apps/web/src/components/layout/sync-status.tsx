"use client";

import { useSyncStatus } from "@ironpulse/sync";
import { useDataMode } from "@/hooks/use-data-mode";
import { Wifi, WifiOff, RefreshCw, Cloud } from "lucide-react";

function formatLastSync(date: Date | undefined): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function SyncStatus() {
  const dataMode = useDataMode();
  const { connected, uploading, downloading, lastSyncedAt, hasSynced } = useSyncStatus();

  // tRPC-only mode — no PowerSync
  if (dataMode === "trpc") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-500" title="Online mode (direct API)">
        <Cloud className="h-3 w-3" />
        <span>Online</span>
      </div>
    );
  }

  if (uploading || downloading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>{uploading ? "Uploading..." : "Syncing..."}</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-500" title="Working offline — changes will sync when reconnected">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  const lastSync = hasSynced ? formatLastSync(lastSyncedAt) : "";

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500" title={lastSync ? `Last sync: ${lastSync}` : "Connected"}>
      <Wifi className="h-3 w-3" />
      <span>Synced{lastSync && <span className="ml-1 text-muted-foreground">{lastSync}</span>}</span>
    </div>
  );
}
