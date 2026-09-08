"use client";

import { useState } from "react";
import { X, ClipboardPlus } from "lucide-react";
import { injuryTypeEnum, type InjuryType } from "@zor/shared";
import { trpc } from "@/lib/trpc/client";
import { dateInputToUTCMidnight } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INJURY_TYPE_LABELS: Record<InjuryType, string> = {
  strain: "Strain",
  sprain: "Sprain",
  fracture: "Fracture",
  tendinopathy: "Tendinopathy",
  soreness: "Soreness",
  impact: "Impact",
  other: "Other",
};

function todayUTCDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LogInjuryForm() {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(todayUTCDateStr());
  const [injuryType, setInjuryType] = useState<InjuryType>("strain");
  const [severity, setSeverity] = useState("");
  const [bodyPartInput, setBodyPartInput] = useState("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);

  const logInjury = trpc.injury.log.useMutation({
    onSuccess: async () => {
      setDate(todayUTCDateStr());
      setInjuryType("strain");
      setSeverity("");
      setBodyPartInput("");
      setBodyParts([]);
      setNotes("");
      setSubmitError(false);
      await utils.injury.list.invalidate();
    },
    onError: () => setSubmitError(true),
  });

  function addBodyPart() {
    const trimmed = bodyPartInput.trim().toLowerCase();
    if (trimmed && !bodyParts.includes(trimmed)) {
      setBodyParts((prev) => [...prev, trimmed]);
    }
    setBodyPartInput("");
  }

  function removeBodyPart(part: string) {
    setBodyParts((prev) => prev.filter((p) => p !== part));
  }

  function handleBodyPartKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addBodyPart();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (bodyParts.length === 0) {
      setFormError("Select at least one body part.");
      return;
    }

    const severityNum = Number(severity);
    if (!Number.isInteger(severityNum) || severityNum < 1 || severityNum > 10) {
      setFormError("Severity must be between 1 and 10.");
      return;
    }

    logInjury.mutate({
      injuredAt: dateInputToUTCMidnight(date),
      injuryType,
      severity: severityNum,
      bodyParts,
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardPlus className="h-5 w-5" />
          Log Injury
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="injury-date">Date</Label>
            <Input
              id="injury-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="injury-type">Injury type</Label>
            <select
              id="injury-type"
              value={injuryType}
              onChange={(e) => setInjuryType(e.target.value as InjuryType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {injuryTypeEnum.options.map((opt) => (
                <option key={opt} value={opt}>
                  {INJURY_TYPE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="injury-severity">Severity (1-10)</Label>
            <Input
              id="injury-severity"
              type="number"
              inputMode="numeric"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="injury-body-part">Body part</Label>
            <Input
              id="injury-body-part"
              placeholder="Type a body part and press Enter"
              value={bodyPartInput}
              onChange={(e) => setBodyPartInput(e.target.value)}
              onKeyDown={handleBodyPartKeyDown}
              onBlur={addBodyPart}
            />
            {bodyParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {bodyParts.map((part) => (
                  <span
                    key={part}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs capitalize"
                  >
                    {part}
                    <button
                      type="button"
                      onClick={() => removeBodyPart(part)}
                      aria-label={`Remove ${part}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="injury-notes">Notes (optional)</Label>
            <Input
              id="injury-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={logInjury.isPending}
          >
            {logInjury.isPending ? "Saving..." : "Log Injury"}
          </Button>
        </form>
        {submitError && (
          <p className="mt-2 text-xs text-destructive">
            Failed to save. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
