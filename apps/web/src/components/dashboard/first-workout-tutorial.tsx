"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

/**
 * One-time dashboard banner shown after onboarding. Primes the user on the
 * four things they need for their first workout (start, add exercise, log
 * sets, finish) and offers a direct link to begin. Dismissal persists on
 * the User model so it never reappears.
 */
export function FirstWorkoutTutorial() {
  const { data, refetch } = trpc.user.me.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => refetch(),
  });
  const [localDismissed, setLocalDismissed] = useState(false);

  const persisted = data?.user?.firstWorkoutTutorialDismissed === true;
  if (persisted || localDismissed) return null;
  // Don't render until we actually know whether it's dismissed — avoids a flash.
  if (!data) return null;

  const handleDismiss = () => {
    setLocalDismissed(true);
    updateProfile.mutate({ firstWorkoutTutorialDismissed: true });
  };

  const steps = [
    "Click Start Workout to open a new session",
    "Add an exercise from the library",
    "Log sets — weight, reps, tick the checkbox",
    "Click Finish to save your workout",
  ];

  return (
    <section
      data-testid="first-workout-tutorial"
      className="rounded-xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="mb-3 flex items-start justify-between">
        <h2 className="text-base font-semibold">Your first workout</h2>
        <button
          type="button"
          data-testid="tutorial-dismiss"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss tutorial"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/workouts/new"
        data-testid="tutorial-start"
        onClick={handleDismiss}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Start my first workout
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
