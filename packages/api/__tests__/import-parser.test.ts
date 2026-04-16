import { describe, it, expect } from "vitest";
import {
  detectFormat,
  parseStrongCSV,
  parseHevyCSV,
  parseFitNotesCSV,
} from "../src/lib/import-parser";

describe("detectFormat", () => {
  it('returns "strong" for Strong header', () => {
    const header =
      "Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE";
    expect(detectFormat(header)).toBe("strong");
  });

  it('returns "hevy" for Hevy header', () => {
    const header =
      "title,start_time,end_time,exercise_title,superset_id,set_index,set_type,weight_kg,reps,distance_km,duration_s,rpe";
    expect(detectFormat(header)).toBe("hevy");
  });

  it('returns "fitnotes" for FitNotes header', () => {
    const header =
      "Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time";
    expect(detectFormat(header)).toBe("fitnotes");
  });

  it('returns "unknown" for random text', () => {
    expect(detectFormat("foo,bar,baz")).toBe("unknown");
  });
});

describe("parseStrongCSV", () => {
  const strongHeader =
    "Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE";

  it("parses a 2-row CSV into 1 ImportedSet with correct fields", () => {
    const csv = `${strongHeader}\n2024-01-15 08:00:00,Morning,Bench Press,1,80,8,,,,,7`;
    const sets = parseStrongCSV(csv);

    expect(sets).toHaveLength(1);
    expect(sets[0]!.exerciseName).toBe("Bench Press");
    expect(sets[0]!.workoutName).toBe("Morning");
    expect(sets[0]!.setNumber).toBe(1);
    expect(sets[0]!.weightKg).toBe(80);
    expect(sets[0]!.reps).toBe(8);
    expect(sets[0]!.rpe).toBe(7);
    expect(sets[0]!.date).toEqual(new Date("2024-01-15 08:00:00"));
  });

  it("returns [] for empty CSV (header only)", () => {
    expect(parseStrongCSV(strongHeader)).toEqual([]);
  });

  it("handles quoted fields with commas", () => {
    const csv = `${strongHeader}\n2024-01-15 08:00:00,"Upper, Lower",Bench Press,1,80,8,,,,,`;
    const sets = parseStrongCSV(csv);

    expect(sets).toHaveLength(1);
    expect(sets[0]!.workoutName).toBe("Upper, Lower");
  });
});

describe("parseHevyCSV", () => {
  it("parses a 2-row CSV into 1 ImportedSet", () => {
    const csv =
      "title,start_time,end_time,exercise_title,superset_id,set_index,set_type,weight_kg,reps,distance_km,duration_s,rpe\nLeg Day,2024-01-15T08:00:00,,Squat,,1,normal,100,5,,,8";
    const sets = parseHevyCSV(csv);

    expect(sets).toHaveLength(1);
    expect(sets[0]!.exerciseName).toBe("Squat");
    expect(sets[0]!.workoutName).toBe("Leg Day");
    expect(sets[0]!.setNumber).toBe(1);
    expect(sets[0]!.weightKg).toBe(100);
    expect(sets[0]!.reps).toBe(5);
    expect(sets[0]!.rpe).toBe(8);
  });
});

describe("parseFitNotesCSV", () => {
  it("auto-numbers sets per date+exercise", () => {
    const csv = [
      "Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time",
      "2024-01-15,Deadlift,Back,120,5,,,",
      "2024-01-15,Deadlift,Back,130,3,,,",
      "2024-01-15,Squat,Legs,100,8,,,",
    ].join("\n");

    const sets = parseFitNotesCSV(csv);

    expect(sets).toHaveLength(3);
    // First Deadlift set on that date
    expect(sets[0]!.exerciseName).toBe("Deadlift");
    expect(sets[0]!.setNumber).toBe(1);
    expect(sets[0]!.weightKg).toBe(120);
    expect(sets[0]!.reps).toBe(5);
    expect(sets[0]!.rpe).toBeNull();
    // Second Deadlift set on same date
    expect(sets[1]!.setNumber).toBe(2);
    // Squat is a different exercise — numbering restarts
    expect(sets[2]!.exerciseName).toBe("Squat");
    expect(sets[2]!.setNumber).toBe(1);
  });
});
