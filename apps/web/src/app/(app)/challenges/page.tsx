"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  volume: "Volume",
  distance: "Distance",
  streak: "Streak",
};

const TYPE_UNITS: Record<string, string> = {
  volume: "kg",
  distance: "km",
  streak: "days",
};

export default function ChallengesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.challenge.list.useQuery();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"volume" | "distance" | "streak">("volume");
  const [target, setTarget] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const createChallenge = trpc.challenge.create.useMutation({
    onSuccess: () => {
      utils.challenge.list.invalidate();
      setShowForm(false);
      setName("");
      setTarget("");
      setStartsAt("");
      setEndsAt("");
    },
  });

  const joinChallenge = trpc.challenge.join.useMutation({
    onSuccess: () => utils.challenge.list.invalidate(),
  });

  const leaveChallenge = trpc.challenge.leave.useMutation({
    onSuccess: () => utils.challenge.list.invalidate(),
  });

  const challenges = data?.challenges ?? [];

  function handleCreate() {
    if (!name.trim() || !target || !startsAt || !endsAt) return;
    createChallenge.mutate({
      name: name.trim(),
      type,
      target: Number(target),
      startsAt,
      endsAt,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Challenges</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Challenge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="challenge-name">Name</Label>
              <Input
                id="challenge-name"
                placeholder="e.g. January Volume Challenge"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="challenge-type">Type</Label>
              <select
                id="challenge-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "volume" | "distance" | "streak")
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="volume">Volume (kg)</option>
                <option value="distance">Distance (km)</option>
                <option value="streak">Streak (days)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="challenge-target">
                Target ({TYPE_UNITS[type]})
              </Label>
              <Input
                id="challenge-target"
                type="number"
                min="1"
                placeholder="e.g. 10000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="challenge-start">Start Date</Label>
                <Input
                  id="challenge-start"
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="challenge-end">End Date</Label>
                <Input
                  id="challenge-end"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={
                createChallenge.isPending ||
                !name.trim() ||
                !target ||
                !startsAt ||
                !endsAt
              }
            >
              {createChallenge.isPending ? "Creating..." : "Create Challenge"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Challenges List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No active challenges. Create one to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              expanded={expandedId === challenge.id}
              onToggle={() =>
                setExpandedId(
                  expandedId === challenge.id ? null : challenge.id
                )
              }
              onJoin={() =>
                joinChallenge.mutate({ challengeId: challenge.id })
              }
              onLeave={() =>
                leaveChallenge.mutate({ challengeId: challenge.id })
              }
              joining={joinChallenge.isPending}
              leaving={leaveChallenge.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  expanded,
  onToggle,
  onJoin,
  onLeave,
  joining,
  leaving,
}: {
  challenge: {
    id: string;
    name: string;
    type: string;
    target: number;
    startsAt: Date;
    endsAt: Date;
    creatorName: string | null;
    participantCount: number;
    joined: boolean;
    myProgress: number | null;
  };
  expanded: boolean;
  onToggle: () => void;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
  leaving: boolean;
}) {
  const progressPct = challenge.myProgress != null
    ? Math.min(100, (challenge.myProgress / challenge.target) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{challenge.name}</h3>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {TYPE_LABELS[challenge.type] ?? challenge.type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              by {challenge.creatorName ?? "Unknown"} &middot;{" "}
              {new Date(challenge.endsAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {challenge.participantCount}
            </span>
            {challenge.joined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onLeave}
                disabled={leaving}
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Leave
              </Button>
            ) : (
              <Button size="sm" onClick={onJoin} disabled={joining}>
                <LogIn className="mr-1 h-3.5 w-3.5" />
                Join
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar (only if joined) */}
        {challenge.joined && challenge.myProgress != null && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                {challenge.myProgress} / {challenge.target}{" "}
                {TYPE_UNITS[challenge.type]}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Expand for leaderboard */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Hide leaderboard
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Show leaderboard
            </>
          )}
        </button>

        {expanded && <Leaderboard challengeId={challenge.id} />}
      </CardContent>
    </Card>
  );
}

function Leaderboard({ challengeId }: { challengeId: string }) {
  const { data, isLoading } = trpc.challenge.getById.useQuery({
    challengeId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded bg-muted"
          />
        ))}
      </div>
    );
  }

  const leaderboard = data?.challenge.leaderboard ?? [];

  if (leaderboard.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No participants yet.</p>
    );
  }

  return (
    <div className="space-y-1">
      {leaderboard.map((entry) => (
        <div
          key={entry.userId}
          className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-xs font-medium text-muted-foreground">
              #{entry.rank}
            </span>
            <span className="font-medium">{entry.name ?? "Unknown"}</span>
          </div>
          <span className="text-muted-foreground">
            {entry.progress}{" "}
            {TYPE_UNITS[data?.challenge.type ?? ""] ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
