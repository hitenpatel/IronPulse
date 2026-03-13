"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatRelativeDate,
} from "@/lib/format";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function SessionSkeleton() {
  return (
    <Card className="animate-pulse p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-40 rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}

export default function CardioHistoryPage() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    trpc.cardio.list.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    );

  const sessions = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cardio</h1>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SessionSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">No cardio sessions yet</p>
          <Link href="/cardio/new">
            <Button variant="link" className="mt-2">
              Log your first session
            </Button>
          </Link>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/cardio/${session.id}`}>
              <Card className="p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                    <Activity className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {capitalize(session.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(new Date(session.startedAt))}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-3 text-sm text-muted-foreground">
                      <span>{formatDuration(session.durationSeconds)}</span>
                      {session.distanceMeters != null &&
                        Number(session.distanceMeters) > 0 && (
                          <span>{formatDistance(Number(session.distanceMeters))}</span>
                        )}
                      {session.distanceMeters != null &&
                        Number(session.distanceMeters) > 0 &&
                        session.durationSeconds > 0 && (
                          <span>
                            {formatPace(
                              Number(session.distanceMeters),
                              session.durationSeconds
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
