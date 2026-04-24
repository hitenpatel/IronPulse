import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  isPowerSyncFallback,
  onPowerSyncFallback,
} from "@/lib/powersync";

// Try to import PowerSync status — falls back to defaults if not available
let useSyncStatusHook: () => {
  connected: boolean;
  uploading: boolean;
  downloading: boolean;
};

try {
  const sync = require("@ironpulse/sync");
  useSyncStatusHook = sync.useSyncStatus;
} catch {
  useSyncStatusHook = () => ({ connected: true, uploading: false, downloading: false });
}

export function SyncIndicator() {
  const { connected, uploading, downloading } = useSyncStatusHook();
  const [fallback, setFallback] = useState(() => isPowerSyncFallback());

  useEffect(() => onPowerSyncFallback(setFallback), []);

  const isActive = uploading || downloading;

  let color = "#22c55e"; // green — synced
  let label = "Synced";

  if (fallback) {
    // PowerSync failed to initialise → data is stale/empty. Surface the
    // state loudly so users know the dashboard isn't authoritative.
    color = "#f43f5e"; // red — sync paused
    label = "Sync paused";
  } else if (!connected) {
    color = "#eab308"; // amber — offline
    label = "Offline";
  } else if (isActive) {
    color = "#3b82f6"; // blue — syncing
    label = uploading ? "Uploading" : "Syncing";
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
