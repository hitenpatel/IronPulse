"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePowerSync } from "@powersync/react";
import { formatElapsed } from "@/lib/workout-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WorkoutHeaderProps {
  workoutId: string;
  workoutName: string | null;
  startedAt: Date;
  onFinish: () => void;
}

export function WorkoutHeader({
  workoutId,
  workoutName,
  startedAt,
  onFinish,
}: WorkoutHeaderProps) {
  const router = useRouter();
  const db = usePowerSync();
  const [elapsed, setElapsed] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workoutName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Elapsed timer
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleNameSubmit() {
    setIsEditing(false);
    if (editName.trim() && editName !== workoutName) {
      db.execute(
        `UPDATE workouts SET name = ? WHERE id = ?`,
        [editName.trim(), workoutId]
      );
    }
  }

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => setShowCancel(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>

        <div className="text-center">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              className="w-40 bg-transparent text-center text-sm font-semibold text-foreground focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-foreground"
            >
              {workoutName || "Workout"}
            </button>
          )}
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatElapsed(elapsed)}
          </p>
        </div>

        <button
          onClick={onFinish}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          Finish
        </button>
      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Workout?</DialogTitle>
            <DialogDescription>
              This workout won&apos;t be saved. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Working
            </Button>
            <Button
              variant="destructive"
              onClick={() => router.push("/dashboard")}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
