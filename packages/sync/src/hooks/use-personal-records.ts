import { useQuery } from "@powersync/react";

export interface PersonalRecordRow {
  id: string;
  user_id: string;
  exercise_id: string;
  type: string;
  value: number;
  achieved_at: string;
  set_id: string | null;
  created_at: string;
}

export function usePersonalRecords(exerciseId?: string) {
  const sql = exerciseId
    ? `SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY achieved_at DESC`
    : `SELECT * FROM personal_records ORDER BY achieved_at DESC`;
  const params = exerciseId ? [exerciseId] : [];

  return useQuery<PersonalRecordRow>(sql, params);
}
