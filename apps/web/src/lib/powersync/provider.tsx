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
      const { getPowerSyncDatabase } = await import("./system");
      const { BackendConnector } = await import("@ironpulse/sync");
      const database = getPowerSyncDatabase();

      if (!mounted) return;
      setDb(database);

      if (status === "authenticated" && session?.user) {
        const connector = new BackendConnector();
        await database.connect(connector);
      } else if (status === "unauthenticated") {
        await database.disconnect();
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [status, session]);

  // Always provide the PowerSync context — even if db is null during init,
  // pages that use usePowerSync() need a non-null value to avoid crashes.
  // When db is null, provide a stub that returns empty results.
  const value = db ?? ({
    execute: async () => ({ rows: { _array: [], length: 0, item: () => null } }),
    getAll: async () => [],
    get: async () => null,
    getOptional: async () => null,
    watch: () => ({ [Symbol.asyncIterator]: async function* () {} }),
    connect: async () => {},
    disconnect: async () => {},
    connected: false,
    currentStatus: { connected: false, dataFlowStatus: { downloading: false, uploading: false } },
  } as unknown as AbstractPowerSyncDatabase);

  return (
    <Suspense fallback={children}>
      <PowerSyncContext.Provider value={value}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
}
