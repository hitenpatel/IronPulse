/**
 * Pure helpers for the multi-select exercise picker.
 *
 * - filterExercises: compose search + muscle + equipment predicates
 * - dedupeSelection: toggle semantics within one picker session (one open/close cycle)
 */

import type { ExerciseRow } from "@zor/sync";

export interface FilterOpts {
  search?: string;
  muscle?: string;
  equipment?: string;
}

/**
 * Normalise a string for case-insensitive, diacritic-tolerant comparison.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Filter an exercise list by search text, muscle group, and equipment.
 * All predicates are ANDed. Empty / undefined values are ignored.
 * Preserves original ordering.
 */
export function filterExercises(
  list: ExerciseRow[],
  opts: FilterOpts,
): ExerciseRow[] {
  const search = opts.search ? normalise(opts.search.trim()) : "";
  const muscle = opts.muscle ? normalise(opts.muscle.trim()) : "";
  const equipment = opts.equipment ? normalise(opts.equipment.trim()) : "";

  return list.filter((ex) => {
    if (search && !normalise(ex.name).includes(search)) return false;
    if (muscle) {
      const primary = ex.primary_muscles ? normalise(ex.primary_muscles) : "";
      const secondary = ex.secondary_muscles ? normalise(ex.secondary_muscles) : "";
      if (!primary.includes(muscle) && !secondary.includes(muscle)) return false;
    }
    if (equipment) {
      const eq = ex.equipment ? normalise(ex.equipment) : "";
      if (!eq.includes(equipment)) return false;
    }
    return true;
  });
}

/**
 * Toggle an exercise ID within the current selection.
 *
 * Rules (AC #4):
 *   - If the ID is already selected, remove it (deselect).
 *   - If the ID is not selected, add it.
 *   - Each ID appears at most once in the returned array.
 *   - Order of first selection is preserved.
 */
export function dedupeSelection(current: string[], tappedId: string): string[] {
  const idx = current.indexOf(tappedId);
  if (idx !== -1) {
    // Remove
    return [...current.slice(0, idx), ...current.slice(idx + 1)];
  }
  // Add (deduplicated: don't add if somehow already present via Set comparison)
  return [...current, tappedId];
}

/**
 * Count active filters (for filter badge count).
 */
export function activeFilterCount(opts: FilterOpts): number {
  let count = 0;
  if (opts.muscle) count++;
  if (opts.equipment) count++;
  return count;
}
