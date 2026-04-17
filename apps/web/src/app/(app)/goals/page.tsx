"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Plus,
  Trash2,
  Dumbbell,
  Activity,
  Scale,
  Calendar,
  Check,
  Trophy,
} from "lucide-react";

type GoalType = "body_weight" | "exercise_pr" | "weekly_workouts" | "cardio_distance";
type GoalUnit = "kg" | "lb" | "count" | "km" | "mi";

const GOAL_TYPES: { value: GoalType; label: string; icon: React.ElementType; defaultUnit: GoalUnit }[] = [
  { value: "body_weight", label: "Body Weight", icon: Scale, defaultUnit: "kg" },
  { value: "exercise_pr", label: "Exercise PR", icon: Dumbbell, defaultUnit: "kg" },
  { value: "weekly_workouts", label: "Weekly Workouts", icon: Calendar, defaultUnit: "count" },
  { value: "cardio_distance", label: "Cardio Distance", icon: Activity, defaultUnit: "km" },
];

const UNITS_FOR_TYPE: Record<GoalType, GoalUnit[]> = {
  body_weight: ["kg", "lb"],
  exercise_pr: ["kg", "lb"],
  weekly_workouts: ["count"],
  cardio_distance: ["km", "mi"],
};

export default function GoalsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.goal.list.useQuery({});
  const { data: exercisesData } = trpc.exercise.list.useQuery({ limit: 200 });

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<GoalType>("body_weight");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startValue, setStartValue] = useState("");
  const [unit, setUnit] = useState<GoalUnit>("kg");
  const [exerciseId, setExerciseId] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const createGoal = trpc.goal.create.useMutation({
    onSuccess: () => {
      utils.goal.list.invalidate();
      setShowForm(false);
      setTitle("");
      setTargetValue("");
      setStartValue("");
      setExerciseId("");
      setTargetDate("");
    },
  });

  const updateGoal = trpc.goal.update.useMutation({
    onSuccess: () => utils.goal.list.invalidate(),
  });

  const deleteGoal = trpc.goal.delete.useMutation({
    onSuccess: () => utils.goal.list.invalidate(),
  });

  const goals = data?.goals ?? [];
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  function handleTypeChange(newType: GoalType) {
    setType(newType);
    setUnit(UNITS_FOR_TYPE[newType][0]);
    if (newType !== "exercise_pr") setExerciseId("");
  }

  function handleCreate() {
    if (!title.trim() || !targetValue) return;
    createGoal.mutate({
      type,
      title: title.trim(),
      targetValue: Number(targetValue),
      ...(startValue !== "" && { startValue: Number(startValue) }),
      unit,
      ...(type === "exercise_pr" && exerciseId && { exerciseId }),
      ...(targetDate && { targetDate: new Date(targetDate) }),
    });
  }

  function iconFor(t: string) {
    const match = GOAL_TYPES.find((gt) => gt.value === t);
    return match?.icon ?? Target;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Goals</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" />
          New Goal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GOAL_TYPES.map((gt) => (
                  <button
                    key={gt.value}
                    type="button"
                    onClick={() => handleTypeChange(gt.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      type === gt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <gt.icon className="h-4 w-4" />
                    <span>{gt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Goal title (e.g. Lose 10kg by summer)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {type === "exercise_pr" && (
              <select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select exercise —</option>
                {exercisesData?.data.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Target</label>
                <Input
                  type="number"
                  step="0.1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start (optional)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as GoalUnit)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {UNITS_FOR_TYPE[type].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Target date (optional)</label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={createGoal.isPending || !title.trim() || !targetValue}
              >
                {createGoal.isPending ? "Creating…" : "Create Goal"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No goals yet. Set a target to stay motivated.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active ({active.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((goal) => {
                  const Icon = iconFor(goal.type);
                  return (
                    <Card key={goal.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{goal.title}</p>
                              {goal.targetDate && (
                                <p className="text-xs text-muted-foreground">
                                  by {new Date(goal.targetDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteGoal.mutate({ id: goal.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {goal.currentValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                              {goal.unit}
                            </span>
                            <span className="font-semibold">
                              {goal.targetValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                              {goal.unit}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${
                                goal.isComplete ? "bg-green-500" : "bg-primary"
                              }`}
                              style={{ width: `${goal.progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={goal.isComplete ? "gold" : "outline"}
                              className="text-[10px]"
                            >
                              {goal.progressPct}%
                            </Badge>
                            {goal.isComplete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs text-green-600"
                                onClick={() =>
                                  updateGoal.mutate({ id: goal.id, status: "completed" })
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                Mark complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Completed ({completed.length})
              </h2>
              <div className="grid gap-2">
                {completed.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Trophy className="h-4 w-4 text-pr-gold shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.targetValue} {goal.unit}
                          {goal.completedAt && (
                            <>
                              {" · completed "}
                              {new Date(goal.completedAt).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGoal.mutate({ id: goal.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
