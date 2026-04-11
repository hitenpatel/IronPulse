"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { useSession } from "next-auth/react";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [db, setDb] = useState<AbstractPowerSyncDatabase | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        const { getPowerSyncDatabase } = await import("./system");
        const database = getPowerSyncDatabase();
        setDb(database);
      } catch (err) {
        console.warn("[PowerSync] Failed to initialize:", err);
      }
    }

    init();
  }, []);

  // Handle sync connection separately, only when auth status changes
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

  if (!db) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#060B14" }}>
        <p style={{ color: "#8899B4", fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={children}>
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
}
