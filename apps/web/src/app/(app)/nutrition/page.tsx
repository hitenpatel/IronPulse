"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Utensils, Trash2 } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function MealLogForm() {
  const utils = trpc.useUtils();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(false);

  const logMeal = trpc.nutrition.logMeal.useMutation({
    onSuccess: async () => {
      setName("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatG("");
      setNotes("");
      setError(false);
      await utils.nutrition.listMeals.invalidate();
      await utils.nutrition.dailySummary.invalidate();
    },
    onError: () => setError(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    logMeal.mutate({
      date: todayDate(),
      mealType,
      name: name.trim(),
      ...(calories !== "" && { calories: parseInt(calories, 10) }),
      ...(proteinG !== "" && { proteinG: parseFloat(proteinG) }),
      ...(carbsG !== "" && { carbsG: parseFloat(carbsG) }),
      ...(fatG !== "" && { fatG: parseFloat(fatG) }),
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Utensils className="h-5 w-5" />
          Log Meal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {MEAL_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMealType(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  mealType === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Input
            placeholder="Food name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Calories</label>
              <Input
                type="number"
                min="0"
                placeholder="kcal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Protein (g)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="g"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Carbs (g)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="g"
                value={carbsG}
                onChange={(e) => setCarbsG(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fat (g)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="g"
                value={fatG}
                onChange={(e) => setFatG(e.target.value)}
              />
            </div>
          </div>

          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={logMeal.isPending || !name.trim()}
          >
            {logMeal.isPending ? "Saving..." : "Log Meal"}
          </Button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-destructive">
            Failed to save. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MacroSummary() {
  const { data } = trpc.nutrition.dailySummary.useQuery({ date: todayDate() });

  if (!data) return null;

  const { totalCalories, totalProteinG, totalCarbsG, totalFatG, mealCount } =
    data;

  if (mealCount === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today&apos;s Macros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalCalories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalProteinG.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">protein (g)</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCarbsG.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">carbs (g)</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalFatG.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">fat (g)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MealList() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.nutrition.listMeals.useQuery({
    date: todayDate(),
  });

  const deleteMeal = trpc.nutrition.deleteMeal.useMutation({
    onSuccess: async () => {
      await utils.nutrition.listMeals.invalidate();
      await utils.nutrition.dailySummary.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse p-4">
            <div className="h-4 w-40 rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const meals = data?.meals ?? [];

  if (meals.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        No meals logged today. Use the form above to get started.
      </p>
    );
  }

  const grouped = MEAL_TYPES.map((t) => ({
    ...t,
    meals: meals.filter((m) => m.mealType === t.value),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.value}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.meals.map((meal) => (
              <Card key={meal.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{meal.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {meal.calories != null && (
                        <span>{meal.calories} kcal</span>
                      )}
                      {meal.proteinG != null && (
                        <span>{Number(meal.proteinG).toFixed(1)}g protein</span>
                      )}
                      {meal.carbsG != null && (
                        <span>{Number(meal.carbsG).toFixed(1)}g carbs</span>
                      )}
                      {meal.fatG != null && (
                        <span>{Number(meal.fatG).toFixed(1)}g fat</span>
                      )}
                    </div>
                    {meal.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground italic">
                        {meal.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMeal.mutate({ id: meal.id })}
                    disabled={deleteMeal.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NutritionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Nutrition</h1>

      <MacroSummary />

      <MealLogForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Today&apos;s Meals</h2>
        <MealList />
      </section>
    </div>
  );
}
