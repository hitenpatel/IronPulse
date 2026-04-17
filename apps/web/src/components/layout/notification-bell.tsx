"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  collapsed?: boolean;
}

/**
 * Sidebar nav row showing the bell icon + live unread count. Clicking navigates
 * to /notifications. Polls every 30s — when the Redis pubsub-backed SSE stream
 * for notifications lands (rc.5 candidate), replace the poll with a subscription.
 */
export function NotificationBell({ collapsed = false }: NotificationBellProps) {
  const { data } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const count = data?.count ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      title={collapsed ? "Notifications" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-2 transition-colors",
        collapsed ? "justify-center w-10 mx-auto" : "w-full",
        "border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Bell className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <span className="truncate text-sm font-medium">Notifications</span>
      )}
      {count > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground",
            collapsed ? "absolute -right-1 -top-1" : "ml-auto",
          )}
          data-testid="unread-notification-badge"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
