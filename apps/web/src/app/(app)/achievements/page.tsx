"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ACHIEVEMENT_CATALOG, type AchievementBadge } from "@ironpulse/shared";
import { Lock, Trophy } from "lucide-react";

function BadgeCard({
  badge,
  unlockedAt,
}: {
  badge: AchievementBadge;
  unlockedAt: Date | null;
}) {
  const unlocked = unlockedAt !== null;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-colors",
        unlocked
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-3xl",
          unlocked ? "bg-primary/10" : "bg-muted"
        )}
      >
        {unlocked ? (
          badge.emoji
        ) : (
          <Lock className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div>
        <p
          className={cn(
            "text-sm font-semibold",
            unlocked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {badge.label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
      </div>

      {unlocked && unlockedAt && (
        <p className="text-xs text-primary">
          Unlocked{" "}
          {unlockedAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

export default function AchievementsPage() {
  const { data, isLoading, refetch } = trpc.achievement.list.useQuery();
  const checkMine = trpc.achievement.checkMine.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  const checkedRef = useRef(false);

  // Retroactive unlock pass for users who qualified before this build landed.
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkMine.mutate();
  }, [checkMine]);

  const unlockedMap = new Map<string, Date>(
    (data?.achievements ?? []).map((a) => [a.type, new Date(a.unlockedAt)])
  );

  const unlockedCount = unlockedMap.size;
  const totalCount = ACHIEVEMENT_CATALOG.length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${unlockedCount} of ${totalCount} unlocked`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: isLoading ? "0%" : `${(unlockedCount / totalCount) * 100}%`,
          }}
        />
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ACHIEVEMENT_CATALOG.map((badge) => (
          <BadgeCard
            key={badge.type}
            badge={badge}
            unlockedAt={unlockedMap.get(badge.type) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
