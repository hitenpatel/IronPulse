import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectPRs } from "../src/lib/pr-detection";

const mockDb = {
  exerciseSet: { findMany: vi.fn() },
  personalRecord: { findFirst: vi.fn(), create: vi.fn() },
} as any;

const achievedAt = new Date("2026-04-16T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.personalRecord.create.mockResolvedValue({});
});

describe("detectPRs", () => {
  it("returns empty array when no completed sets", async () => {
    mockDb.exerciseSet.findMany.mockResolvedValue([]);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    expect(result).toEqual([]);
    expect(mockDb.personalRecord.create).not.toHaveBeenCalled();
  });

  it("detects 1RM PR using epley formula", async () => {
    // 100kg x 5 reps => epley 1RM = 100 * (1 + 5/30) = 116.666...
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-1",
        weightKg: 100,
        reps: 5,
        workoutExercise: { exerciseId: "ex-1" },
      },
    ]);
    mockDb.personalRecord.findFirst.mockResolvedValue(null);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    const rm = result.find((pr) => pr.type === "1rm");
    expect(rm).toBeDefined();
    expect(rm!.exerciseId).toBe("ex-1");
    expect(rm!.value).toBeCloseTo(116.667, 1);
    expect(rm!.setId).toBe("set-1");

    expect(mockDb.personalRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        exerciseId: "ex-1",
        type: "1rm",
        value: expect.closeTo(116.667, 1),
        achievedAt,
        setId: "set-1",
      }),
    });
  });

  it("detects volume PR (weight x reps)", async () => {
    // 80kg x 10 reps = 800 volume
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-2",
        weightKg: 80,
        reps: 10,
        workoutExercise: { exerciseId: "ex-2" },
      },
    ]);
    mockDb.personalRecord.findFirst.mockResolvedValue(null);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    const vol = result.find((pr) => pr.type === "volume");
    expect(vol).toBeDefined();
    expect(vol!.exerciseId).toBe("ex-2");
    expect(vol!.value).toBe(800);
    expect(vol!.setId).toBe("set-2");
  });

  it("does NOT create PR when existing record is higher", async () => {
    // Current set: 60kg x 5 reps => 1RM = 70, volume = 300
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-3",
        weightKg: 60,
        reps: 5,
        workoutExercise: { exerciseId: "ex-3" },
      },
    ]);
    // Existing records are higher
    mockDb.personalRecord.findFirst.mockImplementation(
      ({ where }: { where: { type: string } }) => {
        if (where.type === "1rm") return { value: 200 };
        if (where.type === "volume") return { value: 1000 };
        return null;
      },
    );

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    expect(result).toEqual([]);
    expect(mockDb.personalRecord.create).not.toHaveBeenCalled();
  });

  it("skips 1RM calculation for reps > 10 but still creates volume PR", async () => {
    // 50kg x 15 reps => reps > 10 so no 1RM, but volume = 750
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-4",
        weightKg: 50,
        reps: 15,
        workoutExercise: { exerciseId: "ex-4" },
      },
    ]);
    mockDb.personalRecord.findFirst.mockResolvedValue(null);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    // Only volume PR, no 1RM
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("volume");
    expect(result[0].value).toBe(750);

    // personalRecord.create called only once (for volume)
    expect(mockDb.personalRecord.create).toHaveBeenCalledTimes(1);
    expect(mockDb.personalRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "volume" }),
    });
  });

  it("handles multiple exercises in one workout", async () => {
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-a1",
        weightKg: 100,
        reps: 3,
        workoutExercise: { exerciseId: "bench" },
      },
      {
        id: "set-a2",
        weightKg: 90,
        reps: 8,
        workoutExercise: { exerciseId: "bench" },
      },
      {
        id: "set-b1",
        weightKg: 60,
        reps: 5,
        workoutExercise: { exerciseId: "squat" },
      },
    ]);
    mockDb.personalRecord.findFirst.mockResolvedValue(null);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    // bench: best 1RM from set-a1 (100*(1+3/30)=110) vs set-a2 (90*(1+8/30)=114) => set-a2 wins
    // bench: best volume from set-a1 (300) vs set-a2 (720) => set-a2 wins
    // squat: 1RM = 60*(1+5/30) = 70, volume = 300
    const benchPRs = result.filter((pr) => pr.exerciseId === "bench");
    const squatPRs = result.filter((pr) => pr.exerciseId === "squat");

    expect(benchPRs).toHaveLength(2); // 1rm + volume
    expect(squatPRs).toHaveLength(2); // 1rm + volume

    const bench1rm = benchPRs.find((pr) => pr.type === "1rm")!;
    expect(bench1rm.value).toBeCloseTo(114, 0);
    expect(bench1rm.setId).toBe("set-a2");

    const benchVol = benchPRs.find((pr) => pr.type === "volume")!;
    expect(benchVol.value).toBe(720);
    expect(benchVol.setId).toBe("set-a2");

    const squat1rm = squatPRs.find((pr) => pr.type === "1rm")!;
    expect(squat1rm.value).toBe(70);
    expect(squat1rm.setId).toBe("set-b1");
  });

  it("excludes warmup / dropset / failure sets from PR detection", async () => {
    mockDb.exerciseSet.findMany.mockResolvedValue([]);

    await detectPRs(mockDb, "u1", "w1", achievedAt);

    const where = mockDb.exerciseSet.findMany.mock.calls[0]![0].where;
    expect(where.type).toEqual({ notIn: ["warmup", "dropset", "failure"] });
    expect(where.completed).toBe(true);
  });

  it("uses raw weight as 1RM when reps is 1", async () => {
    mockDb.exerciseSet.findMany.mockResolvedValue([
      {
        id: "set-5",
        weightKg: 140,
        reps: 1,
        workoutExercise: { exerciseId: "deadlift" },
      },
    ]);
    mockDb.personalRecord.findFirst.mockResolvedValue(null);

    const result = await detectPRs(mockDb, "u1", "w1", achievedAt);

    const rm = result.find((pr) => pr.type === "1rm");
    expect(rm).toBeDefined();
    expect(rm!.value).toBe(140);
  });
});
