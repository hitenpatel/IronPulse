import { useQuery } from "@powersync/react";

export interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  order: number;
  notes: string | null;
  exercise_name: string;
}

export interface TemplateSetRow {
  id: string;
  template_exercise_id: string;
  set_number: number;
  target_reps: number | null;
  target_weight_kg: number | null;
  type: string;
}

export function useTemplateExercises(templateId: string | undefined) {
  return useQuery<TemplateExerciseRow>(
    `SELECT te.*, e.name as exercise_name
     FROM template_exercises te
     LEFT JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te."order"`,
    [templateId ?? ""]
  );
}

export function useTemplateSets(templateId: string | undefined) {
  return useQuery<TemplateSetRow>(
    `SELECT ts.* FROM template_sets ts
     INNER JOIN template_exercises te ON ts.template_exercise_id = te.id
     WHERE te.template_id = ?
     ORDER BY te."order", ts.set_number`,
    [templateId ?? ""]
  );
}
