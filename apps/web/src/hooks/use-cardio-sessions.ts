"use client";

import { useQuery } from "@powersync/react";

export interface CardioSessionRow {
  id: string;
  user_id: string;
  type: string;
  source: string;
  started_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  elevation_gain_m: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
}

export function useCardioSessions() {
  return useQuery<CardioSessionRow>(
    `SELECT * FROM cardio_sessions ORDER BY started_at DESC`
  );
}
