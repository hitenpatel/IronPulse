import { useQuery } from "@powersync/react";

export interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  exercise_count?: number;
}

export function useTemplates() {
  return useQuery<TemplateRow>(
    `SELECT wt.*,
       (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = wt.id) as exercise_count
     FROM workout_templates wt
     ORDER BY wt.created_at DESC`
  );
}
