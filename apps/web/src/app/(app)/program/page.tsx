"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ClipboardList,
  Dumbbell,
  Calendar,
  Play,
  Moon,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCurrentDayOfWeek(): string {
  const jsDay = new Date().getDay(); // 0=Sun
  return DAYS[jsDay === 0 ? 6 : jsDay - 1];
}

/** Returns the date for a given week + dayOfWeek offset from startDate */
function getDayDate(startDate: Date, weekNum: number, dayIndex: number): Date {
  // Week 1 starts on startDate; dayIndex is 0=Mon … 6=Sun
  const weekOffset = (weekNum - 1) * 7;
  const d = new Date(startDate.getTime() + (weekOffset + dayIndex) * 24 * 60 * 60 * 1000);
  return d;
}

type DayStatus = "done" | "missed" | "today" | "upcoming" | "rest" | "empty";

export default function MyProgramPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.program.myAssignment.useQuery();
  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: (result) => {
      router.push(`/workouts/${result.workout.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">My Program</h1>
          <p className="text-muted-foreground">
            You don&apos;t have an assigned training program yet. Ask your coach
            to assign one, or browse coaches to find one.
          </p>
          <Button variant="outline" onClick={() => router.push("/coaches")}>
            Find a Coach
          </Button>
        </div>
      </div>
    );
  }

  const { program, coach, currentWeek, completedDays, adherencePct, startedAt } = data;
  const schedule = program.schedule;
  const today = getCurrentDayOfWeek();
  const programStartDate = new Date(startedAt);
  const now = new Date();

  const coachInitials = (coach.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleStartWorkout(templateId: string) {
    createWorkout.mutate({ templateId });
  }

  function getDayStatus(weekNum: number, day: string, dayIdx: number, cell: { templateId?: string; isRestDay?: boolean } | undefined): DayStatus {
    if (!cell) return "empty";
    if (cell.isRestDay) return "rest";
    if (!cell.templateId) return "empty";

    const weekKey = String(weekNum);
    const isDone = completedDays?.[weekKey]?.includes(day) ?? false;
    if (isDone) return "done";

    // Determine if today or in the past
    const dayDate = getDayDate(programStartDate, weekNum, dayIdx);
    const isCurrentWeek = weekNum === currentWeek;
    const isToday = isCurrentWeek && day === today;
    if (isToday) return "today";

    // If the day is in the past (before today's date)
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMidnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    if (dayMidnight < todayMidnight) return "missed";

    return "upcoming";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {coach.avatarUrl && <AvatarImage src={coach.avatarUrl} />}
            <AvatarFallback className="text-xs">{coachInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {coach.name}
          </span>
        </div>
      </div>

      {program.description && (
        <p className="text-sm text-muted-foreground">{program.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {program.durationWeeks} weeks
        </div>
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4" />
          Week {currentWeek} of {program.durationWeeks}
        </div>
        {adherencePct !== undefined && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              <span className="font-semibold text-foreground">{adherencePct}%</span> adherence
            </span>
          </div>
        )}
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {Array.from({ length: program.durationWeeks }, (_, i) => i + 1).map(
          (week) => (
            <a
              key={week}
              href={`#week-${week}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                week === currentWeek
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              W{week}
            </a>
          )
        )}
      </div>

      {/* Schedule grid */}
      {Array.from({ length: program.durationWeeks }, (_, i) => i + 1).map(
        (week) => {
          const weekKey = String(week);
          const weekSchedule = schedule[weekKey] ?? {};
          const isCurrentWeek = week === currentWeek;

          return (
            <Card
              key={week}
              id={`week-${week}`}
              className={isCurrentWeek ? "border-primary" : undefined}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Week {week}
                  {isCurrentWeek && (
                    <span className="ml-2 text-xs font-normal text-primary">
                      Current
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DAYS.map((day, dayIdx) => {
                  const cell = weekSchedule[day];
                  const status = getDayStatus(week, day, dayIdx, cell);
                  const isToday = status === "today";

                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors",
                        status === "done" && "border-green-500/40 bg-green-500/5",
                        status === "missed" && "border-destructive/30 bg-destructive/5",
                        isToday && "border-primary bg-primary/5",
                        status === "upcoming" && "opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "w-8 text-xs font-medium",
                            isToday
                              ? "text-primary"
                              : status === "done"
                              ? "text-green-600 dark:text-green-400"
                              : status === "missed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {DAY_LABELS[dayIdx]}
                        </span>
                        {status === "rest" ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Moon className="h-3.5 w-3.5" />
                            Rest Day
                          </div>
                        ) : cell?.templateName ? (
                          <span className={cn(
                            "text-sm font-medium",
                            status === "missed" && "text-muted-foreground line-through"
                          )}>
                            {cell.templateName}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {status === "done" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {status === "missed" && (
                          <XCircle className="h-4 w-4 text-destructive/70" />
                        )}
                        {status === "upcoming" && cell && !cell.isRestDay && cell.templateId && (
                          <Clock className="h-4 w-4 text-muted-foreground/50" />
                        )}
                        {(status === "today" || (status === "upcoming" && isCurrentWeek)) &&
                          cell && !cell.isRestDay && cell.templateId && (
                          <Button
                            size="sm"
                            variant={isToday ? "default" : "outline"}
                            className="h-7 gap-1 text-xs"
                            disabled={createWorkout.isPending}
                            onClick={() => handleStartWorkout(cell.templateId!)}
                          >
                            <Play className="h-3 w-3" />
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        }
      )}
    </div>
  );
}
