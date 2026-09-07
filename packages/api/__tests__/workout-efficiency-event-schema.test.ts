import { describe, it, expect } from "vitest";
import { workoutEfficiencyEventSchema } from "../src/routers/telemetry";

const VALID_FIRST_SET = {
  sessionId: "3f6c9b0a-2f4d-4a1a-9e2b-1a2b3c4d5e6f",
  isFirstCompletedSet: true,
  interactionCount: 4,
  msSinceSessionStart: 12_345,
  isNewAthlete: true,
};

const VALID_LATER_SET = {
  sessionId: "3f6c9b0a-2f4d-4a1a-9e2b-1a2b3c4d5e6f",
  isFirstCompletedSet: false,
  interactionCount: 2,
  msSinceSessionStart: null,
  isNewAthlete: null,
};

describe("workoutEfficiencyEventSchema — accepts valid events", () => {
  it("accepts a first-completed-set event", () => {
    const result = workoutEfficiencyEventSchema.safeParse(VALID_FIRST_SET);
    expect(result.success).toBe(true);
  });

  it("accepts a later completed-set event with nulled timing/cohort fields", () => {
    const result = workoutEfficiencyEventSchema.safeParse(VALID_LATER_SET);
    expect(result.success).toBe(true);
  });

  it("accepts isNewAthlete: false (returning athlete)", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_LATER_SET,
      isNewAthlete: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("workoutEfficiencyEventSchema — structurally rejects health data", () => {
  it("rejects any payload with an extra/unexpected key", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      extraField: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled weight field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      weightKg: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled reps field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      reps: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled RPE field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      rpe: 8.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled exercise identity field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      exerciseName: "Bench Press",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled exerciseId field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      exerciseId: "3f6c9b0a-2f4d-4a1a-9e2b-1a2b3c4d5e6f",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a smuggled notes field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      notes: "felt strong today",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a free-form context/metadata bag masquerading as a scalar field", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      context: { anything: "goes" },
    });
    expect(result.success).toBe(false);
  });
});

describe("workoutEfficiencyEventSchema — field-level validation", () => {
  it("rejects a non-uuid sessionId", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      sessionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative interactionCount", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      interactionCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer interactionCount", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      interactionCount: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a msSinceSessionStart beyond the 24h clamp", () => {
    const result = workoutEfficiencyEventSchema.safeParse({
      ...VALID_FIRST_SET,
      msSinceSessionStart: 25 * 60 * 60 * 1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field (omitting isNewAthlete entirely)", () => {
    const { isNewAthlete: _drop, ...rest } = VALID_FIRST_SET;
    const result = workoutEfficiencyEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
