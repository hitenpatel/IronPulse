"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  Dumbbell,
  Heart,
  MessageSquare,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo } from "react";

function iconFor(type: string) {
  switch (type) {
    case "follow":
      return UserPlus;
    case "reaction":
      return Heart;
    case "message":
      return MessageSquare;
    case "pr":
      return Trophy;
    case "workout_complete":
      return Dumbbell;
    case "goal_complete":
      return Target;
    case "achievement":
      return Trophy;
    case "coach_activity":
      return Users;
    default:
      return Bell;
  }
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notification.list.useQuery({ limit: 50 });
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const deleteNotif = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.readAt == null).length,
    [notifications],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No notifications yet. Interactions and achievements will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = iconFor(n.type);
            const isUnread = n.readAt == null;
            const content = (
              <div
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  isUnread
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                    isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        markRead.mutate({ id: n.id });
                      }}
                      aria-label="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteNotif.mutate({ id: n.id });
                    }}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );

            return n.linkPath ? (
              <Link
                key={n.id}
                href={n.linkPath}
                onClick={() => {
                  if (isUnread) markRead.mutate({ id: n.id });
                }}
              >
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
