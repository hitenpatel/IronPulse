-- Create publication for PowerSync logical replication
-- Requires wal_level=logical in postgresql.conf
CREATE PUBLICATION IF NOT EXISTS powersync FOR TABLE
  workouts, workout_exercises, exercise_sets,
  cardio_sessions, laps,
  workout_templates, template_exercises, template_sets,
  body_metrics, personal_records, exercises;
