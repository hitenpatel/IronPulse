"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { getWorkoutName } from "@/lib/workout-utils";

export default function NewWorkoutPage() {
  const [workoutData, setWorkoutData] = useState<{
    id: string;
    startedAt: Date;
    name: string | null;
  } | null>(null);
  const [error, setError] = useState(false);
  const createdRef = useRef(false);

  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: (data) => {
      setWorkoutData({
        id: data.workout.id,
        startedAt: new Date(data.workout.startedAt),
        name: data.workout.name,
      });
    },
    onError: () => {
      setError(true);
    },
  });

  useEffect(() => {
    // Guard against React Strict Mode double-invocation creating two workouts
    if (createdRef.current) return;
    createdRef.current = true;
    createWorkout.mutate({ name: getWorkoutName() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Could not create workout.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!workoutData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <ActiveWorkout
      workoutId={workoutData.id}
      startedAt={workoutData.startedAt}
      initialName={workoutData.name}
    />
  );
}
