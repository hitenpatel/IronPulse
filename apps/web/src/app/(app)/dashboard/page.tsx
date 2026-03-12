import { Greeting } from "@/components/dashboard/greeting";
import { QuickStart } from "@/components/dashboard/quick-start";
import { WeeklyStats } from "@/components/dashboard/weekly-stats";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Greeting />
      <QuickStart />
      <WeeklyStats />
      <ActivityFeed />
    </div>
  );
}
