import { useQuery } from "@powersync/react";

export interface LapRow {
  id: string;
  session_id: string;
  lap_number: number;
  distance_meters: number;
  duration_seconds: number;
  avg_heart_rate: number | null;
}

export function useCardioSession(sessionId: string | undefined) {
  return useQuery(
    `SELECT * FROM cardio_sessions WHERE id = ?`,
    [sessionId ?? ""]
  );
}

export function useCardioLaps(sessionId: string | undefined) {
  return useQuery<LapRow>(
    `SELECT * FROM laps WHERE session_id = ? ORDER BY lap_number`,
    [sessionId ?? ""]
  );
}
