"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Activity, Trophy, Users } from "lucide-react";

const REACTIONS = [
  { type: "kudos", emoji: "👏", label: "Kudos" },
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "muscle", emoji: "💪", label: "Muscle" },
] as const;

type ReactionType = (typeof REACTIONS)[number]["type"];

function getActivityIcon(type: string) {
  switch (type) {
    case "workout":
      return <Dumbbell className="h-5 w-5 text-primary" />;
    case "cardio":
      return <Activity className="h-5 w-5 text-success" />;
    case "pr":
      return <Trophy className="h-5 w-5 text-pr-gold" />;
    default:
      return <Activity className="h-5 w-5 text-muted-foreground" />;
  }
}

function getActivityHref(type: string, referenceId: string | null): string | null {
  if (!referenceId) return null;
  switch (type) {
    case "workout":
      return `/workouts/${referenceId}`;
    case "pr":
      return `/share/pr/${referenceId}`;
    default:
      return null;
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

interface FeedItemReactionsProps {
  feedItemId: string;
  reactionCounts: Record<string, number>;
  myReactions: string[];
}

function FeedItemReactions({ feedItemId, reactionCounts, myReactions }: FeedItemReactionsProps) {
  const utils = trpc.useUtils();
  const toggleReaction = trpc.social.toggleReaction.useMutation({
    onMutate: async ({ feedItemId: itemId, type }) => {
      await utils.social.feed.cancel();
      const isActive = myReactions.includes(type);

      utils.social.feed.setInfiniteData({ limit: 20 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((item) => {
              if (item.id !== itemId) return item;
              const newCounts = { ...item.reactionCounts };
              const newMine = [...item.myReactions];
              if (isActive) {
                newCounts[type] = Math.max(0, (newCounts[type] ?? 0) - 1);
                const idx = newMine.indexOf(type);
                if (idx !== -1) newMine.splice(idx, 1);
              } else {
                newCounts[type] = (newCounts[type] ?? 0) + 1;
                newMine.push(type);
              }
              return { ...item, reactionCounts: newCounts, myReactions: newMine };
            }),
          })),
        };
      });
    },
    onSettled: () => {
      void utils.social.feed.invalidate();
    },
  });

  return (
    <div className="mt-3 flex items-center gap-2">
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = reactionCounts[type] ?? 0;
        const active = myReactions.includes(type);
        return (
          <button
            key={type}
            aria-label={`${label}${count > 0 ? ` (${count})` : ""}`}
            aria-pressed={active}
            onClick={() =>
              toggleReaction.mutate({ feedItemId, type: type as ReactionType })
            }
            disabled={toggleReaction.isPending}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

type WorkoutPreview = {
  workoutName: string | null;
  durationSeconds: number | null;
  topExercises: string[];
  totalVolumeKg: number;
  prCount: number;
};

type CardioPreview = {
  cardioType: string;
  durationSeconds: number;
  distanceMeters: number | null;
};

type PrPreview = {
  exerciseName: string;
  prType: string;
  value: number;
};

function WorkoutPreviewCard({ preview }: { preview: WorkoutPreview }) {
  return (
    <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-1.5">
      {preview.topExercises.length > 0 && (
        <p className="text-foreground font-medium">
          {preview.topExercises.join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        {preview.totalVolumeKg > 0 && (
          <span>{Math.round(preview.totalVolumeKg).toLocaleString()} kg volume</span>
        )}
        {preview.durationSeconds != null && (
          <span>{formatDuration(preview.durationSeconds)}</span>
        )}
        {preview.prCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-pr-gold/20 text-pr-gold border-0">
            {preview.prCount} PR{preview.prCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    </div>
  );
}

function CardioPreviewCard({ preview }: { preview: CardioPreview }) {
  return (
    <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-1">
      <p className="text-foreground font-medium capitalize">{preview.cardioType}</p>
      <div className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
        {preview.distanceMeters != null && (
          <span>{formatDistance(preview.distanceMeters)}</span>
        )}
        <span>{formatDuration(preview.durationSeconds)}</span>
      </div>
    </div>
  );
}

function PrPreviewCard({ preview }: { preview: PrPreview }) {
  return (
    <div className="mt-2 rounded-lg bg-pr-gold/10 border border-pr-gold/20 px-3 py-2 text-xs flex items-center gap-2">
      <Trophy className="h-3.5 w-3.5 text-pr-gold shrink-0" />
      <span className="font-medium text-foreground">{preview.exerciseName}</span>
      <span className="text-muted-foreground">
        {preview.prType === "1rm"
          ? `${preview.value} kg (1RM)`
          : preview.prType === "volume"
          ? `${Math.round(preview.value)} kg volume`
          : `${preview.value}`}
      </span>
    </div>
  );
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
    <div className="max-w-[640px] mx-auto space-y-6">
      <h1 className="font-display font-semibold text-[28px] text-foreground">Feed</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-5 flex flex-col items-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            No activity yet. Follow some users to see their workouts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const href = getActivityHref(item.type, item.referenceId);
            const isPr = item.type === "pr";

            const cardContent = (
              <div className={`bg-card rounded-lg border border-border p-5 transition-colors${href ? " hover:bg-muted/30" : ""}${isPr ? " border-t-2 border-t-pr-gold" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {item.user.avatarUrl ? (
                        <img
                          src={item.user.avatarUrl}
                          alt={item.user.name ?? "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {(item.user.name ?? "?")[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/users/${item.user.id}`}
                        className="font-semibold text-sm text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.user.name ?? "Unknown"}
                      </Link>
                      <span className="text-muted-foreground text-sm">
                        {getActivityText(item.type)}
                      </span>
                      {getActivityIcon(item.type)}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {timeAgo(new Date(item.createdAt))}
                    </p>
                    {item.workoutPreview && (
                      <WorkoutPreviewCard preview={item.workoutPreview} />
                    )}
                    {item.cardioPreview && (
                      <CardioPreviewCard preview={item.cardioPreview} />
                    )}
                    {item.prPreview && (
                      <PrPreviewCard preview={item.prPreview} />
                    )}
                    <FeedItemReactions
                      feedItemId={item.id}
                      reactionCounts={item.reactionCounts}
                      myReactions={item.myReactions}
                    />
                  </div>
                </div>
              </div>
            );

            return href ? (
              <Link key={item.id} href={href} className="block">
                {cardContent}
              </Link>
            ) : (
              <div key={item.id}>{cardContent}</div>
            );
          })}

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
