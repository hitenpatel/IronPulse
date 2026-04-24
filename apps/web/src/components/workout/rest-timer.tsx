"use client";

import { useEffect, useRef } from "react";

interface RestTimerProps {
  running: boolean;
  /** When true, the countdown is frozen — the interval stops ticking. */
  paused?: boolean;
  remainingSeconds: number;
  onTick: () => void;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  onDismiss: () => void;
  /** Optional — when present, renders a Pause/Resume button. */
  onPauseToggle?: () => void;
}

export function RestTimer({
  running,
  paused = false,
  remainingSeconds,
  onTick,
  onSkip,
  onAdjust,
  onDismiss,
  onPauseToggle,
}: RestTimerProps) {
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running || paused) return;

    if (remainingSeconds <= 0) {
      // Vibrate if available
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Auto-dismiss after 3 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        onDismiss();
      }, 3000);

      return () => {
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      };
    }

    const interval = setInterval(() => {
      onTick();
    }, 1000);

    return () => clearInterval(interval);
  }, [running, paused, remainingSeconds, onTick, onDismiss]);

  if (!running) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      role="timer"
      aria-label="Rest timer"
      className="fixed bottom-16 left-0 right-0 z-50 lg:bottom-0"
    >
      <div className="mx-auto max-w-screen-sm border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-live="assertive"
              aria-atomic="true"
              className="text-2xl font-bold tabular-nums text-secondary"
            >
              {display}
            </span>
            <span className="text-sm text-muted-foreground">Rest</span>
          </div>
          <div className="flex gap-2">
            {onPauseToggle && (
              <button
                onClick={onPauseToggle}
                aria-label={paused ? "Resume rest timer" : "Pause rest timer"}
                data-testid="rest-timer-pause"
                className={
                  paused
                    ? "rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors"
                    : "rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {paused ? "Resume" : "Pause"}
              </button>
            )}
            <button
              onClick={() => onAdjust(-15)}
              aria-label="Subtract 15 seconds"
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              -15s
            </button>
            <button
              onClick={() => onAdjust(15)}
              aria-label="Add 15 seconds"
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              +15s
            </button>
            <button
              onClick={onSkip}
              aria-label="Skip rest timer"
              className="rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/80"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
