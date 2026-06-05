"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight, Save, Trash2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AiWorkoutResult } from "@ironpulse/shared";

const GOALS = [
  { value: "strength", label: "Strength", description: "Low reps, heavy weight, max force output" },
  { value: "hypertrophy", label: "Hypertrophy", description: "Moderate reps, muscle growth focus" },
  { value: "endurance", label: "Endurance", description: "High reps, muscular stamina" },
] as const;

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", description: "< 1 year of consistent training" },
  { value: "intermediate", label: "Intermediate", description: "1–3 years of training" },
  { value: "advanced", label: "Advanced", description: "3+ years of structured training" },
] as const;

const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Cable Machine",
  "Resistance Bands",
  "Pull-up Bar",
  "Bodyweight",
  "Machine",
] as const;

type Goal = (typeof GOALS)[number]["value"];
type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]["value"];

export default function AiWorkoutPage() {
  const router = useRouter();

  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("intermediate");
  const [equipment, setEquipment] = useState<string[]>(["Barbell", "Dumbbell"]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [generatedWorkout, setGeneratedWorkout] = useState<AiWorkoutResult | null>(null);

  const generate = trpc.aiWorkout.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedWorkout(data.workout);
      const initialNotes: Record<number, string> = {};
      data.workout.exercises.forEach((ex, i) => {
        initialNotes[i] = ex.notes;
      });
      setNotes(initialNotes);
    },
  });

  const saveTemplate = trpc.template.create.useMutation({
    onSuccess: () => {
      router.push("/templates");
    },
  });

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  }

  function handleGenerate() {
    if (equipment.length === 0) return;
    setGeneratedWorkout(null);
    generate.mutate({ goal, experienceLevel, equipment });
  }

  function handleDiscard() {
    setGeneratedWorkout(null);
    generate.reset();
  }

  async function handleSaveToLibrary() {
    if (!generatedWorkout) return;
    const saveable = generatedWorkout.exercises.filter((ex) => ex.matchedExerciseId !== null);
    saveTemplate.mutate({
      name: generatedWorkout.name,
      exercises: saveable.map((ex, i) => ({
        exerciseId: ex.matchedExerciseId!,
        order: i,
        notes: notes[ex.order] ?? ex.notes,
        sets: ex.sets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps,
        })),
      })),
    });
  }

  const unmatchedCount = generatedWorkout
    ? generatedWorkout.exercises.filter((ex) => ex.matchedExerciseId === null).length
    : 0;
  const canSave = generatedWorkout !== null && generatedWorkout.exercises.some((ex) => ex.matchedExerciseId !== null);

  return (
    <div className="mx-auto max-w-[680px] space-y-6 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Workout Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your goal and equipment — the AI builds a workout you can save to your library.
        </p>
      </div>

      {!generatedWorkout && (
        <>
          {/* Goal */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Training goal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GOALS.map((g) => (
                <label
                  key={g.value}
                  className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                    goal === g.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={g.value}
                    checked={goal === g.value}
                    onChange={() => setGoal(g.value)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm text-foreground">{g.label}</span>
                  <span className="text-xs text-muted-foreground">{g.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Experience level */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Experience level</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <label
                  key={lvl.value}
                  className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                    experienceLevel === lvl.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={lvl.value}
                    checked={experienceLevel === lvl.value}
                    onChange={() => setExperienceLevel(lvl.value)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm text-foreground">{lvl.label}</span>
                  <span className="text-xs text-muted-foreground">{lvl.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Available equipment</h2>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((item) => {
                const selected = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            {equipment.length === 0 && (
              <p className="text-xs text-destructive">Select at least one equipment type.</p>
            )}
          </div>

          {generate.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{generate.error.message}</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generate.isPending || equipment.length === 0}
            className="w-full"
          >
            {generate.isPending ? (
              "Generating…"
            ) : (
              <>
                Generate Workout <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </>
      )}

      {generatedWorkout && (
        <>
          {/* Preview */}
          <div className="bg-card border-t-[3px] border-t-primary rounded-lg border border-border p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground">
                  {generatedWorkout.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {generatedWorkout.exercises.length} exercises · {goal} · {experienceLevel}
                </p>
              </div>
            </div>

            {unmatchedCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {unmatchedCount} exercise{unmatchedCount > 1 ? "s" : ""} could not be matched to
                  your exercise library and will be excluded when saving.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {generatedWorkout.exercises.map((ex, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 space-y-2 ${
                    ex.matchedExerciseId ? "border-border" : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{ex.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets.length} sets × {ex.sets[0]?.targetReps ?? "—"} reps
                      </p>
                    </div>
                    {!ex.matchedExerciseId && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                        not in library
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`notes-${i}`} className="text-xs">
                      Notes
                    </Label>
                    <input
                      id={`notes-${i}`}
                      type="text"
                      value={notes[i] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Add a coaching note…"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saveTemplate.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{saveTemplate.error.message}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={saveTemplate.isPending}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={handleSaveToLibrary}
              disabled={!canSave || saveTemplate.isPending}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveTemplate.isPending ? "Saving…" : "Save to Library"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
