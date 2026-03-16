"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

export function StreakBadge() {
  const { data, isLoading } = trpc.analytics.streak.useQuery();

  if (isLoading || !data) return null;
  if (data.current === 0 && data.longest === 0) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <Flame className="h-6 w-6 text-orange-500" />
        <div>
          <p className="text-lg font-bold">{data.current} day streak</p>
          <p className="text-sm text-muted-foreground">
            Longest: {data.longest} days
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
