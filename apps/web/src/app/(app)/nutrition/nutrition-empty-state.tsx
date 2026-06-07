"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils } from "lucide-react";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const TYPICAL_BREAKFAST = {
  mealType: "breakfast" as MealType,
  name: "Oatmeal & eggs",
  calories: "520",
  proteinG: "32",
  carbsG: "58",
  fatG: "12",
};

export function NutritionEmptyState({
  onPrefillBreakfast,
}: {
  onPrefillBreakfast: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Log your first meal</p>
          <p className="text-xs text-muted-foreground">
            Tracking nutrition helps you hit your protein and calorie targets.
          </p>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onPrefillBreakfast}>
            <Utensils className="mr-1.5 h-3.5 w-3.5" />
            Start with a typical breakfast
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
