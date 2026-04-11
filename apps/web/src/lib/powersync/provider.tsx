"use client";

import { Suspense, useEffect, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { useSession } from "next-auth/react";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [db, setDb] = useState<AbstractPowerSyncDatabase | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    async function init() {
      try {
        const { getPowerSyncDatabase } = await import("./system");
        const database = getPowerSyncDatabase();

        if (!mounted) return;
        setDb(database);

        // Only attempt sync connection if authenticated
        if (status === "authenticated" && session?.user) {
          try {
            const { BackendConnector } = await import("@ironpulse/sync");
            const connector = new BackendConnector();
            await database.connect(connector);
          } catch {
            // Sync server unavailable — local-only mode (queries still work)
            console.warn("[PowerSync] Sync server unavailable, running in local-only mode");
          }
        } else if (status === "unauthenticated") {
          await database.disconnect().catch(() => {});
        }
      } catch (err) {
        console.warn("[PowerSync] Failed to initialize:", err);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [status, session]);

  if (!db) return <>{children}</>;

  return (
    <Suspense fallback={children}>
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
}
