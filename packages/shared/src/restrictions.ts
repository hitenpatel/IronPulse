export interface RestrictionLike {
  muscleGroups: string[];
  note?: string | null;
}

export interface ExerciseMuscles {
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

/**
 * Pure matcher shared by the web and mobile exercise pickers.
 *
 * Muscle vocabulary is free text on `Exercise` (primaryMuscles/secondaryMuscles)
 * and on `ExerciseRestriction.muscleGroups`, so nothing at the schema level
 * guarantees the same spelling on both sides. Trimming and lower-casing here
 * is the last line of defense — the restriction editor is also constrained to
 * offer only muscle strings that already exist on `Exercise` rows (see
 * `exercise.muscleVocabulary`), so in practice the two should already agree.
 */
export function isExerciseRestricted(
  exercise: ExerciseMuscles,
  restrictions: RestrictionLike[]
): { restricted: boolean; reasons: string[] } {
  const muscles = new Set(
    [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map((m) =>
      m.trim().toLowerCase()
    )
  );
  const matched = restrictions.filter((r) =>
    r.muscleGroups.some((g) => muscles.has(g.trim().toLowerCase()))
  );
  return {
    restricted: matched.length > 0,
    reasons: matched.map((r) => r.note).filter((n): n is string => Boolean(n)),
  };
}
