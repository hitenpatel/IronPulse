"use client";

import { useState } from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { NewSessionSheet } from "./new-session-sheet";
import { SyncStatus } from "./sync-status";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile bottom nav */}
      <BottomNav onFabClick={() => setSheetOpen(true)} />

      <NewSessionSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      {/*
        Main content area.
        On desktop: offset by the sidebar width (260px).
        The sidebar manages its own collapsed state internally; when it collapses
        to 64px (w-16) the offset needs to match. We use a CSS variable approach
        via a sibling selector trick — simpler alternative is just to fix at
        260px for now and let users have the space. Collapsed mode adds a
        data-collapsed attribute on the aside which we can hook here if needed.
      */}
      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        {/* Top bar — desktop only */}
        <div className="hidden lg:block">
          <TopBar />
        </div>

        <main id="main-content" className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto max-w-[1280px] p-4 lg:p-8">
            <div className="mb-4 flex justify-end">
              <SyncStatus />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
