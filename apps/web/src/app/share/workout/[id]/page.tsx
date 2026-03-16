import { notFound } from "next/navigation";
import { db } from "@ironpulse/db";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getWorkout(id: string) {
  const workout = await db.workout.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      workoutExercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: { select: { name: true } },
          sets: {
            orderBy: { setNumber: "asc" },
          },
        },
      },
    },
  });
  return workout;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const workout = await getWorkout(id);
  if (!workout) return { title: "Workout Not Found" };

  const title = `${workout.user.name ?? "Someone"} — ${workout.name ?? "Workout"} | IronPulse`;
  const exerciseCount = workout.workoutExercises.length;
  const description = `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""} logged on ${new Date(workout.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function ShareWorkoutPage({ params }: Props) {
  const { id } = await params;
  const workout = await getWorkout(id);

  if (!workout) {
    notFound();
  }

  const totalVolume = workout.workoutExercises.reduce((sum, we) => {
    return (
      sum +
      we.sets.reduce(
        (s, set) =>
          s +
          (set.completed
            ? (Number(set.weightKg) || 0) * (set.reps ?? 0)
            : 0),
        0
      )
    );
  }, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">
            {workout.user.name ?? "Someone"}&apos;s workout
          </p>
          <h1 className="text-2xl font-bold mt-1">
            {workout.name ?? "Workout"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(workout.startedAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-semibold">
              {workout.workoutExercises.length}
            </p>
            <p className="text-xs text-muted-foreground">Exercises</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-semibold">
              {workout.workoutExercises.reduce(
                (s, we) => s + we.sets.length,
                0
              )}
            </p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xl font-semibold">
              {totalVolume > 0
                ? totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${totalVolume}kg`
                : "--"}
            </p>
            <p className="text-xs text-muted-foreground">Volume</p>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {workout.workoutExercises.map((we) => (
            <div
              key={we.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <h2 className="font-semibold">{we.exercise.name}</h2>
              <div className="space-y-0">
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                </div>
                {we.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-[2rem_1fr_1fr] gap-2 border-b border-border/50 py-2 text-sm last:border-0 ${
                      !set.completed ? "opacity-40" : ""
                    }`}
                  >
                    <span className="text-muted-foreground">
                      {set.setNumber}
                    </span>
                    <span>
                      {set.weightKg != null
                        ? `${Number(set.weightKg)} kg`
                        : "--"}
                    </span>
                    <span>{set.reps ?? "--"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Shared from IronPulse
        </div>
      </div>
    </div>
  );
}
