"use client";

import { useState, useContext } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PowerSyncContext } from "@powersync/react";
import { Button } from "@/components/ui/button";
import { uuid } from "@/lib/uuid";
import { trpc } from "@/lib/trpc/client";
import { useDataMode } from "@/hooks/use-data-mode";
import { HYROX_CARDIO_TYPES } from "@ironpulse/shared";

// HYROX exercises where the primary distance metric is meters (not km)
const HYROX_DISTANCE_TYPES = new Set<string>(["ski_erg", "sled_push", "sled_pull", "sandbag_carry"]);
// HYROX exercises where the primary metric is rep count
const HYROX_REP_TYPES = new Set<string>(["burpee_broad_jump", "wall_ball"]);
const HYROX_TYPES = new Set<string>(HYROX_CARDIO_TYPES);

function getDistanceConfig(type: string): { label: string; placeholder: string; toMeters: (v: number) => number } {
  if (HYROX_DISTANCE_TYPES.has(type)) {
    return { label: "Distance (m)", placeholder: "e.g. 25", toMeters: (v) => v };
  }
  if (HYROX_REP_TYPES.has(type)) {
    return { label: "Reps", placeholder: "e.g. 100", toMeters: (v) => v };
  }
  return { label: "Distance (km)", placeholder: "—", toMeters: (v) => v * 1000 };
}

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
  const mode = useDataMode();
  const db = useContext(PowerSyncContext);
  const createCardio = trpc.cardio.create.useMutation();
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distanceInput, setDistanceInput] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [elevationM, setElevationM] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const distanceConfig = getDistanceConfig(type);
  const isHyrox = HYROX_TYPES.has(type);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    const totalSeconds =
      (parseInt(hours || "0", 10) || 0) * 3600 +
      (parseInt(minutes || "0", 10) || 0) * 60 +
      (parseInt(seconds || "0", 10) || 0);

    if (totalSeconds <= 0) {
      newErrors.duration = "Duration must be greater than 0";
    }

    if (distanceInput) {
      const dist = parseFloat(distanceInput);
      if (isNaN(dist) || dist <= 0) {
        newErrors.distance = `${distanceConfig.label} must be greater than 0`;
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
    const rawDist = distanceInput ? parseFloat(distanceInput) : null;
    const distanceMeters = rawDist != null ? distanceConfig.toMeters(rawDist) : null;
    const elevGain = !isHyrox && elevationM ? parseFloat(elevationM) : null;
    const avgHeartRate = avgHr ? parseInt(avgHr, 10) : null;
    const maxHeartRate = maxHr ? parseInt(maxHr, 10) : null;
    const cals = calories ? parseInt(calories, 10) : null;
    const notesTrimmed = notes.trim() || null;

    try {
      if (mode === "powersync" && db) {
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
          avgHeartRate,
          maxHeartRate,
          calories: cals,
          notes: notesTrimmed,
        });
      } else {
        const result = await createCardio.mutateAsync({
          type: type as Parameters<typeof createCardio.mutateAsync>[0]["type"],
          startedAt: now,
          durationSeconds,
          ...(distanceMeters != null && { distanceMeters }),
          ...(elevGain != null && { elevationGainM: elevGain }),
          ...(avgHeartRate != null && { avgHeartRate }),
          ...(maxHeartRate != null && { maxHeartRate }),
          ...(cals != null && { calories: cals }),
          ...(notesTrimmed != null && { notes: notesTrimmed }),
        });

        onComplete({
          id: result.session.id,
          type: result.session.type,
          source: result.session.source,
          startedAt: result.session.startedAt,
          durationSeconds: result.session.durationSeconds,
          distanceMeters: result.session.distanceMeters,
          elevationGainM: result.session.elevationGainM,
          avgHeartRate: result.session.avgHeartRate,
          maxHeartRate: result.session.maxHeartRate,
          calories: result.session.calories,
          notes: result.session.notes,
        });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm font-medium capitalize text-primary">
        {type.replace(/_/g, " ")}
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

      {/* Distance / Reps */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-muted-foreground">
          {distanceConfig.label}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={distanceInput}
          onChange={(e) => setDistanceInput(e.target.value)}
          placeholder={distanceConfig.placeholder}
          className="w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.distance && (
          <p className="mt-1 text-xs text-destructive">{errors.distance}</p>
        )}
      </div>

      {/* More details toggle (hidden for HYROX rep-based) */}
      {!HYROX_REP_TYPES.has(type) && (
        <>
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
              {!isHyrox && (
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
              )}
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
        </>
      )}

      {/* For rep-based HYROX: always show notes */}
      {HYROX_REP_TYPES.has(type) && (
        <div className="mb-4">
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
}
