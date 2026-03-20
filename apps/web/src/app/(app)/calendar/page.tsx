"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, Activity } from "lucide-react";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  // ISO weekday: Mon=0 ... Sun=6
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function formatMonth(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

interface DayActivity {
  workouts: { id: string; name: string | null; durationSeconds: number | null }[];
  cardio: { id: string; type: string; durationSeconds: number }[];
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: workoutsData, isLoading: workoutsLoading } = useWorkouts();
  const { data: cardioData, isLoading: cardioLoading } = useCardioSessions();

  const isLoading = workoutsLoading || cardioLoading;

  // Group workouts and cardio by date key (YYYY-MM-DD)
  const days = useMemo(() => {
    const map: Record<string, DayActivity> = {};

    if (workoutsData) {
      for (const w of workoutsData) {
        const d = new Date(w.started_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map[key]) map[key] = { workouts: [], cardio: [] };
        map[key].workouts.push({
          id: w.id,
          name: w.name,
          durationSeconds: w.duration_seconds,
        });
      }
    }

    if (cardioData) {
      for (const c of cardioData) {
        const d = new Date(c.started_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map[key]) map[key] = { workouts: [], cardio: [] };
        map[key].cardio.push({
          id: c.id,
          type: c.type,
          durationSeconds: c.duration_seconds,
        });
      }
    }

    return map;
  }, [workoutsData, cardioData]);

  const cells = getMonthGrid(year, month);

  function prevMonth() {
    setSelectedDay(null);
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    setSelectedDay(null);
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function dateKey(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const selectedData = selectedDay ? days[dateKey(selectedDay)] : null;

  return (
    <div className="space-y-6">
      <h1 className="font-display font-semibold text-[28px] text-foreground">Calendar</h1>

      <Card className="bg-card border border-border p-4">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-display font-semibold text-[28px] text-foreground">{formatMonth(year, month)}</span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const key = dateKey(day);
            const activity = days[key];
            const hasWorkout = activity && activity.workouts.length > 0;
            const hasCardio = activity && activity.cardio.length > 0;
            const isToday = key === todayKey;
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-card font-semibold ring-2 ring-primary"
                      : "bg-card hover:bg-muted/50 border border-border-subtle"
                }`}
              >
                {day}
                {(hasWorkout || hasCardio) && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {hasWorkout && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        }`}
                      />
                    )}
                    {hasCardio && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected
                            ? "bg-primary-foreground/70"
                            : "bg-success"
                        }`}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="mt-4 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Workout
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Cardio
          </div>
        </div>
      </Card>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {new Date(year, month - 1, selectedDay).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>

          {!selectedData && (
            <p className="text-sm text-muted-foreground">No activity</p>
          )}

          {selectedData?.workouts.map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`}>
              <Card className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-colors hover:bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {w.name || "Workout"}
                  </p>
                  {w.durationSeconds != null && (
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(w.durationSeconds)}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}

          {selectedData?.cardio.map((c) => (
            <Link key={c.id} href={`/cardio/${c.id}`}>
              <Card className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg transition-colors hover:bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                  <Activity className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize truncate">
                    {capitalize(c.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(c.durationSeconds)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
