"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <h1 className="font-display font-semibold text-[28px] text-foreground">{exercise.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {exercise.category && (
            <Badge variant="default" className="rounded-pill capitalize">
              {exercise.category}
            </Badge>
          )}
          {exercise.equipment && (
            <Badge variant="outline" className="rounded-pill capitalize">
              {exercise.equipment}
            </Badge>
          )}
          {exercise.isCustom && (
            <Badge variant="gold" className="rounded-pill">
              Custom
            </Badge>
          )}
        </div>
      </div>

      {/* Muscles */}
      {(exercise.primaryMuscles.length > 0 ||
        exercise.secondaryMuscles.length > 0) && (
        <Card className="bg-card border border-border">
          <CardContent className="py-4">
            {exercise.primaryMuscles.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Primary Muscles</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-6">
                  {exercise.primaryMuscles.map((m) => (
                    <Badge key={m} variant="default" className="rounded-pill capitalize">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Secondary Muscles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-6">
                  {exercise.secondaryMuscles.map((m) => (
                    <Badge key={m} variant="outline" className="rounded-pill capitalize">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {exercise.instructions && (
        <Card className="bg-card border border-border">
          <CardContent className="py-4">
            <h2 className="mb-2 font-semibold text-foreground">Instructions</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {exercise.instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Personal Records */}
      {personalRecords.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-foreground">Personal Records</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border border-border p-4 text-center">
              <Trophy className="mx-auto h-5 w-5 text-pr-gold" />
              <p className="mt-1 text-xl font-semibold text-pr-gold">
                {bestWeight
                  ? `${formatWeight(Number(bestWeight.value))} kg`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Weight</p>
            </Card>
            <Card className="bg-card border border-border p-4 text-center">
              <Dumbbell className="mx-auto h-5 w-5 text-pr-gold" />
              <p className="mt-1 text-xl font-semibold text-pr-gold">
                {bestVolume
                  ? `${formatWeight(Number(bestVolume.value))} kg`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Volume</p>
            </Card>
            <Card className="bg-card border border-border p-4 text-center">
              <Target className="mx-auto h-5 w-5 text-success" />
              <p className="mt-1 text-xl font-semibold text-foreground">
                {bestReps ? Number(bestReps.value) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Best Reps</p>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              PR History
            </h3>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {personalRecords.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between border-b border-border last:border-0 px-3 py-2 text-sm border-l-2 border-l-pr-gold"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-pr-gold" />
                    <span className="capitalize text-foreground">{pr.type}</span>
                    <Badge variant="gold" className="text-[10px]">PR</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-pr-gold">
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
          <h2 className="mb-3 text-lg font-semibold text-foreground">Recent Sets</h2>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Set</th>
                  <th className="px-4 py-2 font-medium text-right">Weight</th>
                  <th className="px-4 py-2 font-medium text-right">Reps</th>
                  <th className="px-4 py-2 font-medium text-right">RPE</th>
                </tr>
              </thead>
              <tbody>
                {recentSets.map((set) => (
                  <tr key={set.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2 text-foreground">#{set.setNumber}</td>
                    <td className="px-4 py-2 text-right text-foreground">
                      {set.weightKg != null
                        ? `${formatWeight(Number(set.weightKg))} kg`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-foreground">{set.reps ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-foreground">
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
              <h2 className="mb-3 text-lg font-semibold text-foreground">Videos</h2>
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
              <h2 className="mb-3 text-lg font-semibold text-foreground">Images</h2>
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
        <Card className="bg-card border border-border">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No media available.
          </CardContent>
        </Card>
      )}

      {personalRecords.length === 0 && recentSets.length === 0 && (
        <Card className="bg-card border border-border">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No history yet. Complete a workout with this exercise to see your
            stats.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
