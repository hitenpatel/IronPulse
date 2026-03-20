"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  Dumbbell,
  Target,
  Trophy,
  Calendar,
} from "lucide-react";

function formatWeight(kg: number): string {
  return kg % 1 === 0 ? `${kg}` : kg.toFixed(1);
}

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = trpc.exercise.getDetail.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Exercises
        </Link>
        <p className="text-center text-muted-foreground py-12">
          Exercise not found.
        </p>
      </div>
    );
  }

  const { exercise, personalRecords, recentSets } = data;

  const bestWeight = personalRecords.find((pr) => pr.type === "weight");
  const bestVolume = personalRecords.find((pr) => pr.type === "volume");
  const bestReps = personalRecords.find((pr) => pr.type === "reps");

  return (
    <div className="space-y-6">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Exercises
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {exercise.category && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {exercise.category}
            </span>
          )}
          {exercise.equipment && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {exercise.equipment}
            </span>
          )}
          {exercise.isCustom && (
            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Muscles */}
      {(exercise.primaryMuscles.length > 0 ||
        exercise.secondaryMuscles.length > 0) && (
        <Card>
          <CardContent className="py-4">
            {exercise.primaryMuscles.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Primary Muscles</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-6">
                  {exercise.primaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Secondary Muscles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-6">
                  {exercise.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {exercise.instructions && (
        <Card>
          <CardContent className="py-4">
            <h2 className="mb-2 font-semibold">Instructions</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {exercise.instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Personal Records */}
      {personalRecords.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Personal Records</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <Trophy className="mx-auto h-5 w-5 text-yellow-400" />
              <p className="mt-1 text-xl font-semibold">
                {bestWeight
                  ? `${formatWeight(Number(bestWeight.value))} kg`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Weight</p>
            </Card>
            <Card className="p-4 text-center">
              <Dumbbell className="mx-auto h-5 w-5 text-blue-400" />
              <p className="mt-1 text-xl font-semibold">
                {bestVolume
                  ? `${formatWeight(Number(bestVolume.value))} kg`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Volume</p>
            </Card>
            <Card className="p-4 text-center">
              <Target className="mx-auto h-5 w-5 text-green-400" />
              <p className="mt-1 text-xl font-semibold">
                {bestReps ? Number(bestReps.value) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Reps</p>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              PR History
            </h3>
            <div className="space-y-1.5">
              {personalRecords.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="capitalize">{pr.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {formatWeight(Number(pr.value))}
                      {pr.type === "reps" ? "" : " kg"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(pr.achievedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recent Sets */}
      {recentSets.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Sets</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Set</th>
                  <th className="pb-2 font-medium text-right">Weight</th>
                  <th className="pb-2 font-medium text-right">Reps</th>
                  <th className="pb-2 font-medium text-right">RPE</th>
                </tr>
              </thead>
              <tbody>
                {recentSets.map((set) => (
                  <tr key={set.id} className="border-b last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {set.workoutExercise.workout.startedAt
                          ? new Date(
                              set.workoutExercise.workout.startedAt
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </div>
                    </td>
                    <td className="py-2">#{set.setNumber}</td>
                    <td className="py-2 text-right">
                      {set.weightKg != null
                        ? `${formatWeight(Number(set.weightKg))} kg`
                        : "—"}
                    </td>
                    <td className="py-2 text-right">{set.reps ?? "—"}</td>
                    <td className="py-2 text-right">
                      {set.rpe != null ? Number(set.rpe) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Media */}
      {exercise.videoUrls.length > 0 || exercise.imageUrls.length > 0 ? (
        <>
          {exercise.videoUrls.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Videos</h2>
              <div className="space-y-4">
                {exercise.videoUrls.map((url, i) => (
                  <video
                    key={i}
                    src={url}
                    controls
                    className="w-full rounded-xl bg-black"
                  />
                ))}
              </div>
            </div>
          )}

          {exercise.imageUrls.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Images</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {exercise.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${exercise.name} image ${i + 1}`}
                      className="aspect-square w-full rounded-lg object-cover ring-1 ring-border transition hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No media available.
          </CardContent>
        </Card>
      )}

      {personalRecords.length === 0 && recentSets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No history yet. Complete a workout with this exercise to see your
            stats.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
