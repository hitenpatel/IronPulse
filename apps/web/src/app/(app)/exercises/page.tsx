"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Dumbbell, X } from "lucide-react";
import { useExercises } from "@/hooks/use-exercises";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "abs", "obliques",
  "traps", "lats", "lower_back", "hip_flexors", "adductors", "abductors",
] as const;

const EQUIPMENT = [
  "barbell", "dumbbell", "kettlebell", "machine", "cable",
  "bodyweight", "band", "other",
] as const;

const CATEGORIES = [
  "compound", "isolation", "cardio", "stretching", "plyometric",
] as const;

function formatLabel(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ExerciseSkeleton() {
  return (
    <Card className="animate-pulse p-4">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant={value ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5"
      >
        {value ? formatLabel(value) : label}
        {value && (
          <X
            className="h-3 w-3"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
              setOpen(false);
            }}
          />
        )}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {options.map((opt) => (
            <button
              key={opt}
              className={`w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                value === opt ? "bg-accent font-medium" : ""
              }`}
              onClick={() => {
                onChange(value === opt ? undefined : opt);
                setOpen(false);
              }}
            >
              {formatLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string | undefined>();
  const [equipment, setEquipment] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();

  const debouncedSearch = useDebounce(search, 300);

  const { data: exercisesData, isLoading } = useExercises({
    search: debouncedSearch || undefined,
    muscle: muscleGroup,
    equipment,
    category,
  });

  const exercises = exercisesData ?? [];

  const hasActiveFilters = muscleGroup || equipment || category;

  const clearFilters = useCallback(() => {
    setMuscleGroup(undefined);
    setEquipment(undefined);
    setCategory(undefined);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exercises</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          label="Muscle Group"
          options={MUSCLE_GROUPS}
          value={muscleGroup as (typeof MUSCLE_GROUPS)[number] | undefined}
          onChange={setMuscleGroup}
        />
        <FilterChips
          label="Equipment"
          options={EQUIPMENT}
          value={equipment as (typeof EQUIPMENT)[number] | undefined}
          onChange={setEquipment}
        />
        <FilterChips
          label="Category"
          options={CATEGORIES}
          value={category as (typeof CATEGORIES)[number] | undefined}
          onChange={setCategory}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExerciseSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && exercises.length === 0 && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No exercises found</p>
          {(debouncedSearch || hasActiveFilters) && (
            <Button
              variant="link"
              className="mt-2"
              onClick={() => {
                setSearch("");
                clearFilters();
              }}
            >
              Clear search and filters
            </Button>
          )}
        </div>
      )}

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          {exercises.map((exercise) => {
            const primaryMuscles = exercise.primary_muscles
              ? exercise.primary_muscles.split(",").map((s) => s.trim()).filter(Boolean)
              : [];

            return (
              <Card
                key={exercise.id}
                className="p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <Dumbbell className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.is_custom === 1 && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Custom
                        </Badge>
                      )}
                    </div>

                    {primaryMuscles.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {primaryMuscles.map((muscle) => (
                          <Badge
                            key={muscle}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {formatLabel(muscle)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-1.5 flex gap-3 text-sm text-muted-foreground">
                      {exercise.equipment && (
                        <span>{formatLabel(exercise.equipment)}</span>
                      )}
                      {exercise.category && (
                        <span>{formatLabel(exercise.category)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
