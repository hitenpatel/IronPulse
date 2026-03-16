"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Activity, Trophy, Users } from "lucide-react";

function getActivityIcon(type: string) {
  switch (type) {
    case "workout":
      return <Dumbbell className="h-5 w-5 text-blue-400" />;
    case "cardio":
      return <Activity className="h-5 w-5 text-green-400" />;
    case "pr":
      return <Trophy className="h-5 w-5 text-yellow-400" />;
    default:
      return <Activity className="h-5 w-5 text-muted-foreground" />;
  }
}

function getActivityText(type: string) {
  switch (type) {
    case "workout":
      return "completed a workout";
    case "cardio":
      return "finished a cardio session";
    case "pr":
      return "set a new personal record!";
    default:
      return "logged an activity";
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.social.feed.useInfiniteQuery(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    );

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Activity Feed</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No activity yet. Follow some users to see their workouts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className="mt-0.5 shrink-0">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {item.user.name ?? "Unknown"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {getActivityText(item.type)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(new Date(item.createdAt))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
