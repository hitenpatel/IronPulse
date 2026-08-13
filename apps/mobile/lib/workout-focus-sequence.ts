/**
 * Pure focus-sequence domain — no React, no storage, no SQL.
 *
 * buildFocusSequence: total deterministic order over exercises + sets.
 * deriveNextFocus:    walk the sequence to find the next incomplete set.
 */

export interface FocusSequenceEntry {
  setId: string;
  workoutExerciseId: string;
  supersetGroup: number | null;
  round: number | null;
  endsRound: boolean;
}

export interface ExerciseInput {
  id: string;
  order: number;
  superset_group: number | null;
}

export interface SetInput {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  type?: string | null;
}

/**
 * Build a deterministic focus sequence.
 *
 * Ordering rules:
 * 1. Warmup sets for an exercise come before all non-warmup sets.
 * 2. Exercises are ordered by (exercise.order ASC, exercise.id ASC).
 * 3. Superset members are grouped at the position of the earliest member by
 *    (order, id). Within a group exercises are sorted (order ASC, id ASC).
 * 4. Non-warmup sets are interleaved round-robin within a superset group:
 *    round 1 of ex-A, round 1 of ex-B, round 2 of ex-A, round 2 of ex-B …
 * 5. Duplicate (order, id) values are broken by set_number then set.id.
 * 6. endsRound is true for the last set in each "block" before rest begins:
 *    single exercise → every set ends a round;
 *    superset → last member of each round ends the round.
 */
export function buildFocusSequence(
  exercises: ExerciseInput[],
  sets: SetInput[],
): FocusSequenceEntry[] {
  if (exercises.length === 0) return [];

  // --- Sort exercises by (order, id) ---
  const sortedExercises = [...exercises].sort((a, b) =>
    a.order !== b.order ? a.order - b.order : a.id < b.id ? -1 : 1,
  );

  // --- Group sets by workout_exercise_id ---
  const setsByEx = new Map<string, SetInput[]>();
  for (const ex of sortedExercises) setsByEx.set(ex.id, []);
  for (const s of sets) {
    const list = setsByEx.get(s.workout_exercise_id);
    if (list) list.push(s);
  }
  // Sort each exercise's sets: warmups first, then by (set_number, id)
  for (const [, list] of setsByEx) {
    list.sort((a, b) => {
      const aWarm = a.type === "warmup" ? 0 : 1;
      const bWarm = b.type === "warmup" ? 0 : 1;
      if (aWarm !== bWarm) return aWarm - bWarm;
      if (a.set_number !== b.set_number) return a.set_number - b.set_number;
      return a.id < b.id ? -1 : 1;
    });
  }

  // --- Identify superset groups and their anchor position ---
  // Anchor = earliest (order, id) among all members of the group
  const groupAnchor = new Map<number, { order: number; id: string }>();
  for (const ex of sortedExercises) {
    if (ex.superset_group == null) continue;
    const cur = groupAnchor.get(ex.superset_group);
    if (!cur || ex.order < cur.order || (ex.order === cur.order && ex.id < cur.id)) {
      groupAnchor.set(ex.superset_group, { order: ex.order, id: ex.id });
    }
  }

  // --- Build positional entries ---
  // Each "slot" is either a single exercise or a superset group.
  interface Slot {
    anchorOrder: number;
    anchorId: string;
    supersetGroup: number | null;
    exerciseIds: string[]; // sorted within group
  }

  const slots: Slot[] = [];
  const seenGroups = new Set<number>();

  for (const ex of sortedExercises) {
    if (ex.superset_group != null) {
      if (seenGroups.has(ex.superset_group)) continue;
      seenGroups.add(ex.superset_group);
      const anchor = groupAnchor.get(ex.superset_group)!;
      // Collect all members in (order, id) order
      const members = sortedExercises
        .filter((e) => e.superset_group === ex.superset_group)
        .sort((a, b) =>
          a.order !== b.order ? a.order - b.order : a.id < b.id ? -1 : 1,
        );
      slots.push({
        anchorOrder: anchor.order,
        anchorId: anchor.id,
        supersetGroup: ex.superset_group,
        exerciseIds: members.map((m) => m.id),
      });
    } else {
      slots.push({
        anchorOrder: ex.order,
        anchorId: ex.id,
        supersetGroup: null,
        exerciseIds: [ex.id],
      });
    }
  }

  // Re-sort slots by anchor (already in order since sortedExercises is sorted,
  // but a superset anchor may predate the single-exercise entries before it)
  slots.sort((a, b) =>
    a.anchorOrder !== b.anchorOrder
      ? a.anchorOrder - b.anchorOrder
      : a.anchorId < b.anchorId ? -1 : 1,
  );

  // --- Emit sequence ---
  const result: FocusSequenceEntry[] = [];

  for (const slot of slots) {
    if (slot.supersetGroup == null) {
      // Single exercise
      const exId = slot.exerciseIds[0];
      const exSets = setsByEx.get(exId) ?? [];
      const warmups = exSets.filter((s) => s.type === "warmup");
      const working = exSets.filter((s) => s.type !== "warmup");

      // Warmups: each ends its own mini-round (no rest)
      for (const s of warmups) {
        result.push({
          setId: s.id,
          workoutExerciseId: exId,
          supersetGroup: null,
          round: null,
          endsRound: false,
        });
      }
      // Working sets
      for (let i = 0; i < working.length; i++) {
        result.push({
          setId: working[i].id,
          workoutExerciseId: exId,
          supersetGroup: null,
          round: i + 1,
          endsRound: true, // every set ends a round for single exercises
        });
      }
    } else {
      // Superset: interleave round-robin
      const memberSets = slot.exerciseIds.map((exId) => {
        const all = setsByEx.get(exId) ?? [];
        return {
          exId,
          warmups: all.filter((s) => s.type === "warmup"),
          working: all.filter((s) => s.type !== "warmup"),
        };
      });

      // Warmups for each member in order
      for (const m of memberSets) {
        for (const s of m.warmups) {
          result.push({
            setId: s.id,
            workoutExerciseId: m.exId,
            supersetGroup: slot.supersetGroup,
            round: null,
            endsRound: false,
          });
        }
      }

      // Working sets: round-robin across members
      const maxRounds = Math.max(...memberSets.map((m) => m.working.length), 0);
      for (let round = 0; round < maxRounds; round++) {
        const available = memberSets.filter((m) => m.working[round] != null);
        for (let mi = 0; mi < available.length; mi++) {
          const m = available[mi];
          const isLastInRound = mi === available.length - 1;
          result.push({
            setId: m.working[round].id,
            workoutExerciseId: m.exId,
            supersetGroup: slot.supersetGroup,
            round: round + 1,
            endsRound: isLastInRound,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Walk the sequence to find the next set to focus on.
 *
 * Rules:
 * 1. If persistedFocusId is in the sequence and not completed → return it.
 * 2. If progressionAnchorId is set → scan forward from it for the first
 *    incomplete set.
 * 3. Otherwise return the first incomplete set in sequence order.
 * 4. If all sets are complete → return null.
 */
export function deriveNextFocus(
  sequence: FocusSequenceEntry[],
  completedSetIds: ReadonlySet<string>,
  persistedFocusId?: string | null,
  progressionAnchorId?: string | null,
): string | null {
  if (sequence.length === 0) return null;

  // Honour persisted focus if still incomplete
  if (persistedFocusId) {
    const entry = sequence.find((e) => e.setId === persistedFocusId);
    if (entry && !completedSetIds.has(persistedFocusId)) {
      return persistedFocusId;
    }
  }

  // Scan forward from anchor
  if (progressionAnchorId) {
    const anchorIdx = sequence.findIndex((e) => e.setId === progressionAnchorId);
    if (anchorIdx >= 0) {
      for (let i = anchorIdx + 1; i < sequence.length; i++) {
        if (!completedSetIds.has(sequence[i].setId)) return sequence[i].setId;
      }
      // Wrap around to first incomplete
      for (let i = 0; i <= anchorIdx; i++) {
        if (!completedSetIds.has(sequence[i].setId)) return sequence[i].setId;
      }
      return null;
    }
  }

  // Default: first incomplete
  for (const entry of sequence) {
    if (!completedSetIds.has(entry.setId)) return entry.setId;
  }
  return null;
}
