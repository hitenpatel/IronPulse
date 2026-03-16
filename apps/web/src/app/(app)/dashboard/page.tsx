import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Greeting } from "@/components/dashboard/greeting";
import { QuickStart } from "@/components/dashboard/quick-start";
import { WeeklyStats } from "@/components/dashboard/weekly-stats";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StreakBadge } from "@/components/dashboard/streak-badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Greeting />
      <StreakBadge />
      <QuickStart />
      <Link
        href="/calendar"
        className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/50"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Calendar</span>
        <span className="ml-auto text-xs text-muted-foreground">View all activity</span>
      </Link>
      <WeeklyStats />
      <ActivityFeed />
    </div>
  );
}
