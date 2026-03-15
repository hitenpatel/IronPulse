"use client";

import { Dumbbell, Activity, Weight, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useWorkouts } from "@/hooks/use-workouts";
import { useCardioSessions } from "@/hooks/use-cardio-sessions";
import { formatVolume } from "@/lib/format";

function getISOWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className={`h-5 w-5 ${color}`} />
      {loading ? (
        <div className="h-7 w-10 animate-pulse rounded bg-muted" />
      ) : (
        <span className="text-lg font-bold">{value}</span>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function WeeklyStats() {
  const { start, end } = getISOWeekBounds();

  const workouts = useWorkouts();
  const cardio = useCardioSessions();
  const volume = trpc.analytics.weeklyVolume.useQuery({ weeks: 1 });

  const workoutCount =
    workouts.data?.filter((w) => {
      if (!w.completed_at) return false;
      const d = new Date(w.completed_at);
      return d >= start && d <= end;
    }).length ?? 0;

  const cardioCount =
    cardio.data?.filter((c) => {
      const d = new Date(c.started_at);
      return d >= start && d <= end;
    }).length ?? 0;

  const totalVolume =
    volume.data?.data.reduce((sum, row) => sum + row.totalVolume, 0) ?? 0;

  const isLoading = workouts.isLoading || cardio.isLoading || volume.isLoading;

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-2 min-[375px]:grid-cols-4 min-[375px]:gap-4">
        <StatItem
          icon={Dumbbell}
          label="Workouts"
          value={String(workoutCount)}
          color="text-primary"
          loading={isLoading}
        />
        <StatItem
          icon={Activity}
          label="Cardio"
          value={String(cardioCount)}
          color="text-secondary"
          loading={isLoading}
        />
        <StatItem
          icon={Weight}
          label="Volume"
          value={formatVolume(totalVolume)}
          color="text-accent"
          loading={isLoading}
        />
        <StatItem
          icon={Trophy}
          label="PRs"
          value="0"
          color="text-warning"
          loading={isLoading}
        />
      </div>
    </Card>
  );
}
