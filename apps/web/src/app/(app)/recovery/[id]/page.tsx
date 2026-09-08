"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Trash2, Activity, ShieldAlert } from "lucide-react";
import {
  injuryStatusEnum,
  recoveryModalityEnum,
  type InjuryStatus,
  type RecoveryModality,
} from "@zor/shared";
import { trpc } from "@/lib/trpc/client";
import { dateInputToUTCMidnight, formatUTCDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<InjuryStatus, string> = {
  active: "Active",
  recovering: "Recovering",
  resolved: "Resolved",
};

const MODALITY_LABELS: Record<RecoveryModality, string> = {
  physical_therapy: "Physical therapy",
  rest_day: "Rest day",
  mobility: "Mobility",
  massage: "Massage",
  ice: "Ice",
  heat: "Heat",
  other: "Other",
};

function todayUTCDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function StatusControl({ injuryId, current }: { injuryId: string; current: InjuryStatus }) {
  const utils = trpc.useUtils();
  const updateInjury = trpc.injury.update.useMutation({
    onSuccess: async () => {
      await utils.injury.getById.invalidate({ id: injuryId });
      await utils.injury.list.invalidate();
    },
  });

  function setStatus(status: InjuryStatus) {
    updateInjury.mutate({
      id: injuryId,
      status,
      resolvedAt: status === "resolved" ? dateInputToUTCMidnight(todayUTCDateStr()) : null,
    });
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Injury status">
      {injuryStatusEnum.options.map((s) => (
        <Button
          key={s}
          type="button"
          size="sm"
          variant={s === current ? "default" : "outline"}
          disabled={updateInjury.isPending}
          onClick={() => setStatus(s)}
        >
          {STATUS_LABELS[s]}
        </Button>
      ))}
    </div>
  );
}

function RecoveryTimeline({ injuryId }: { injuryId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.injury.listRecovery.useQuery({ injuryId });

  const [performedAt, setPerformedAt] = useState(todayUTCDateStr());
  const [modality, setModality] = useState<RecoveryModality>("physical_therapy");
  const [durationMins, setDurationMins] = useState("");
  const [notes, setNotes] = useState("");

  const logRecovery = trpc.injury.logRecovery.useMutation({
    onSuccess: async () => {
      setPerformedAt(todayUTCDateStr());
      setModality("physical_therapy");
      setDurationMins("");
      setNotes("");
      await utils.injury.listRecovery.invalidate({ injuryId });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    logRecovery.mutate({
      injuryId,
      performedAt: dateInputToUTCMidnight(performedAt),
      modality,
      ...(durationMins.trim() !== "" && { durationMins: Number(durationMins) }),
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  }

  const activities = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Recovery timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="recovery-date">Date</Label>
              <Input
                id="recovery-date"
                type="date"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recovery-modality">Modality</Label>
              <select
                id="recovery-modality"
                value={modality}
                onChange={(e) => setModality(e.target.value as RecoveryModality)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {recoveryModalityEnum.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {MODALITY_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recovery-duration">Duration (minutes, optional)</Label>
            <Input
              id="recovery-duration"
              type="number"
              inputMode="numeric"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="recovery-notes">Notes (optional)</Label>
            <Input
              id="recovery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" size="sm" disabled={logRecovery.isPending}>
            {logRecovery.isPending ? "Saving..." : "Log recovery activity"}
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No recovery activities logged yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {MODALITY_LABELS[activity.modality as RecoveryModality]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatUTCDate(activity.performedAt)}
                  </span>
                </div>
                {activity.durationMins != null && (
                  <p className="text-xs text-muted-foreground">
                    {activity.durationMins} min
                  </p>
                )}
                {activity.notes && (
                  <p className="mt-1 text-xs text-muted-foreground italic">
                    {activity.notes}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function RestrictionEditor({ injuryId }: { injuryId: string }) {
  const utils = trpc.useUtils();
  const { data: vocabData } = trpc.exercise.muscleVocabulary.useQuery();
  const { data: restrictionsData, isLoading } = trpc.injury.listRestrictions.useQuery({});

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [startsAt, setStartsAt] = useState(todayUTCDateStr());
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addRestriction = trpc.injury.addRestriction.useMutation({
    onSuccess: async () => {
      setSelectedMuscles([]);
      setNote("");
      setStartsAt(todayUTCDateStr());
      setExpiresAt("");
      setFormError(null);
      await utils.injury.listRestrictions.invalidate();
    },
    onError: () => setFormError("Failed to save. Please try again."),
  });

  const deleteRestriction = trpc.injury.deleteRestriction.useMutation({
    onSuccess: async () => {
      await utils.injury.listRestrictions.invalidate();
    },
  });

  function toggleMuscle(muscle: string) {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (selectedMuscles.length === 0) {
      setFormError("Select at least one muscle group.");
      return;
    }
    if (!expiresAt) {
      setFormError("Set an end date for the restriction.");
      return;
    }

    const startsAtDate = dateInputToUTCMidnight(startsAt);
    const expiresAtDate = dateInputToUTCMidnight(expiresAt);
    if (expiresAtDate <= startsAtDate) {
      setFormError("End date must be after the start date.");
      return;
    }

    addRestriction.mutate({
      injuryId,
      muscleGroups: selectedMuscles,
      startsAt: startsAtDate,
      expiresAt: expiresAtDate,
      ...(note.trim() !== "" && { note: note.trim() }),
    });
  }

  const vocabulary = vocabData?.muscles ?? [];
  const restrictions = (restrictionsData?.data ?? []).filter(
    (r) => r.injuryId === injuryId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5" />
          Exercise restrictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Muscle groups</Label>
            {vocabulary.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No exercises with muscle data yet — add exercises before creating a
                restriction.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Muscle groups">
                {vocabulary.map((muscle) => {
                  const selected = selectedMuscles.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleMuscle(muscle)}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {muscle}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="restriction-starts">Starts</Label>
              <Input
                id="restriction-starts"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="restriction-expires">Ends</Label>
              <Input
                id="restriction-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="restriction-note">Note (optional)</Label>
            <Input
              id="restriction-note"
              placeholder="e.g. no squats"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button type="submit" size="sm" disabled={addRestriction.isPending}>
            {addRestriction.isPending ? "Saving..." : "Add restriction"}
          </Button>
        </form>

        {isLoading ? (
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        ) : restrictions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-2">
            No active restrictions for this injury.
          </p>
        ) : (
          <ul className="space-y-2">
            {restrictions.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize">{r.muscleGroups.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatUTCDate(r.startsAt)} &ndash; {formatUTCDate(r.expiresAt)}
                  </p>
                  {r.note && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{r.note}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRestriction.mutate({ id: r.id })}
                  disabled={deleteRestriction.isPending}
                  aria-label="Delete restriction"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function InjuryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.injury.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-muted-foreground">Injury not found.</p>
      </div>
    );
  }

  const { injury } = data;
  const status = injury.status as InjuryStatus;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Link
        href="/recovery"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Recovery
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base capitalize">
            {injury.injuryType}
            <Badge variant="outline">{formatUTCDate(injury.injuredAt)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm capitalize text-muted-foreground">
            {injury.bodyParts.join(", ")} · Severity {injury.severity}/10
          </p>
          {injury.notes && (
            <p className="text-sm italic text-muted-foreground">{injury.notes}</p>
          )}
          <StatusControl injuryId={injury.id} current={status} />
        </CardContent>
      </Card>

      <RecoveryTimeline injuryId={injury.id} />

      <RestrictionEditor injuryId={injury.id} />
    </div>
  );
}
