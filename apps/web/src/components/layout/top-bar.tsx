"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Breadcrumb helpers
// ---------------------------------------------------------------------------

interface Crumb {
  label: string;
  href?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  workouts: "Workouts",
  cardio: "Cardio",
  calendar: "Calendar",
  exercises: "Exercises",
  templates: "Templates",
  program: "My Program",
  stats: "Stats",
  body: "Body Metrics",
  feed: "Feed",
  messages: "Messages",
  tools: "Tools",
  "1rm": "1RM Calculator",
  plates: "Plate Calculator",
  settings: "Settings",
  profile: "Profile",
  coaches: "Find a Coach",
  achievements: "Achievements",
  users: "Users",
  coach: "Coach",
  clients: "Clients",
  programs: "Programs",
  integrations: "Integrations",
  import: "Import",
  security: "Security",
  new: "New",
  media: "Media",
};

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);

  // Single segment — just the page name, no "Home /" prefix clutter
  if (segments.length === 0) return [{ label: "Dashboard" }];

  const crumbs: Crumb[] = [];
  let accHref = "";

  segments.forEach((seg, i) => {
    accHref += `/${seg}`;
    const isLast = i === segments.length - 1;
    // Dynamic segments (IDs) — show generic label
    const isDynamic = /^[a-f0-9-]{8,}$/.test(seg) || /^\d+$/.test(seg);
    const label = isDynamic ? "Detail" : (ROUTE_LABELS[seg] ?? capitalize(seg));
    crumbs.push(isLast ? { label } : { label, href: accHref });
  });

  return crumbs;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Notification bell (stub — hook into real data when available)
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  count?: number;
}

function NotificationBell({ count = 0 }: NotificationBellProps) {
  return (
    <button
      data-testid="notification-bell"
      aria-label={count > 0 ? `${count} notifications` : "Notifications"}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-live="polite"
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold text-primary-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Cmd-K search hint badge
// ---------------------------------------------------------------------------

function SearchHint() {
  return (
    <div
      role="button"
      data-testid="search-trigger"
      aria-label="Search (Command+K)"
      tabIndex={0}
      className="hidden items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground md:flex"
    >
      <span>Search</span>
      <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

interface TopBarProps {
  notificationCount?: number;
  className?: string;
}

export function TopBar({ notificationCount = 0, className }: TopBarProps) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border-subtle bg-background px-6",
        className
      )}
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-muted-foreground/50" aria-hidden>
                  /
                </span>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* SearchHint triggers the GlobalSearch dialog via Cmd+K */}
        <SearchHint />
        {/* GlobalSearch renders its own trigger button + dialog */}
        <GlobalSearch />
        <NotificationBell count={notificationCount} />
      </div>
    </header>
  );
}
