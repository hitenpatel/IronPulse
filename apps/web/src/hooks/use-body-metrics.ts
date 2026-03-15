"use client";

import { useQuery } from "@powersync/react";

export interface BodyMetricRow {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measurements: string | null;
  created_at: string;
}

export function useBodyMetrics() {
  return useQuery<BodyMetricRow>(
    `SELECT * FROM body_metrics ORDER BY date DESC`
  );
}
