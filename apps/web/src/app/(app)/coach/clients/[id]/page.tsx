"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Dumbbell,
  Footprints,
  Trophy,
  MessageSquare,
  Crown,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: userData, isLoading: userLoading } = trpc.user.me.useQuery();
  const user = userData?.user;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold">Coach Feature</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to view client progress.
          </p>
          <Button asChild>
            <Link href="/settings/integrations">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ClientDetail athleteId={id} />;
}

function ClientDetail({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = trpc.coach.clientProgress.useQuery({
    athleteId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/clients"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Client</h1>
        </div>
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  const { workouts, cardioSessions, personalRecords } = data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/clients"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Client Progress</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/messages?partner=${athleteId}`}>
            <MessageSquare className="h-4 w-4" />
            Message
          </Link>
        </Button>
      </div>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workouts yet.</p>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {w.name ?? "Workout"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.workoutExercises.length} exercise
                      {w.workoutExercises.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(w.startedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Cardio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4" />
            Recent Cardio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cardioSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cardio sessions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {cardioSessions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm capitalize">{c.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.distanceMeters
                        ? `${(Number(c.distanceMeters) / 1000).toFixed(1)} km`
                        : ""}
                      {c.durationSeconds ? ` · ${Math.round(c.durationSeconds / 60)} min` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.startedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Recent PRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PRs yet.</p>
          ) : (
            <div className="space-y-3">
              {personalRecords.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">{pr.exercise.name}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {Number(pr.value)} {pr.type === "weight" ? "kg" : pr.type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(pr.achievedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
