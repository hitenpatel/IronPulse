
import { uuid } from "@/lib/uuid";
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePowerSync } from "@powersync/react";

interface ManualCardioFormProps {
  type: string;
  onBack: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: (session: any) => void;
}

export function ManualCardioForm({
  type,
  onBack,
  onComplete,
}: ManualCardioFormProps) {
  const db = usePowerSync();
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [elevationM, setElevationM] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    const totalSeconds =
      (parseInt(hours || "0", 10) || 0) * 3600 +
      (parseInt(minutes || "0", 10) || 0) * 60 +
      (parseInt(seconds || "0", 10) || 0);

    if (totalSeconds <= 0) {
      newErrors.duration = "Duration must be greater than 0";
    }

    if (distanceKm) {
      const dist = parseFloat(distanceKm);
      if (isNaN(dist) || dist <= 0) {
        newErrors.distance = "Distance must be greater than 0";
      }
    }

    if (avgHr) {
      const val = parseInt(avgHr, 10);
      if (isNaN(val) || val <= 0) {
        newErrors.avgHr = "Must be a positive number";
      }
    }

    if (maxHr) {
      const val = parseInt(maxHr, 10);
      if (isNaN(val) || val <= 0) {
        newErrors.maxHr = "Must be a positive number";
      }
    }

    if (avgHr && maxHr) {
      const avg = parseInt(avgHr, 10);
      const max = parseInt(maxHr, 10);
      if (!isNaN(avg) && !isNaN(max) && max < avg) {
        newErrors.maxHr = "Must be >= avg heart rate";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    const durationSeconds =
      (parseInt(hours || "0", 10) || 0) * 3600 +
      (parseInt(minutes || "0", 10) || 0) * 60 +
      (parseInt(seconds || "0", 10) || 0);

    const id = uuid();
    const now = new Date();
    const distanceMeters = distanceKm ? parseFloat(distanceKm) * 1000 : null;
    const elevGain = elevationM ? parseFloat(elevationM) : null;
    const avgHeartRate = avgHr ? parseInt(avgHr, 10) : null;
    const maxHeartRate = maxHr ? parseInt(maxHr, 10) : null;
    const cals = calories ? parseInt(calories, 10) : null;
    const notesTrimmed = notes.trim() || null;

    try {
      await db.execute(
        `INSERT INTO cardio_sessions (id, type, source, started_at, duration_seconds, distance_meters, elevation_gain_m, avg_heart_rate, max_heart_rate, calories, notes, created_at)
         VALUES (?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          type,
          now.toISOString(),
          durationSeconds,
          distanceMeters,
          elevGain,
          avgHeartRate,
          maxHeartRate,
          cals,
          notesTrimmed,
          now.toISOString(),
        ]
      );

      onComplete({
        id,
        type,
        source: "manual",
        startedAt: now.toISOString(),
        durationSeconds,
        distanceMeters,
        elevationGainM: elevGain,
        avgHeartRate: avgHeartRate,
        maxHeartRate: maxHeartRate,
        calories: cals,
        notes: notesTrimmed,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm font-medium capitalize text-primary">
        {type}
      </p>

      {/* Duration */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Duration *
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">hr</p>
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">min</p>
          </div>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="0"
              className="w-full rounded-md bg-muted px-3 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-0.5 text-center text-[11px] text-muted-foreground">sec</p>
          </div>
        </div>
        {errors.duration && (
          <p className="mt-1 text-xs text-destructive">{errors.duration}</p>
        )}
      </div>

      {/* Distance */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Distance (km)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          placeholder="—"
          className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.distance && (
          <p className="mt-1 text-xs text-destructive">{errors.distance}</p>
        )}
      </div>

      {/* More details toggle */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        More details
        {showMore ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showMore && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Elevation Gain (m)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={elevationM}
              onChange={(e) => setElevationM(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Avg Heart Rate (bpm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={avgHr}
              onChange={(e) => setAvgHr(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.avgHr && (
              <p className="mt-1 text-xs text-destructive">{errors.avgHr}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Max Heart Rate (bpm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={maxHr}
              onChange={(e) => setMaxHr(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.maxHr && (
              <p className="mt-1 text-xs text-destructive">{errors.maxHr}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Calories
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="—"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How did it feel?"
              className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <p className="mb-4 text-sm text-destructive">
          {saveError}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
