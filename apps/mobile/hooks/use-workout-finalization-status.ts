/**
 * Polls trpc.workout.finalizationStatus while foregrounded.
 *
 * - pending/processing: poll every 2 seconds
 * - failed: poll every 15 seconds (server still retries)
 * - completed: stop polling
 * - offline/network error: treat as local-complete/pending, don't clear last state
 *
 * Local stats (from PowerSync) remain usable in every state.
 */

import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { trpc } from "@/lib/trpc";

export type FinalizationStatusValue = "pending" | "processing" | "failed" | "completed";

export interface FinalizationPR {
  exerciseName?: string;
  type?: string;
  value?: number;
}

export interface FinalizationStatus {
  status: FinalizationStatusValue;
  newPRs: FinalizationPR[];
  isLoading: boolean;
}

const POLL_PENDING_MS = 2_000;
const POLL_FAILED_MS = 15_000;

export function useWorkoutFinalizationStatus(workoutId: string): FinalizationStatus {
  const [status, setStatus] = useState<FinalizationStatusValue>("pending");
  const [newPRs, setNewPRs] = useState<FinalizationPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!workoutId) return;
    stoppedRef.current = false;

    async function poll() {
      if (stoppedRef.current) return;
      // Only poll when foregrounded
      if (appStateRef.current !== "active") {
        scheduleNext("pending");
        return;
      }
      try {
        const result = await trpc.workout.finalizationStatus.query({ workoutId });
        if (stoppedRef.current) return;
        setStatus(result.status as FinalizationStatusValue);
        setNewPRs(result.newPRs as FinalizationPR[]);
        setIsLoading(false);
        if (result.status === "completed") {
          stoppedRef.current = true;
          return;
        }
        scheduleNext(result.status as FinalizationStatusValue);
      } catch {
        // Treat network errors as pending — don't overwrite last known state
        if (!stoppedRef.current) {
          setIsLoading(false);
          scheduleNext("pending");
        }
      }
    }

    function scheduleNext(currentStatus: FinalizationStatusValue) {
      if (stoppedRef.current) return;
      const delay = currentStatus === "failed" ? POLL_FAILED_MS : POLL_PENDING_MS;
      timerRef.current = setTimeout(() => { void poll(); }, delay);
    }

    // Immediate first poll
    void poll();

    // AppState listener — resume polling on foreground
    const appSub = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active" && !stoppedRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        void poll();
      }
    });

    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      appSub.remove();
    };
  }, [workoutId]);

  return { status, newPRs, isLoading };
}
