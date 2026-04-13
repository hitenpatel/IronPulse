"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { useSession } from "next-auth/react";
import { DataModeContext } from "@/hooks/use-data-mode";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [db, setDb] = useState<AbstractPowerSyncDatabase | null>(null);
  const [skipped, setSkipped] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const isSecure = window.isSecureContext;
      if (!isSecure) {
        console.warn("[PowerSync] Skipping — insecure context (use HTTPS or localhost)");
        setSkipped(true);
        return;
      }

      // If no PowerSync URL is configured, skip entirely
      const psUrl = process.env.NEXT_PUBLIC_POWERSYNC_URL;
      if (!psUrl) {
        console.warn("[PowerSync] Skipping — no NEXT_PUBLIC_POWERSYNC_URL configured");
        setSkipped(true);
        return;
      }

      // Verify the sync server is reachable before loading WASM
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        await fetch(psUrl, { signal: controller.signal });
        clearTimeout(timer);
      } catch {
        console.warn("[PowerSync] Skipping — sync server unreachable at", psUrl);
        setSkipped(true);
        return;
      }

      try {
        // Race against a timeout — if WASM init takes too long, fall back to tRPC
        const result = await Promise.race([
          import("./system").then(({ getPowerSyncDatabase }) => getPowerSyncDatabase()),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (result) {
          setDb(result);
        } else {
          console.warn("[PowerSync] Init timed out — falling back to tRPC");
          setSkipped(true);
        }
      } catch (err) {
        console.warn("[PowerSync] Failed to initialize:", err);
        setSkipped(true);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!db) return;
    const psUrl = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (psUrl && status === "authenticated") {
      import("@ironpulse/sync")
        .then(({ BackendConnector }) => db.connect(new BackendConnector()))
        .catch(() => console.warn("[PowerSync] Sync server unavailable"));
    } else if (status === "unauthenticated") {
      db.disconnect().catch(() => {});
    }
  }, [db, status]);

  // PowerSync unavailable — render in tRPC mode
  if (skipped) {
    return (
      <DataModeContext.Provider value="trpc">
        {children}
      </DataModeContext.Provider>
    );
  }

  // Still initializing
  if (!db) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#060B14" }}>
        <p style={{ color: "#8899B4", fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  // PowerSync available
  return (
    <DataModeContext.Provider value="powersync">
      <Suspense fallback={children}>
        <PowerSyncContext.Provider value={db}>
          {children}
        </PowerSyncContext.Provider>
      </Suspense>
    </DataModeContext.Provider>
  );
}
