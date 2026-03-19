"use client";

import { useState } from "react";
import { BottomNav } from "./bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { NewSessionSheet } from "./new-session-sheet";
import { SyncStatus } from "./sync-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav onNewSession={() => setSheetOpen(true)} />
      <BottomNav onFabClick={() => setSheetOpen(true)} />
      <NewSessionSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Main content: offset by sidebar on desktop, padding for bottom nav on mobile */}
      <main id="main-content" className="pb-20 lg:pl-16 lg:pb-0">
        <div className="mx-auto max-w-screen-sm px-4 py-6">
          <div className="mb-4 flex justify-end"><SyncStatus /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
