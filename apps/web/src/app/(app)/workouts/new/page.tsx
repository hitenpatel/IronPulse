"use client";

import { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import { PowerSyncContext } from "@powersync/react";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { getWorkoutName } from "@/lib/workout-utils";
import { uuid } from "@/lib/uuid";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";

export default function NewWorkoutPage() {
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const [workoutData, setWorkoutData] = useState<{
    id: string;
    startedAt: Date;
    name: string | null;
  } | null>(null);
  const [error, setError] = useState(false);
  const createdRef = useRef(false);

  const createWorkout = trpc.workout.create.useMutation();

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    const id = uuid();
    const name = getWorkoutName();
    const now = new Date();

    async function create() {
      // Try PowerSync first (offline-capable)
      if (mode === "powersync" && db) {
        try {
          await db.execute(
            `INSERT INTO workouts (id, name, started_at, created_at) VALUES (?, ?, ?, ?)`,
            [id, name, now.toISOString(), now.toISOString()]
          );
          setWorkoutData({ id, startedAt: now, name });
          return;
        } catch {
          // PowerSync failed, fall through to tRPC
        }
      }

      // Fallback: create via tRPC (server-side)
      try {
        const result = await createWorkout.mutateAsync({ name });
        const w = result.workout;
        setWorkoutData({
          id: w.id,
          startedAt: new Date(w.startedAt),
          name: w.name,
        });
      } catch {
        setError(true);
      }
    }

    create();
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
