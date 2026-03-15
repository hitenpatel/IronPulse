import { describe, it, expect } from "vitest";
import { AppSchema } from "../schema";

describe("PowerSync schema", () => {
  it("defines all 11 synced tables", () => {
    const tableNames = Object.keys(AppSchema.props);
    expect(tableNames).toHaveLength(11);
    expect(tableNames).toEqual(
      expect.arrayContaining([
        "workouts",
        "workout_exercises",
        "exercise_sets",
        "cardio_sessions",
        "laps",
        "workout_templates",
        "template_exercises",
        "template_sets",
        "body_metrics",
        "personal_records",
        "exercises",
      ])
    );
  });

  it("workouts table has correct columns", () => {
    const cols = Object.keys(AppSchema.props.workouts.columnMap);
    expect(cols).toEqual(
      expect.arrayContaining([
        "user_id",
        "name",
        "started_at",
        "completed_at",
        "duration_seconds",
        "notes",
        "template_id",
        "created_at",
      ])
    );
  });

  it("exercise_sets table has correct columns", () => {
    const cols = Object.keys(AppSchema.props.exercise_sets.columnMap);
    expect(cols).toEqual(
      expect.arrayContaining([
        "workout_exercise_id",
        "set_number",
        "type",
        "weight_kg",
        "reps",
        "rpe",
        "rest_seconds",
        "completed",
      ])
    );
  });

  it("exercises table includes array columns for images and videos", () => {
    const cols = Object.keys(AppSchema.props.exercises.columnMap);
    expect(cols).toEqual(
      expect.arrayContaining([
        "name",
        "primary_muscles",
        "secondary_muscles",
        "image_urls",
        "video_urls",
        "is_custom",
        "created_by_id",
      ])
    );
  });
});
