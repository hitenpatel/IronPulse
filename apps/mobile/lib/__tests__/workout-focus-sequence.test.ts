import { describe, it, expect } from "vitest";
import {
  buildFocusSequence,
  deriveNextFocus,
  type ExerciseInput,
  type SetInput,
} from "../workout-focus-sequence";

function ex(id: string, order: number, superset_group: number | null = null): ExerciseInput {
  return { id, order, superset_group };
}

function s(id: string, weid: string, set_number: number, type?: string): SetInput {
  return { id, workout_exercise_id: weid, set_number, type };
}

describe("buildFocusSequence", () => {
  it("returns empty array for no exercises", () => {
    expect(buildFocusSequence([], [])).toEqual([]);
  });

  it("normal single exercise — sets ordered by set_number", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [s("s2", "e1", 2), s("s1", "e1", 1)],
    );
    expect(seq.map((e) => e.setId)).toEqual(["s1", "s2"]);
    expect(seq.every((e) => e.endsRound)).toBe(true);
  });

  it("duplicate exercise orders resolved by exercise ID", () => {
    const seq = buildFocusSequence(
      [ex("e2", 1), ex("e1", 1)],
      [s("s1", "e1", 1), s("s2", "e2", 1)],
    );
    // e1 < e2 lexicographically → e1 first
    expect(seq[0].workoutExerciseId).toBe("e1");
    expect(seq[1].workoutExerciseId).toBe("e2");
  });

  it("duplicate set numbers resolved by set ID", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [s("sb", "e1", 1), s("sa", "e1", 1)],
    );
    expect(seq[0].setId).toBe("sa");
    expect(seq[1].setId).toBe("sb");
  });

  it("warmup sets appear before working sets", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [s("s1", "e1", 1), s("w1", "e1", 0, "warmup")],
    );
    expect(seq[0].setId === "w1").toBe(true);
    // Verify warmup is first
    expect(seq.findIndex((e) => e.setId === "w1")).toBeLessThan(
      seq.findIndex((e) => e.setId === "s1"),
    );
  });

  it("warmup sets have endsRound = false", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [s("w1", "e1", 1, "warmup"), s("s1", "e1", 2)],
    );
    const warmup = seq.find((e) => e.setId === "w1")!;
    expect(warmup.endsRound).toBe(false);
  });

  it("two-member superset interleaves round-robin", () => {
    const seq = buildFocusSequence(
      [ex("ea", 1, 1), ex("eb", 2, 1)],
      [s("a1", "ea", 1), s("a2", "ea", 2), s("b1", "eb", 1), s("b2", "eb", 2)],
    );
    // Expected: a1, b1, a2, b2
    expect(seq.map((e) => e.setId)).toEqual(["a1", "b1", "a2", "b2"]);
  });

  it("superset end-of-round only marks last member of each round", () => {
    const seq = buildFocusSequence(
      [ex("ea", 1, 1), ex("eb", 2, 1)],
      [s("a1", "ea", 1), s("b1", "eb", 1), s("a2", "ea", 2), s("b2", "eb", 2)],
    );
    // a1 not end, b1 IS end; a2 not end, b2 IS end
    const byId = Object.fromEntries(seq.map((e) => [e.setId, e]));
    expect(byId["a1"].endsRound).toBe(false);
    expect(byId["b1"].endsRound).toBe(true);
    expect(byId["a2"].endsRound).toBe(false);
    expect(byId["b2"].endsRound).toBe(true);
  });

  it("three-member superset correct round order", () => {
    const seq = buildFocusSequence(
      [ex("ea", 1, 5), ex("eb", 2, 5), ex("ec", 3, 5)],
      [s("a1", "ea", 1), s("b1", "eb", 1), s("c1", "ec", 1)],
    );
    expect(seq.map((e) => e.setId)).toEqual(["a1", "b1", "c1"]);
    expect(seq[2].endsRound).toBe(true);
    expect(seq[0].endsRound).toBe(false);
  });

  it("uneven superset rounds handle missing members gracefully", () => {
    // ea has 2 sets, eb has 1 set → round 2 has only ea
    const seq = buildFocusSequence(
      [ex("ea", 1, 1), ex("eb", 2, 1)],
      [s("a1", "ea", 1), s("a2", "ea", 2), s("b1", "eb", 1)],
    );
    expect(seq.map((e) => e.setId)).toEqual(["a1", "b1", "a2"]);
    // a2 is alone in round 2 → it ends the round
    const a2 = seq.find((e) => e.setId === "a2")!;
    expect(a2.endsRound).toBe(true);
  });

  it("noncontiguous legacy superset group placed at anchor position", () => {
    // e1 (order=1, no group), e2 (order=2, group=3), e3 (order=3, no group), e4 (order=4, group=3)
    // Anchor of group 3 = e2 at order=2. So slot order: e1, superset[e2,e4], e3
    const seq = buildFocusSequence(
      [ex("e1", 1), ex("e2", 2, 3), ex("e3", 3), ex("e4", 4, 3)],
      [s("s1", "e1", 1), s("s2", "e2", 1), s("s3", "e3", 1), s("s4", "e4", 1)],
    );
    const order = seq.map((e) => e.workoutExerciseId);
    const e1idx = order.indexOf("e1");
    const e2idx = order.indexOf("e2");
    const e3idx = order.indexOf("e3");
    const e4idx = order.indexOf("e4");
    // e1 comes first, then superset (e2 and e4 together before e3)
    expect(e1idx).toBeLessThan(e2idx);
    expect(e2idx).toBeLessThan(e3idx);
    expect(e4idx).toBeLessThan(e3idx);
  });

  it("mixed working/drop/failure sets sorted by (set_number, id)", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [
        s("sd", "e1", 2, "drop"),
        s("sf", "e1", 3, "failure"),
        s("sw", "e1", 1, "working"),
      ],
    );
    expect(seq.map((e) => e.setId)).toEqual(["sw", "sd", "sf"]);
  });
});

describe("deriveNextFocus", () => {
  it("returns null for empty sequence", () => {
    expect(deriveNextFocus([], new Set())).toBeNull();
  });

  it("returns first incomplete set", () => {
    const seq = buildFocusSequence([ex("e1", 1)], [s("s1", "e1", 1), s("s2", "e1", 2)]);
    expect(deriveNextFocus(seq, new Set())).toBe("s1");
  });

  it("honours persisted focus when still incomplete", () => {
    const seq = buildFocusSequence([ex("e1", 1)], [s("s1", "e1", 1), s("s2", "e1", 2)]);
    expect(deriveNextFocus(seq, new Set(), "s2")).toBe("s2");
  });

  it("ignores persisted focus if already completed", () => {
    const seq = buildFocusSequence([ex("e1", 1)], [s("s1", "e1", 1), s("s2", "e1", 2)]);
    expect(deriveNextFocus(seq, new Set(["s2"]), "s2")).toBe("s1");
  });

  it("scans forward from progression anchor", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1)],
      [s("s1", "e1", 1), s("s2", "e1", 2), s("s3", "e1", 3)],
    );
    // s1 completed, anchor at s1 → next is s2
    expect(deriveNextFocus(seq, new Set(["s1"]), null, "s1")).toBe("s2");
  });

  it("wraps to first incomplete after reaching end of sequence", () => {
    const seq = buildFocusSequence(
      [ex("e1", 1), ex("e2", 2)],
      [s("s1", "e1", 1), s("s2", "e2", 1)],
    );
    // s2 completed out of order; anchor at s2 → wrap to s1
    expect(deriveNextFocus(seq, new Set(["s2"]), null, "s2")).toBe("s1");
  });

  it("returns null after all sets complete", () => {
    const seq = buildFocusSequence([ex("e1", 1)], [s("s1", "e1", 1), s("s2", "e1", 2)]);
    expect(deriveNextFocus(seq, new Set(["s1", "s2"]))).toBeNull();
  });
});
