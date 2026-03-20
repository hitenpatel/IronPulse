"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { NewSessionSheet } from "./new-session-sheet";
import { SyncStatus } from "./sync-status";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [navSheetOpen, setNavSheetOpen] = useState(false);

  // Sidebar collapsed state is lifted here so the content area padding
  // can respond: collapsed → w-16 (64px), expanded → w-[260px].
  // Default: auto-collapse at lg (1024–1279px), expanded at xl (≥1280px).
  // We default to false (expanded) for SSR; the first client render on a
  // 1024–1279px viewport will start expanded and the user can collapse manually,
  // which is acceptable — a hard default-collapsed on SSR would cause hydration
  // mismatch since we cannot read window.innerWidth server-side.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — hidden below lg (1024px) */}
      <nav aria-label="Main navigation" className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </nav>

      {/* Tablet slide-over nav (768–1023px) — rendered as a Sheet */}
      <Sheet open={navSheetOpen} onOpenChange={setNavSheetOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Mobile bottom nav — hidden at md (≥768px) per spec */}
      <BottomNav onFabClick={() => setSheetOpen(true)} />

      <NewSessionSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      {/*
        Main content area.
        lg: offset matches the sidebar width (collapsed = 64px, expanded = 260px).
        Below lg: no offset (sidebar hidden, bottom nav or hamburger used instead).
      */}
      <div
        className={cn(
          "flex min-h-screen flex-col",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-[260px]"
        )}
      >
        {/* Top bar — visible at lg+. At md (tablet) we show a compact bar with hamburger. */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border-subtle bg-background px-4 lg:hidden md:flex hidden">
          <button
            aria-label="Open navigation"
            onClick={() => setNavSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-display text-base font-bold tracking-tight text-foreground">
            IronPulse
          </span>
        </header>

        <header className="hidden lg:block">
          <TopBar />
        </header>

        <main id="main-content" className="flex-1 pb-20 md:pb-0 lg:pb-0">
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
