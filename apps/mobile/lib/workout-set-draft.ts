/**
 * Pure draft state for a single set being edited.
 *
 * Draft values are controlled strings. They never persist until the user
 * explicitly completes the set or accepts via Complete. Suggestions from
 * previous performance are visual-only until touched.
 */

export interface SetDraftField {
  value: string;
  touched: boolean;
}

export interface SetDraft {
  weight: SetDraftField;
  reps: SetDraftField;
  rpe: SetDraftField;
}

export type DraftKey = "weight" | "reps" | "rpe";

/**
 * Create an initial draft from a suggestion (previous performance or template).
 * All fields start untouched.
 */
export function createDraft(opts: {
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
}): SetDraft {
  return {
    weight: { value: opts.weightKg != null ? String(opts.weightKg) : "", touched: false },
    reps: { value: opts.reps != null ? String(opts.reps) : "", touched: false },
    rpe: { value: opts.rpe != null ? String(opts.rpe) : "", touched: false },
  };
}

/**
 * Return an empty draft (no suggestions).
 */
export function emptyDraft(): SetDraft {
  return {
    weight: { value: "", touched: false },
    reps: { value: "", touched: false },
    rpe: { value: "", touched: false },
  };
}

/**
 * Update a single field, marking it touched.
 */
export function touchField(draft: SetDraft, key: DraftKey, value: string): SetDraft {
  return { ...draft, [key]: { value, touched: true } };
}

/**
 * Accept a suggestion: change display state to the suggested value but
 * leave touched = false. No persistence patch should be emitted on accept alone.
 */
export function acceptSuggestion(
  draft: SetDraft,
  key: DraftKey,
  value: string,
): SetDraft {
  return { ...draft, [key]: { value, touched: false } };
}

export interface ParsedSetDraft {
  weightKg: number | null;
  reps: number;
  rpe: number | null;
}

/**
 * Parse and validate a draft for persistence.
 * Returns null if reps is not a positive integer.
 * Only includes fields that were touched (or have valid DB-backed values).
 * Untouched suggestions are never persisted.
 */
export function parseDraftForCommit(
  draft: SetDraft,
  existingDb?: { weightKg: number | null; reps: number | null; rpe: number | null },
): ParsedSetDraft | null {
  // Reps: prefer touched value, else DB value
  const repsStr = draft.reps.touched ? draft.reps.value : (existingDb?.reps != null ? String(existingDb.reps) : "");
  const repsNum = parseInt(repsStr, 10);
  if (!Number.isInteger(repsNum) || repsNum <= 0) return null;

  // Weight: prefer touched value, else DB value (null acceptable)
  let weightKg: number | null = existingDb?.weightKg ?? null;
  if (draft.weight.touched) {
    const w = parseFloat(draft.weight.value);
    weightKg = isNaN(w) ? null : w;
  }

  // RPE: prefer touched value, else DB value (null acceptable)
  let rpe: number | null = existingDb?.rpe ?? null;
  if (draft.rpe.touched) {
    const r = parseFloat(draft.rpe.value);
    rpe = isNaN(r) ? null : Math.max(1, Math.min(10, r));
  }

  return { weightKg, reps: repsNum, rpe };
}

/**
 * Returns true if any field in the draft has been touched.
 */
export function isDraftTouched(draft: SetDraft): boolean {
  return draft.weight.touched || draft.reps.touched || draft.rpe.touched;
}

/**
 * Compute a suggestion for a set, based on same-type, same-position
 * preference over previous performance, with fallback by type, then DB/template.
 */
export function computeSuggestion(opts: {
  setNumber: number;
  setType?: string | null;
  previousSets: Array<{
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe?: number | null;
    type?: string | null;
  }>;
  dbWeightKg?: number | null;
  dbReps?: number | null;
  dbRpe?: number | null;
}): { weightKg: number | null; reps: number | null; rpe: number | null } {
  const { setNumber, setType, previousSets, dbWeightKg, dbReps, dbRpe } = opts;

  // DB/template values take precedence if already set
  if (dbWeightKg != null || dbReps != null) {
    return { weightKg: dbWeightKg ?? null, reps: dbReps ?? null, rpe: dbRpe ?? null };
  }

  // Same-type, same-position preference
  const sameTypePos = previousSets.find(
    (s) => s.set_number === setNumber && (setType == null || s.type === setType),
  );
  if (sameTypePos) {
    return { weightKg: sameTypePos.weight_kg, reps: sameTypePos.reps, rpe: sameTypePos.rpe ?? null };
  }

  // Fallback: same position regardless of type
  const samePos = previousSets.find((s) => s.set_number === setNumber);
  if (samePos) {
    return { weightKg: samePos.weight_kg, reps: samePos.reps, rpe: samePos.rpe ?? null };
  }

  // Fallback: any previous set of same type
  const sameType = previousSets.find((s) => setType != null && s.type === setType);
  if (sameType) {
    return { weightKg: sameType.weight_kg, reps: sameType.reps, rpe: sameType.rpe ?? null };
  }

  return { weightKg: null, reps: null, rpe: null };
}
