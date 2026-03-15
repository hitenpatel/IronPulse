"use client";

import { useQuery } from "@powersync/react";

export interface ExerciseRow {
  id: string;
  name: string;
  category: string | null;
  primary_muscles: string | null;
  secondary_muscles: string | null;
  equipment: string | null;
  instructions: string | null;
  image_urls: string | null;
  video_urls: string | null;
  is_custom: number;
  created_by_id: string | null;
}

export function useExercises(opts?: {
  search?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
}) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (opts?.search) {
    conditions.push("name LIKE ?");
    params.push(`%${opts.search}%`);
  }
  if (opts?.muscle) {
    conditions.push("primary_muscles LIKE ?");
    params.push(`%${opts.muscle}%`);
  }
  if (opts?.equipment) {
    conditions.push("equipment = ?");
    params.push(opts.equipment);
  }
  if (opts?.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return useQuery<ExerciseRow>(
    `SELECT * FROM exercises ${where} ORDER BY name LIMIT 100`,
    params
  );
}
