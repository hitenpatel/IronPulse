"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type FitnessGoal = "lose_weight" | "build_muscle" | "endurance" | "general";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string; icon: string }[] = [
  { value: "lose_weight", label: "Lose Weight", description: "Burn fat and improve body composition", icon: "🔥" },
  { value: "build_muscle", label: "Build Muscle", description: "Gain strength and increase muscle mass", icon: "💪" },
  { value: "endurance", label: "Endurance", description: "Improve cardio and stamina", icon: "🏃" },
  { value: "general", label: "General Fitness", description: "Stay active and maintain overall health", icon: "⚡" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string; icon: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to fitness or returning after a long break", icon: "🌱" },
  { value: "intermediate", label: "Intermediate", description: "Training consistently for 6+ months", icon: "📈" },
  { value: "advanced", label: "Advanced", description: "Training seriously for 2+ years", icon: "🏆" },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleNext() {
    if (step === 1 && !name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError(null);
    setStep((s) => s - 1);
  }

  function handleFinish() {
    setError(null);
    completeOnboarding.mutate({
      name: name.trim(),
      unitSystem,
      ...(fitnessGoal && { fitnessGoal }),
      ...(experienceLevel && { experienceLevel }),
    });
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/30 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  s < step ? "bg-primary/50" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          Step {step} of 3
        </span>
      </div>

      {/* Step 1: Name + Unit System */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold">Let&apos;s get you set up</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Just a couple of things before you start
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Unit preference</Label>
              <div className="mt-1.5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setUnitSystem("metric")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    unitSystem === "metric"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  Metric
                  <span className="mt-0.5 block text-xs font-normal opacity-70">
                    kg, km
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem("imperial")}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    unitSystem === "imperial"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  Imperial
                  <span className="mt-0.5 block text-xs font-normal opacity-70">
                    lbs, mi
                  </span>
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="button" className="w-full" size="lg" onClick={handleNext}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Fitness Goal */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold">What&apos;s your main goal?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This helps us tailor your experience. You can skip this.
          </p>

          <div className="mt-6 space-y-3">
            {FITNESS_GOALS.map((goal) => (
              <button
                key={goal.value}
                type="button"
                onClick={() => setFitnessGoal(goal.value)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors",
                  fitnessGoal === goal.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/50"
                )}
              >
                <span className="mt-0.5 text-2xl">{goal.icon}</span>
                <div>
                  <p className={cn("text-sm font-medium", fitnessGoal === goal.value ? "text-primary" : "text-foreground")}>
                    {goal.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>
                </div>
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" size="lg" onClick={handleBack}>
              Back
            </Button>
            <Button type="button" className="flex-1" size="lg" onClick={handleNext}>
              {fitnessGoal ? "Next" : "Skip"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Experience Level */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold">Your experience level?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll use this to set sensible defaults. You can skip this.
          </p>

          <div className="mt-6 space-y-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setExperienceLevel(level.value)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors",
                  experienceLevel === level.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/50"
                )}
              >
                <span className="mt-0.5 text-2xl">{level.icon}</span>
                <div>
                  <p className={cn("text-sm font-medium", experienceLevel === level.value ? "text-primary" : "text-foreground")}>
                    {level.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{level.description}</p>
                </div>
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" size="lg" onClick={handleBack}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              size="lg"
              onClick={handleFinish}
              disabled={completeOnboarding.isPending}
            >
              {completeOnboarding.isPending ? "Setting up..." : "Get Started"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
