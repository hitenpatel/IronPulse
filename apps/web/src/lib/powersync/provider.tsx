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

  if (!db) return <>{children}</>;

  return (
    <Suspense fallback={children}>
      <PowerSyncContext.Provider value={db}>
        {children}
      </PowerSyncContext.Provider>
    </Suspense>
  );
}
